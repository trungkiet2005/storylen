"""Main FastAPI application — mounts all routes and serves the web SPA."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from control_plane.config import get_settings
from control_plane.storage.db import init_db
from control_plane.workers.runner import start_runner
from control_plane.ws.gateway import router as ws_router
from control_plane.routes.health import router as health_router
from control_plane.routes.manga import router as manga_router
from control_plane.routes.translate import router as translate_router
from control_plane.routes.jobs import router as jobs_router
from control_plane.routes.review import router as review_router
from control_plane.routes.glossary import router as glossary_router
from control_plane.routes.style import router as style_router
from control_plane.routes.library import router as library_router
from control_plane.routes.artifacts import router as artifacts_router
from control_plane.routes.auth import router as auth_router
from control_plane.routes.mdx_proxy import router as mdx_proxy_router
from control_plane.auth import ensure_admin_user

log = logging.getLogger("storylens")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

_WEB_DIR = Path(__file__).parent.parent / "web"


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting StoryLens Demo...")
    await init_db()
    await ensure_admin_user()
    await start_runner()
    settings = get_settings()
    log.info("Config: model=%s, db=%s, artifacts=%s",
             settings.gemini_translation_model, settings.db_url, settings.artifact_dir)
    if not settings.gemini_api_key:
        log.warning("⚠️  Gemini API key not configured! Add to secrets/keys.json")
    yield
    log.info("Shutting down StoryLens Demo")


settings = get_settings()
app = FastAPI(
    title="StoryLens Demo",
    version="1.0.0",
    description="Manga translation pipeline — Gemini + Multi-RAG + LLMOps",
    lifespan=lifespan,
)

# ── Raw ASGI no-cache middleware — prevents ALL 304 responses for JS/CSS ──
from starlette.types import ASGIApp as _ASGIApp, Receive as _Receive, Scope as _Scope, Send as _Send

_NO_CACHE_EXTS = (".js", ".css", ".html")
_STRIP_REQ = {b"if-none-match", b"if-modified-since"}
_STRIP_RES = {b"etag", b"last-modified", b"cache-control", b"pragma", b"expires"}

class NoCacheStaticMiddleware:
    """Strip conditional request headers so StaticFiles always returns 200."""
    def __init__(self, app: _ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: _Scope, receive: _Receive, send: _Send) -> None:
        if scope["type"] == "http":
            path: str = scope.get("path", "")
            if path.startswith("/static/") and any(path.endswith(e) for e in _NO_CACHE_EXTS):
                # Strip conditional headers from REQUEST so StaticFiles returns 200
                scope = {
                    **scope,
                    "headers": [(k, v) for k, v in scope["headers"] if k.lower() not in _STRIP_REQ],
                }

                async def _send(message: dict) -> None:
                    if message["type"] == "http.response.start":
                        # Strip caching headers from RESPONSE; add no-cache
                        hdrs = [(k, v) for k, v in message.get("headers", []) if k.lower() not in _STRIP_RES]
                        hdrs += [
                            (b"cache-control", b"no-cache, no-store, must-revalidate"),
                            (b"pragma", b"no-cache"),
                            (b"expires", b"0"),
                        ]
                        message = {**message, "headers": hdrs}
                    await send(message)

                await self.app(scope, receive, _send)
                return
        await self.app(scope, receive, send)

app.add_middleware(NoCacheStaticMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(health_router)
app.include_router(manga_router)
app.include_router(translate_router)
app.include_router(jobs_router)
app.include_router(review_router)
app.include_router(glossary_router)
app.include_router(style_router)
app.include_router(library_router)
app.include_router(artifacts_router)
app.include_router(auth_router)
app.include_router(mdx_proxy_router)

# WebSocket
app.include_router(ws_router)

# Serve web SPA static files
if _WEB_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(_WEB_DIR)), name="static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Serve index.html for all non-API routes (SPA routing)."""
        if full_path.startswith("api/") or full_path.startswith("ws/") or full_path.startswith("health"):
            from fastapi import HTTPException
            raise HTTPException(404)
        index = _WEB_DIR / "index.html"
        if index.exists():
            resp = FileResponse(str(index))
            resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            return resp
        return {"message": "StoryLens API is running. Web UI not found."}
