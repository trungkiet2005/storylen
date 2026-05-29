"""
StoryLens Backend - Supabase Client
Provides singleton Supabase client instances for DB and Storage operations.
Uses service-role key on the server side (never exposed to frontend).
"""
from functools import lru_cache

import httpx
from supabase import create_client, Client

from app.config import get_settings


# supabase-py initializes its postgrest / storage / auth sub-clients with
# httpx.Client(http2=True). Render's edge closes idle TCP connections, but
# the cached client keeps multiplexing onto the dead HTTP/2 socket and every
# subsequent request fails with `httpcore.WriteError: [Errno 32] Broken pipe`.
# Forcing HTTP/1.1 here makes each request open a short-lived connection, so a
# dropped socket is retried by httpcore instead of poisoning the pool.
_HTTP1_TARGETS: tuple[tuple[str, str], ...] = (
    ("postgrest", "session"),
    ("storage", "session"),
    ("storage", "_client"),
    ("auth", "_http_client"),
)


def _force_http1(client: Client) -> None:
    seen: set[int] = set()
    for sub_name, attr in _HTTP1_TARGETS:
        sub = getattr(client, sub_name, None)
        if sub is None:
            continue
        old = getattr(sub, attr, None)
        if not isinstance(old, httpx.Client):
            continue
        new = httpx.Client(
            headers=dict(old.headers),
            base_url=str(old.base_url),
            timeout=old.timeout,
            follow_redirects=old.follow_redirects,
            http1=True,
            http2=False,
        )
        if id(old) not in seen:
            seen.add(id(old))
            try:
                old.close()
            except Exception:
                pass
        setattr(sub, attr, new)


@lru_cache
def get_supabase() -> Client:
    """Return a cached Supabase client (service-role key for server-side ops)."""
    settings = get_settings()
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    _force_http1(client)
    return client


def get_storage(client: Client | None = None):
    """Convenience accessor for Supabase Storage."""
    return (client or get_supabase()).storage
