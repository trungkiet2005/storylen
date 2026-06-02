import re
from google import genai
from google.genai import types

import asyncio
import time
from typing import List
from .common import MissingAPIKeyException, InvalidServerResponse
from .keys import GEMINI_API_KEYS, GEMINI_MODEL, GEMINI_MAX_REQUESTS_PER_MINUTE
from .common_gpt import CommonGPTTranslator, _CommonGPTTranslator_JSON


# Text Formatting:
# For Windows: enable ANSI escape code support
from colorama import init as initColorama

BOLD='\033[1m' # Bold text
NRML='\033[0m' # Revert to Normal formatting


class _GeminiClientPool:
    _RATE_LIMIT_COOLDOWN_SECONDS = 90
    _SERVER_ERROR_COOLDOWN_SECONDS = 15
    # Quarantine suspended / invalid keys for the rest of the session.
    _KEY_DISABLED_COOLDOWN_SECONDS = 24 * 60 * 60

    def __init__(self, api_keys: List[str], logger):
        self._api_keys = api_keys
        self._logger = logger
        self._clients = [genai.Client(api_key=api_key) for api_key in api_keys]
        self._current_index = 0
        self._cooldowns = [0.0] * len(api_keys)
        self._disabled_reported = [False] * len(api_keys)
        self._lock = asyncio.Lock()

    @property
    def current_client(self):
        return self._clients[self._current_index]

    @property
    def current_key_number(self) -> int:
        return self._current_index + 1

    @staticmethod
    def _mask_key(key: str) -> str:
        if not key:
            return '<empty>'
        if len(key) <= 8:
            return key[:2] + '…'
        return f'{key[:6]}…{key[-4:]}'

    def _error_text(self, error: Exception) -> str:
        parts = [
            str(error),
            str(getattr(error, 'code', '')),
            str(getattr(error, 'status', '')),
            str(getattr(error, 'message', '')),
        ]
        return ' '.join(parts).lower()

    def is_key_exhausted_error(self, error: Exception) -> bool:
        text = self._error_text(error)
        return any(marker in text for marker in (
            '429',
            'quota',
            'rate limit',
            'rate_limit',
            'resource_exhausted',
            'too many requests',
        ))

    def is_retryable_server_error(self, error: Exception) -> bool:
        text = self._error_text(error)
        return any(marker in text for marker in (
            '500',
            '502',
            '503',
            '504',
            'internal',
            'unavailable',
            'deadline',
        ))

    def is_key_disabled_error(self, error: Exception) -> bool:
        """403 PERMISSION_DENIED / CONSUMER_SUSPENDED / API_KEY_INVALID — key is dead, not transient."""
        text = self._error_text(error)
        return any(marker in text for marker in (
            'permission_denied',
            'permission denied',
            'consumer_suspended',
            'api_key_invalid',
            'api key not valid',
            'api_key_expired',
            'api key expired',
            'unauthenticated',
        ))

    def is_recoverable_error(self, error: Exception) -> bool:
        return (
            self.is_key_disabled_error(error)
            or self.is_key_exhausted_error(error)
            or self.is_retryable_server_error(error)
        )

    async def switch_after_error(self, error: Exception) -> bool:
        if len(self._clients) <= 1:
            return False

        if self.is_key_disabled_error(error):
            cooldown = self._KEY_DISABLED_COOLDOWN_SECONDS
            disabled = True
        elif self.is_key_exhausted_error(error):
            cooldown = self._RATE_LIMIT_COOLDOWN_SECONDS
            disabled = False
        elif self.is_retryable_server_error(error):
            cooldown = self._SERVER_ERROR_COOLDOWN_SECONDS
            disabled = False
        else:
            return False

        async with self._lock:
            now = time.monotonic()
            failed_index = self._current_index
            self._cooldowns[failed_index] = max(self._cooldowns[failed_index], now + cooldown)

            if disabled and not self._disabled_reported[failed_index]:
                self._disabled_reported[failed_index] = True
                masked = self._mask_key(self._api_keys[failed_index])
                self._logger.error(
                    f'Gemini API key #{failed_index + 1} ({masked}) is suspended/invalid '
                    f'and has been quarantined for the rest of the session. '
                    f'Remove it from GEMINI_API_KEY / GEMINI_API_KEYS to silence this warning.'
                )

            available_indices = [
                index for index, cooldown_until in enumerate(self._cooldowns)
                if index != failed_index and cooldown_until <= now
            ]

            if not available_indices:
                # Pick whichever key clears soonest. If every key is quarantined for ~24h,
                # there is no point in busy-waiting — give up so the caller fails fast.
                next_index = min(range(len(self._cooldowns)), key=self._cooldowns.__getitem__)
                wait_seconds = max(0.0, self._cooldowns[next_index] - now)
                if wait_seconds > self._RATE_LIMIT_COOLDOWN_SECONDS:
                    self._logger.error(
                        f'All Gemini API keys are quarantined (soonest available in '
                        f'{wait_seconds:.0f}s). Aborting failover.'
                    )
                    return False
                if wait_seconds:
                    self._logger.warning(
                        f'All Gemini API keys are cooling down. Waiting {wait_seconds:.1f}s before retrying.'
                    )
                    await asyncio.sleep(wait_seconds)
                self._current_index = next_index
            else:
                self._current_index = available_indices[0]

            err_summary = self._error_text(error).strip()
            if len(err_summary) > 200:
                err_summary = err_summary[:200] + '…'
            self._logger.warning(
                f'Switching Gemini API key #{failed_index + 1} -> #{self._current_index + 1} '
                f'(cooldown {cooldown:.0f}s) after API error: {err_summary}'
            )
            return True

