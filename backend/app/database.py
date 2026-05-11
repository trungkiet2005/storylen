"""
StoryLens Backend - Supabase Client
Provides singleton Supabase client instances for DB and Storage operations.
Uses service-role key on the server side (never exposed to frontend).
"""
from functools import lru_cache

from supabase import create_client, Client
from app.config import get_settings


@lru_cache
def get_supabase() -> Client:
    """Return a cached Supabase client (service-role key for server-side ops)."""
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_storage(client: Client | None = None):
    """Convenience accessor for Supabase Storage."""
    return (client or get_supabase()).storage
