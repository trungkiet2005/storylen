"""
Admin router package.

All routes are mounted under ``/admin`` and require an admin user.
The package is split by domain to keep each module under ~300 LOC and
easy to test/review:

    users.py       - user account management
    content.py     - manga_pages + qa_history moderation
    analytics.py   - dashboard counters / time series / breakdowns
    audit.py       - audit log viewer
    app_settings.py - runtime feature flags & limits
    health.py      - upstream service probes
"""
from fastapi import APIRouter

from . import analytics, app_settings, audit, content, credits, health, users

router = APIRouter(prefix="/admin")

router.include_router(users.router)            # /admin/users/...
router.include_router(content.router)          # /admin/pages, /admin/qa
router.include_router(analytics.router)        # /admin/stats, /admin/activity, ...
router.include_router(audit.router)            # /admin/audit
router.include_router(app_settings.router)     # /admin/settings/...
router.include_router(health.router)           # /admin/health
router.include_router(credits.router)          # /admin/credits/...

__all__ = ["router"]