class GeminiTranslator(CommonGPTTranslator):
    _INVALID_REPEAT_COUNT = 0  # 现在这个参数没意义了
    _MAX_REQUESTS_PER_MINUTE = GEMINI_MAX_REQUESTS_PER_MINUTE  # env GEMINI_MAX_REQUESTS_PER_MINUTE; <=0 disables client-side throttle
    _TIMEOUT = 40  # 在重试之前等待服务器响应的时间（秒）
    _RETRY_ATTEMPTS = 3  # 在放弃之前重试错误请求的次数
    _TIMEOUT_RETRY_ATTEMPTS = 3  # 在放弃之前重试超时请求的次数
    _RATELIMIT_RETRY_ATTEMPTS = 3  # 在放弃之前重试速率限制请求的次数

    # 最大令牌数量，用于控制处理的文本长度
    # Maximum token count for controlling the length of text processed
    _MAX_TOKENS = 8192

    # 将每个 prompt 限制为最大输出 tokens 的 50％。
    # （这是一个任意比率，用于解释语言之间的差异。）
    # 
    # Limit each prompt to 50% max output tokens. 
    # (This is an arbitrary ratio to account for variance between languages.)
    _MAX_TOKENS_IN = _MAX_TOKENS // 2

    # From: https://ai.google.dev/gemini-api/docs/models/gemini#available-languages
    '''
    _LANGUAGE_CODE_MAP= {
                            'ar': 'Arabic',
                            'bn': 'Bengali',
                            'bg': 'Bulgarian',
                            'zh': 'Chinese simplified and traditional',
                            'hr': 'Croatian',
                            'cs': 'Czech',
                            'da': 'Danish',
                            'nl': 'Dutch',
                            'en': 'English',
                            'et': 'Estonian',
                            'fi': 'Finnish',
                            'fr': 'French',
                            'de': 'German',
                            'el': 'Greek',
                            'iw': 'Hebrew',
                            'hi': 'Hindi',
                            'hu': 'Hungarian',
                            'id': 'Indonesian',
                            'it': 'Italian',
                            'ja': 'Japanese',
                            'ko': 'Korean',
                            'lv': 'Latvian',
                            'lt': 'Lithuanian',
                            'no': 'Norwegian',
                            'pl': 'Polish',
                            'pt': 'Portuguese',
                            'ro': 'Romanian',
                            'ru': 'Russian',
                            'sr': 'Serbian',
                            'sk': 'Slovak',
                            'sl': 'Slovenian',
                            'es': 'Spanish',
                            'sw': 'Swahili',
                            'sv': 'Swedish',
                            'th': 'Thai',
                            'tr': 'Turkish',
                            'uk': 'Ukrainian',
                            'vi': 'Vietnamese',
                        }
    '''

    _MIN_CACHE_TOKENS = 4096 # Minimum tokens required to use Context Cache
                            # Source: https://ai.google.dev/gemini-api/docs/caching?lang=python#considerations
    
    _CACHE_TTL = 3600 # Set the Context Cache lifespan (seconds)
    _CACHE_TTL_BUFFER = 300 # Refresh the Context Cache once current time is within this many seconds of expiring

    def __init__(self):
        # ConfigGPT 的初始化
        # ConfigGPT initialization 
        _CONFIG_KEY = 'gemini.' + GEMINI_MODEL
        CommonGPTTranslator.__init__(self, config_key=_CONFIG_KEY)

        # Initialize colorama for ANSI encoding support
        #   (Only required on Windows)
        initColorama()

        # By default: Do not assume Context Cache support
        self._canUseCache = False
        self.cached_content = None
        self.templateCache = None

        # Dict for storing values to print to logger
        self.cachedVals={None}

        if not GEMINI_API_KEYS:
            raise MissingAPIKeyException(
                        'Please set the GEMINI_API_KEY or GEMINI_API_KEYS environment variable '
                        'before using the Gemini translator.'
                    )

        self.client_pool = _GeminiClientPool(GEMINI_API_KEYS, self.logger)
        self.client = self.client_pool.current_client

        try:
            model_list = None
            last_error = None
            for key_index in range(len(GEMINI_API_KEYS)):
                self.client_pool._current_index = key_index
                self.client = self.client_pool.current_client
                try:
                    model_list = list(self.client.models.list())
                    break
                except genai.errors.APIError as genai_err:
                    last_error = genai_err
                    if not self.client_pool.is_recoverable_error(genai_err):
                        raise
                    if self.client_pool.is_key_disabled_error(genai_err):
                        masked = self.client_pool._mask_key(GEMINI_API_KEYS[key_index])
                        self.logger.error(
                            f'Gemini API key #{key_index + 1} ({masked}) is suspended/invalid during startup probe — skipping.'
                        )
                        self.client_pool._cooldowns[key_index] = time.monotonic() + self.client_pool._KEY_DISABLED_COOLDOWN_SECONDS
                        self.client_pool._disabled_reported[key_index] = True
            if model_list is None:
                raise last_error
        except genai.errors.APIError as genai_err:
            raise InvalidServerResponse(
                        'Gemini API key(s) were found, but the API failed to connect.\n.' +
                        f'The following error was caught:\n{genai_err}'
                    )
        except Exception as e:
            self.logger.error(
                        'GEMINI_API_KEY was found, but an unknown error was encountered during initial setup.\n.' +
                        f'The following error was caught:\n{e}'
                    )
            raise e

        '''
        Start Section:
            Validate `GEMINI_MODEL` specification and determine supported capabilities.
        '''
        model_names = [aModel.name.lstrip('models/') for aModel in model_list]
        if  f"{GEMINI_MODEL}" not in model_names:
            self.logger.error(f"Model: '{GEMINI_MODEL}' was not found in the model list.\n" +
                                "Please ensure you set the key: GEMINI_MODEL to one of the following values:"
                            )
            self.logger.error('\n'.join(mName for mName in model_names))

            raise
        
        # Use index of model name to get full model info
        model_info = model_list[model_names.index(GEMINI_MODEL)]
        

        
        def canCache(model_list, model_info) -> bool:
            """
            Checks if the selected model is capable of using context caching.
            Made into a function purely to help with code readability.
            """
            # List of models that support content caching:
            canCacheModels=[m.name.lstrip('models/')
                            for m in model_list
                                if 'createCachedContent' in m.supported_actions
                        ]
            
            # If the model supports Context Caching: Enable
            # Else: Inform the user, list supported models
            if 'createCachedContent' in model_info.supported_actions:
                return True
            else:
                MSG= "ALERT:\n" + \
                    f"Model '{GEMINI_MODEL}' does not support Context Caching.\n" + \
                    "Context Caching allows you reduce token usage by storing " + \
                    "and reusing `System Prompt` and `Chat Samples`, " + \
                    "rather than re-sending it each time.\n\n" + \
                    "If you wish to use this feature, " + \
                    "set the GEMINI_MODEL key to one of the following values:\n\n" + \
                    '\n'.join(canCacheModels) + '\n\n' + \
                    "Note that the model name must be set to the precise version-name listed.\n" + \
                    "\te.g. 'gemini-1.5-flash-001' rather than 'gemini-1.5-flash'\n"
                self.logger.warning(MSG)

        self._canUseCache = canCache(model_list, model_info)

        
        self._MAX_TOKENS = model_info.output_token_limit
        self._MAX_TOKENS_IN = self._MAX_TOKENS // 2


        ''''
            Set all `safety_settings` to 'Block None'

            Taken from official Google example code:
                Books contain all sorts of fictional or historical descriptions, 
                    some of them rather literal and might cause the model to stop 
                    from performing translation query. 
                To prevent some of those exceptions users are able to change 
                    `safety_setting` from default to more open approach.
            
            -- https://github.com/google-gemini/cookbook/blob/main/examples/Translate_a_Public_Domain_Book.ipynb
        '''
        self.safety_settings = [    {
                                        "category": "HARM_CATEGORY_HARASSMENT",
                                        "threshold": "BLOCK_NONE",
                                    }, {
                                        "category": "HARM_CATEGORY_HATE_SPEECH",
                                        "threshold": "BLOCK_NONE",
                                    }, {
                                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                        "threshold": "BLOCK_NONE",
                                    }, {
                                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                                        "threshold": "BLOCK_NONE",
                                    }
                                ]
        self.token_count = 0
        self.token_count_last = 0 
        self.config = None

    def _clear_context_cache(self):
        self.templateCache = None
        if hasattr(self, '_json_funcs'):
            self._json_funcs.templateCache = None

    @property
    def useCache(self) -> bool:
        """
        Whether or not to use Context Caching.

        Gemini 2.0 and later models appear to have a minimum token requirement for context caching.
        If the model supports caching: attempt to use caching.
        If caching fails: The user is informed and caching is disabled.


        Returns:
            bool: True if context caching is supported & cache was successfully created
                  False otherwise.
        """

        if self._canUseCache:
            try:
                if self._needRecache:
                    self._createContext(to_lang=self.to_lang)
                
                return True
            
            except Exception as e:
                self.logger.warning(
                    f"\nContext Cache is supported on this model, but the cache could not be created.\n"
                    f"The following error was encountered when attempting to create Context Cache:\n{e}\n\n"
                    f"The most likely cause is that context contents (`System Prompt` + `Chat Samples`) does not the meet the minimum token length for the model.\n"
                    "Context Caching will be disabled. If you wish to use caching: Try using Gemini 1.5 or increase `System Prompt` and/or `Chat Sample` size."
                )
                self._canUseCache = False

        return False

    def parse_args(self, args: CommonGPTTranslator):
        super().parse_args(args)
        
        # Initialize mode-specific components AFTER config is loaded
        if self.json_mode:
            self._init_json_mode()
        else:
            self._init_standard_mode()

    def _init_json_mode(self):
        """Activate JSON-specific behavior"""
        self._json_funcs = _GeminiTranslator_json(self)

        self._createContext = self._json_funcs._createContext
        self._request_translation = self._json_funcs._request_translation
        self._assemble_prompts = self._json_funcs._assemble_prompts
        self._parse_response = self._json_funcs._parse_response

    def _init_standard_mode(self):
        """Use default method implementations"""
        self._assemble_prompts = super()._assemble_prompts


    def count_tokens(self, text: str) -> int:
        # Uses the synchronous call (`client`) instead of asynchronous (`client.aio`)
        #   for compatibility with `common_gpt` 's `assemble_prompt`
        for _ in range(max(1, len(GEMINI_API_KEYS))):
            self.client = self.client_pool.current_client
            try:
                return self.client.models.count_tokens(model=GEMINI_MODEL, contents=text).total_tokens
            except genai.errors.APIError as genai_err:
                if not self.client_pool.is_recoverable_error(genai_err):
                    raise
                if len(GEMINI_API_KEYS) <= 1:
                    raise
                failed_index = self.client_pool._current_index
                if self.client_pool.is_key_disabled_error(genai_err):
                    self.client_pool._cooldowns[failed_index] = (
                        time.monotonic() + self.client_pool._KEY_DISABLED_COOLDOWN_SECONDS
                    )
                    if not self.client_pool._disabled_reported[failed_index]:
                        self.client_pool._disabled_reported[failed_index] = True
                        masked = self.client_pool._mask_key(GEMINI_API_KEYS[failed_index])
                        self.logger.error(
                            f'Gemini API key #{failed_index + 1} ({masked}) is suspended/invalid (token count) — quarantined.'
                        )
                self.client_pool._current_index = (self.client_pool._current_index + 1) % len(GEMINI_API_KEYS)
                self._clear_context_cache()
                self.logger.warning(f'Retrying Gemini token count with API key #{self.client_pool.current_key_number}.')

        raise InvalidServerResponse('Gemini token counting failed for all configured API keys.')
    
    def _createContext(self, to_lang: str): 
        chatSamples=None
        sysTemplate=self.chat_system_template.format(to_lang=to_lang)
        
        # Store cached values for printing to logger:
        self.cachedVals={'System Prompt (Cached)': sysTemplate}

        # 如果需要先给出示例对话
        # Add chat samples if available
        lang_chat_samples = self.get_chat_sample(to_lang)
        if lang_chat_samples:
            chatSamples=[
                types.Content(role='user',  parts=[types.Part.from_text(text=lang_chat_samples[0])]),
                types.Content(role='model', parts=[types.Part.from_text(text=lang_chat_samples[1])]),
            ]
            self.cachedVals['Sample (Cached): User'] = lang_chat_samples[0]
            self.cachedVals['Sample (Cached): Model'] = lang_chat_samples[1]

        self.templateCache = self.client.caches.create(model=GEMINI_MODEL,
                                                        config=types.CreateCachedContentConfig(
                                                            contents=chatSamples,
                                                            system_instruction=sysTemplate,
                                                            display_name='TranslationCache',
                                                            ttl=f'{self._CACHE_TTL}s',
                                                        ),
                                                    )
        
    def _needRecache(self) -> bool:
        if self.templateCache is None:
            return True

        # expire_time (as seconds) - now (as seconds)
        delta = (
                    # Get expire_time as unix timestamp
                    self.templateCache.expire_time.timestamp()
                    -
                    # Access `datetime.datetime` library through through the variable. 
                    # Get current time as unixtimestamp
                    self.templateCache.expire_time.now().timestamp()
            )
        
        # If cache expire_time is less than 5 minutes (300 seconds) in the future: return True
        return delta < self._CACHE_TTL_BUFFER

    async def _translate(self, from_lang: str, to_lang: str, queries: List[str]) -> List[str]:  
        self.to_lang=to_lang # Export `to_lang`
        translations = [''] * len(queries)  
        self.logger.debug(f'Temperature: {self.temperature}, TopP: {self.top_p}')  
        MAX_SPLIT_ATTEMPTS = 5  # Default max split attempts  
        RETRY_ATTEMPTS = self._RETRY_ATTEMPTS  
        RATELIMIT_FAILOVERS = max(self._RATELIMIT_RETRY_ATTEMPTS, len(GEMINI_API_KEYS))  # try every key once before giving up (no exponential split)

        async def translate_batch(prompt_queries, prompt_query_indices, split_level=0):  
            nonlocal MAX_SPLIT_ATTEMPTS
            split_prefix = ' (split)' if split_level > 0 else ''  

            # Assemble prompt for the current batch  
            prompt, query_size = self._assemble_prompts(from_lang, to_lang, prompt_queries).__next__()

            # Two independent retry budgets. A transient rate-limit (429) must never be
            # treated like a malformed response: splitting the batch only helps when the
            # model actually returned a bad/incomplete answer. Splitting on a 429 just
            # fires MORE requests at an already-exhausted key pool -- the feedback loop
            # that left most bubbles blank. So: content problems -> split; rate-limit /
            # API errors -> rotate key, back off (handled in switch_after_error), retry
            # the SAME batch without consuming the content budget or splitting.
            content_attempt = 0
            ratelimit_attempt = 0
            while content_attempt < RETRY_ATTEMPTS:
                # 1) Send the request. Isolate retryable API/rate-limit errors here so
                #    they neither consume the content budget nor trigger a split.
                try:
                    response = await self._request_translation(to_lang, prompt)
                except genai.errors.APIError as genai_err:
                    if await self.client_pool.switch_after_error(genai_err):
                        self.client = self.client_pool.current_client
                        self._clear_context_cache()
                        ratelimit_attempt += 1
                        if ratelimit_attempt >= RATELIMIT_FAILOVERS:
                            self.logger.error(
                                f'Gemini request failed after {ratelimit_attempt} key failover(s) across a '
                                f'pool of {len(GEMINI_API_KEYS)} key(s) for a batch of {len(prompt_queries)} '
                                f'line(s) -- every key is rate-limited / erroring (see the per-key API-error '
                                f'warnings above for the exact code). Leaving this batch untranslated.'
                            )
                            return False
                        self.logger.warning(
                            f'Retrying Gemini request with API key #{self.client_pool.current_key_number}.'
                        )
                        continue
                    self.logger.error(
                        'Gemini encountered an API error and no alternate key is available for failover.')
                    raise
                except Exception as e:
                    self.logger.error(f'Error during translation attempt: {e}')
                    content_attempt += 1
                    if content_attempt >= RETRY_ATTEMPTS:
                        raise
                    await asyncio.sleep(1)
                    continue

                # 2) Parse and validate. Failures from here on are content problems.
                try:
                    new_translations = self._parse_response(response, prompt_queries)
                except Warning as w:
                    self.logger.warning(w)
                    content_attempt += 1
                    self.logger.warning(f"Retrying...(Attempt {content_attempt})")
                    continue
                except Exception as e:
                    self.logger.error(e)
                    content_attempt += 1
                    self.logger.error(f"Retrying...(Attempt {content_attempt})")
                    continue

                if len(new_translations) < query_size:
                    # Try splitting by newlines instead
                    new_translations = re.split(r'\n', response)

                if len(new_translations) < query_size:
                    content_attempt += 1
                    remaining_attempts = RETRY_ATTEMPTS - content_attempt
                    self.logger.warning(f'Incomplete response, remaining {remaining_attempts} time(s) before splitting the translation.')
                    continue

                # Trim excess translations and pad if necessary
                new_translations = new_translations[:query_size] + [''] * (query_size - len(new_translations))
                # Clean translations by keeping only the content before the first newline
                new_translations = [t.split('\n')[0].strip() for t in new_translations]
                # Remove any potential prefix markers
                new_translations = [re.sub(r'^\s*<\|\d+\|>\s*', '', t) for t in new_translations]
                # Check if any translations are empty
                if any(not t.strip() for t in new_translations):
                    self.logger.warning('Empty translations detected. Resplitting the batch.')
                    content_attempt += 1
                    break  # Exit retry loop and trigger split logic below

                # Store the translations in the correct indices
                for idx, translation in zip(prompt_query_indices, new_translations):
                    translations[idx] = translation

                # Log progress
                self.logger.info(f'Batch translated: {len([t for t in translations if t])}/{len(queries)} completed.')
                self.logger.debug(f'Completed translations: {[t if t else queries[i] for i, t in enumerate(translations)]}')
                return True  # Successfully translated this batch

            # Retries exhausted on a CONTENT problem => split, but only when there is
            # more than one line (a single failing line cannot be halved -- recursing
            # to MAX_SPLIT_ATTEMPTS on it just wastes requests).
            if split_level < MAX_SPLIT_ATTEMPTS and len(prompt_queries) > 1:
                if split_level == 0:
                    self.logger.warning('Retry limit reached. Starting to split the translation batch.')
                else:
                    self.logger.warning('Further splitting the translation batch due to persistent errors.')
                mid_index = len(prompt_queries) // 2
                futures = []
                # Split the batch into two halves
                for sub_queries, sub_indices in [
                    (prompt_queries[:mid_index], prompt_query_indices[:mid_index]),
                    (prompt_queries[mid_index:], prompt_query_indices[mid_index:]),
                ]:
                    if sub_queries:
                        futures.append(translate_batch(sub_queries, sub_indices, split_level + 1))
                results = await asyncio.gather(*futures)
                return all(results)
            else:
                self.logger.error('Maximum split attempts reached. Unable to translate the following queries:')
                for idx in prompt_query_indices:
                    self.logger.error(f'Query: {queries[idx]}')
                return False  # Indicate failure for this batch

        # Begin translation process  
        prompt_queries = queries  
        prompt_query_indices = list(range(len(queries)))  
        await translate_batch(prompt_queries, prompt_query_indices)  

        self.logger.debug(translations)  
        if self.token_count_last:  
            self.logger.info(f'Used {self.token_count_last} tokens (Total: {self.token_count})')  
        return translations

    def formatLog(self, vals: dict) -> str:
        return '\n---\n'.join(f"\n{BOLD}{aKey}{NRML}:\n{aVal}" 
                                for aKey, aVal in vals.items()
                            )

    async def _request_translation(self, to_lang: str, prompt: str) -> str:
        await self._ratelimit_sleep()
        config_kwargs = {
                            'safety_settings': self.safety_settings,
                            'top_p': self.top_p,
                            'temperature': self.temperature,
                        }
        
        messages=[]

        # Store values to be printed to logger
        loggerVals={}
        if self.useCache:
            config_kwargs['cached_content'] = self.templateCache.name
            
            loggerVals = self.cachedVals.copy()
        else:
            config_kwargs['system_instruction'] = self.chat_system_template.format(to_lang=to_lang)
            loggerVals = {'System Prompt': config_kwargs['system_instruction']}

            # 如果需要先给出示例对话
            # Add chat samples if available
            lang_chat_samples = self.get_chat_sample(to_lang)
            if lang_chat_samples:
                messages=[
                    types.Content(role='user',  parts=[types.Part.from_text(text=lang_chat_samples[0])]),
                    types.Content(role='model', parts=[types.Part.from_text(text=lang_chat_samples[1])])
                ]

                loggerVals['Sample: User'] = lang_chat_samples[0],
                loggerVals['Sample: Model'] = lang_chat_samples[1]


        messages.append(types.Content(role='user',  parts=[types.Part.from_text(text=prompt)]))
        loggerVals['Input'] = prompt

        self.logger.debug(  '-- GPT Prompt --\n' +
                            self.formatLog(loggerVals) +
                            '\n------------'
                        )

        self.client = self.client_pool.current_client
        response = await self.client.aio.models.generate_content(
                                                model=GEMINI_MODEL,
                                                contents=messages,
                                                config=types.GenerateContentConfig(
                                                            **config_kwargs
                                                        )
                                            )

        try:
            if not hasattr(response, 'usage_metadata'):
                self.logger.warning("Response does not contain usage information")
                self.token_count_last = 0
            else:
                self.token_count += response.usage_metadata.prompt_token_count
                self.token_count_last = response.usage_metadata.total_token_count
            
            self.logger.debug(f'-- GPT Response --\n' + response.text)

            return response.text
        except Exception as ex:
            self.logger.error(f"Error in _request_translation: {str(ex)}")
            raise ex



