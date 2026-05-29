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
#
# `auth.admin` is constructed with the same http_client reference as `auth`,
# so it must be rewritten too — otherwise admin endpoints (list_users, etc.)
# keep a stale reference to the closed client and fail with
# "Cannot send a request, as the client has been closed."
_HTTP1_TARGETS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("postgrest",), "session"),
    (("storage",), "session"),
    (("storage",), "_client"),
    (("auth",), "_http_client"),
    (("auth", "admin"), "_http_client"),
)


def _resolve(client: Client, path: tuple[str, ...]):
    obj: object | None = client
    for name in path:
        obj = getattr(obj, name, None)
        if obj is None:
            return None
    return obj


def _force_http1(client: Client) -> None:
    seen: set[int] = set()
    replacements: dict[int, httpx.Client] = {}
    for path, attr in _HTTP1_TARGETS:
        sub = _resolve(client, path)
        if sub is None:
            continue
        old = getattr(sub, attr, None)
        if not isinstance(old, httpx.Client):
            continue
        # Reuse the replacement if the same client object is shared across
        # sub-clients (e.g. auth and auth.admin) — closing it twice or
        # creating two HTTP/1 pools for one logical connection is wasteful.
        new = replacements.get(id(old))
        if new is None:
            new = httpx.Client(
                headers=dict(old.headers),
                base_url=str(old.base_url),
                timeout=old.timeout,
                follow_redirects=old.follow_redirects,
                http1=True,
                http2=False,
            )
            replacements[id(old)] = new
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