class _GeminiTranslator_json (_CommonGPTTranslator_JSON):
    from .config_gpt import TranslationList
    import json

    """Internal helper class for JSON mode logic"""
    def __init__(self, translator: GeminiTranslator):
        super().__init__(translator)
        self.translator = translator

        # For conveniance: Simplify logger calls:
        self.logger = self.translator.logger 

    def _createContext(self, to_lang: str):
        JSON_Samples=[]
        sysTemplate=self.translator.chat_system_template.format(to_lang=to_lang)

        # Store cached values for printing to logger:
        self.cachedVals={'System Prompt (Cached)': sysTemplate}

        # 如果需要先给出示例对话
        # Add chat samples if available
        lang_JSON_samples = self.translator.get_json_sample(to_lang)
        if lang_JSON_samples:
            JSON_Samples=[
                types.Content(role='user',  parts=[types.Part.from_text(text=lang_JSON_samples[0].model_dump_json())]),
                types.Content(role='model', parts=[types.Part.from_text(text=lang_JSON_samples[1].model_dump_json())]),
            ]

            self.cachedVals['Sample (Cached): User'] = self.ppJSON(lang_JSON_samples[0].model_dump_json())
            self.cachedVals['Sample (Cached): Model'] = self.ppJSON(lang_JSON_samples[1].model_dump_json())

        self.templateCache = self.translator.client.caches.create(model=GEMINI_MODEL,
                                                                    config=types.CreateCachedContentConfig(
                                                                        contents=JSON_Samples,
                                                                        system_instruction=sysTemplate,
                                                                        display_name='TranslationCache_JSON',
                                                                        ttl=f'{self.translator._CACHE_TTL}s',
                                                                        ),
                                                                    )

    async def _request_translation(self, to_lang: str, prompt: str) -> str:
        await self.translator._ratelimit_sleep()
        config_kwargs = {
                            'safety_settings': self.translator.safety_settings,
                            'response_mime_type': 'application/json',
                            'response_schema': self.TranslationList,
                            'top_p': self.translator.top_p,
                            'temperature': self.translator.temperature,
                    }

        messages=[]

        # Store values to be printed to logger
        loggerVals={}
        if self.translator.useCache:
            config_kwargs['cached_content'] = self.templateCache.name
            loggerVals = self.cachedVals
        else:
            config_kwargs['system_instruction'] = self.translator.chat_system_template.format(to_lang=to_lang)
            loggerVals={'System Prompt': config_kwargs['system_instruction']}

            lang_JSON_samples = self.translator.get_json_sample(to_lang)
            if lang_JSON_samples:
                messages=[
                    types.Content(role='user',  parts=[types.Part.from_text(text=lang_JSON_samples[0].model_dump_json())]),
                    types.Content(role='model', parts=[types.Part.from_text(text=lang_JSON_samples[1].model_dump_json())]),
                ]

            loggerVals['Sample: User'] = lang_JSON_samples[0].model_dump_json(),
            loggerVals['Sample: Model'] = lang_JSON_samples[1].model_dump_json()


        messages.append(types.Content(role='user',  parts=[types.Part.from_text(text=prompt)]))
        
        loggerVals['Input'] = self.ppJSON(prompt)
        self.logger.debug(  '-- GPT Prompt --\n' +
                            self.translator.formatLog(loggerVals) +
                            '\n------------'
                        )
        
        response = await self.translator.client.aio.models.generate_content(model=GEMINI_MODEL,
                                                                            contents=messages,
                                                                            config=types.GenerateContentConfig(
                                                                                **config_kwargs
                                                                            )
                                                                        )

        try:
            if not hasattr(response, 'usage_metadata'):
                self.logger.warning("Response does not contain usage information")
                self.translator.token_count_last = 0
            else:
                self.translator.token_count += response.usage_metadata.prompt_token_count
                self.translator.token_count_last = response.usage_metadata.total_token_count

            self.logger.debug(  '-- GPT Response --\n' + 
                                self.ppJSON(response.text) + 
                                '\n------------\n'
                            )

            return response.text
        except Exception as ex:
            self.logger.error(f"Error in _request_translation: {str(ex)}")
            raise ex
