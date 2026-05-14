"""
StoryLens Backend - Series Router
CRUD for manga series + chapters + page-to-chapter management.

Ownership model: every mutate verifies the series belongs to the caller.
The service_role Supabase client bypasses RLS, so we enforce ownership in Python.
"""
from __future__ import annotations

import io
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from PIL import Image

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import (
    AddPagesRequest,
    ChapterCreate,
    ChapterPage,
    ChapterResponse,
    ChapterUpdate,
    ProcessingStatus,
    ReorderRequest,
    SeriesCreate,
    SeriesListItem,
    SeriesListResponse,
    SeriesResponse,
    SeriesUpdate,
)
from app.routers.auth import AuthUser, get_current_user

router = APIRouter(tags=["series"])
logger = logging.getLogger(__name__)
settings = get_settings()

SERIES_COVERS_BUCKET = "series-covers"
ALLOWED_SERIES_STATUSES = {"ongoing", "completed", "paused"}
ALLOWED_COVER_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
COVER_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_status(value: str | None) -> str:
    if value is None:
        return "ongoing"
    if value not in ALLOWED_SERIES_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Trạng thái không hợp lệ. Phải là một trong: {sorted(ALLOWED_SERIES_STATUSES)}",
        )
    return value


def _normalize_tags(tags: list[str] | None) -> list[str]:
    if not tags:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for t in tags:
        if not isinstance(t, str):
            continue
        cleaned = t.strip().lower()
        if not cleaned or cleaned in seen:
            continue
        if len(cleaned) > 32:
            cleaned = cleaned[:32]
        seen.add(cleaned)
        out.append(cleaned)
    return out[:20]


def _require_series(series_id: str, user_id: str) -> dict[str, Any]:
    """Fetch a series and assert ownership. Raises 404 / 403."""
    supabase = get_supabase()
    try:
        res = (
            supabase.table("manga_series")
            .select("*")
            .eq("series_id", series_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.error("Lookup series %s failed: %s", series_id, exc)
        raise HTTPException(status_code=503, detail="Không thể truy cập cơ sở dữ liệu.") from exc

    row = res.data if res else None
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ truyện.")
    if row.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Truy cập bị từ chối.")
    return row


def _require_chapter(chapter_id: str, user_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    """Fetch a chapter and the owning series; assert ownership."""
    supabase = get_supabase()
    try:
        chap_res = (
            supabase.table("manga_chapters")
            .select("*")
            .eq("chapter_id", chapter_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.error("Lookup chapter %s failed: %s", chapter_id, exc)
        raise HTTPException(status_code=503, detail="Không thể truy cập cơ sở dữ liệu.") from exc

    chapter = chap_res.data if chap_res else None
    if not chapter:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương.")
    series = _require_series(chapter["series_id"], user_id)
    return chapter, series


def _fallback_cover_for_series(series_id: str) -> str | None:
    """Return thumbnail of (chapter_number=1, page_number=1) page, or first available."""
    supabase = get_supabase()
    try:
        chap_res = (
            supabase.table("manga_chapters")
            .select("chapter_id")
            .eq("series_id", series_id)
            .order("chapter_number")
            .limit(1)
            .execute()
        )
        chapters = chap_res.data or []
        if not chapters:
            return None
        first_chapter_id = chapters[0]["chapter_id"]
        page_res = (
            supabase.table("manga_pages")
            .select("thumbnail_url, translated_image_url, original_image_url")
            .eq("chapter_id", first_chapter_id)
            .order("page_number")
            .limit(1)
            .execute()
        )
        pages = page_res.data or []
        if not pages:
            return None
        p = pages[0]
        return p.get("thumbnail_url") or p.get("translated_image_url") or p.get("original_image_url")
    except Exception as exc:
        logger.warning("Cover fallback lookup failed for series %s: %s", series_id, exc)
        return None


def _count_chapters_and_pages(series_ids: list[str]) -> dict[str, tuple[int, int]]:
    """Return {series_id: (chapter_count, page_count)} for a batch of series."""
    if not series_ids:
        return {}
    supabase = get_supabase()
    out: dict[str, tuple[int, int]] = {sid: (0, 0) for sid in series_ids}

    try:
        chap_res = (
            supabase.table("manga_chapters")
            .select("series_id, chapter_id")
            .in_("series_id", series_ids)
            .execute()
        )
        chapter_rows = chap_res.data or []
    except Exception as exc:
        logger.warning("Chapter count query failed: %s", exc)
        chapter_rows = []

    chapter_by_series: dict[str, list[str]] = {}
    for row in chapter_rows:
        chapter_by_series.setdefault(row["series_id"], []).append(row["chapter_id"])

    all_chapter_ids = [cid for ids in chapter_by_series.values() for cid in ids]
    chapter_id_to_series = {
        cid: sid for sid, cids in chapter_by_series.items() for cid in cids
    }

    page_count_by_series: dict[str, int] = {sid: 0 for sid in series_ids}
    if all_chapter_ids:
        try:
            page_res = (
                supabase.table("manga_pages")
                .select("page_id, chapter_id")
                .in_("chapter_id", all_chapter_ids)
                .execute()
            )
            for row in page_res.data or []:
                sid = chapter_id_to_series.get(row["chapter_id"])
                if sid:
                    page_count_by_series[sid] = page_count_by_series.get(sid, 0) + 1
        except Exception as exc:
            logger.warning("Page count query failed: %s", exc)

    for sid in series_ids:
        out[sid] = (
            len(chapter_by_series.get(sid, [])),
            page_count_by_series.get(sid, 0),
        )
    return out


def _parse_status(value: str | None) -> ProcessingStatus:
    try:
        return ProcessingStatus(value or "pending")
    except ValueError:
        return ProcessingStatus.FAILED


def _serialize_series_list_item(row: dict[str, Any], chapter_count: int, page_count: int) -> SeriesListItem:
    cover = row.get("cover_image_url") or _fallback_cover_for_series(row["series_id"])
    return SeriesListItem(
        series_id=row["series_id"],
        title=row.get("title", "(Không tên)"),
        description=row.get("description"),
        status=row.get("status", "ongoing"),
        tags=row.get("tags") or [],
        cover_image_url=cover,
        source_language=row.get("source_language"),
        target_language=row.get("target_language"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        chapter_count=chapter_count,
        page_count=page_count,
    )


# ─── Series CRUD ──────────────────────────────────────────────────────────────

@router.post("/series", response_model=SeriesResponse, status_code=201)
def create_series(
    body: SeriesCreate,
    user: AuthUser = Depends(get_current_user),
):
    supabase = get_supabase()
    series_id = str(uuid.uuid4())
    now = _now_iso()
    record = {
        "series_id": series_id,
        "user_id": user.id,
        "title": body.title.strip(),
        "description": (body.description or "").strip() or None,
        "status": _validate_status(body.status),
        "tags": _normalize_tags(body.tags),
        "source_language": (body.source_language or "").strip() or None,
        "target_language": (body.target_language or "").strip() or None,
        "created_at": now,
        "updated_at": now,
    }
    try:
        supabase.table("manga_series").insert(record).execute()
    except Exception as exc:
        logger.error("Create series failed: %s", exc)
        raise HTTPException(status_code=503, detail="Không tạo được bộ truyện.") from exc

    return _build_full_series(series_id, user.id)


@router.get("/series", response_model=SeriesListResponse)
def list_series(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: str | None = Query(None),
    user: AuthUser = Depends(get_current_user),
):
    supabase = get_supabase()

    try:
        count_q = (
            supabase.table("manga_series")
            .select("series_id", count="exact")
            .eq("user_id", user.id)
        )
        if status:
            count_q = count_q.eq("status", status)
        count_res = count_q.execute()
        total = count_res.count or 0
    except Exception as exc:
        logger.error("Count series failed: %s", exc)
        total = 0

    try:
        q = (
            supabase.table("manga_series")
            .select("*")
            .eq("user_id", user.id)
        )
        if status:
            q = q.eq("status", status)
        rows = (
            q.order("updated_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.error("List series failed: %s", exc)
        rows = []

    series_ids = [r["series_id"] for r in rows]
    counts = _count_chapters_and_pages(series_ids)

    items = [
        _serialize_series_list_item(row, *counts.get(row["series_id"], (0, 0)))
        for row in rows
    ]
    return SeriesListResponse(total=total, items=items)


def _build_full_series(series_id: str, user_id: str, include_pages: bool = False) -> SeriesResponse:
    """Build a SeriesResponse with chapters (and optionally pages)."""
    series = _require_series(series_id, user_id)
    supabase = get_supabase()

    try:
        chap_rows = (
            supabase.table("manga_chapters")
            .select("*")
            .eq("series_id", series_id)
            .order("chapter_number")
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.warning("Fetch chapters for series %s failed: %s", series_id, exc)
        chap_rows = []

    chapter_ids = [c["chapter_id"] for c in chap_rows]
    pages_by_chapter: dict[str, list[dict[str, Any]]] = {cid: [] for cid in chapter_ids}
    page_count = 0

    if chapter_ids:
        try:
            select_cols = (
                "page_id, chapter_id, page_number, thumbnail_url, "
                "translated_image_url, original_image_url, status"
                if include_pages
                else "page_id, chapter_id, page_number, thumbnail_url, status"
            )
            page_rows = (
                supabase.table("manga_pages")
                .select(select_cols)
                .in_("chapter_id", chapter_ids)
                .order("page_number")
                .execute()
                .data
                or []
            )
            for row in page_rows:
                pages_by_chapter.setdefault(row["chapter_id"], []).append(row)
            page_count = len(page_rows)
        except Exception as exc:
            logger.warning("Fetch pages for series %s failed: %s", series_id, exc)

    chapters: list[ChapterResponse] = []
    for c in chap_rows:
        chap_pages_raw = pages_by_chapter.get(c["chapter_id"], [])
        chapter_pages = [
            ChapterPage(
                page_id=p["page_id"],
                page_number=p.get("page_number"),
                thumbnail_url=p.get("thumbnail_url"),
                translated_image_url=p.get("translated_image_url") if include_pages else None,
                original_image_url=p.get("original_image_url") if include_pages else None,
                status=_parse_status(p.get("status")),
            )
            for p in chap_pages_raw
        ]
        chapters.append(
            ChapterResponse(
                chapter_id=c["chapter_id"],
                series_id=c["series_id"],
                chapter_number=c["chapter_number"],
                title=c.get("title"),
                description=c.get("description"),
                created_at=c["created_at"],
                updated_at=c.get("updated_at") or c["created_at"],
                page_count=len(chapter_pages),
                pages=chapter_pages,
            )
        )

    cover = series.get("cover_image_url") or _fallback_cover_for_series(series_id)

    return SeriesResponse(
        series_id=series["series_id"],
        user_id=series.get("user_id"),
        title=series["title"],
        description=series.get("description"),
        status=series.get("status", "ongoing"),
        tags=series.get("tags") or [],
        cover_image_url=cover,
        source_language=series.get("source_language"),
        target_language=series.get("target_language"),
        created_at=series["created_at"],
        updated_at=series["updated_at"],
        chapters=chapters,
        chapter_count=len(chapters),
        page_count=page_count,
    )


@router.get("/series/{series_id}", response_model=SeriesResponse)
def get_series_detail(
    series_id: str,
    user: AuthUser = Depends(get_current_user),
):
    return _build_full_series(series_id, user.id, include_pages=False)


@router.get("/series/{series_id}/full", response_model=SeriesResponse)
def get_series_full(
    series_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """Full hierarchy with translated/original image URLs — used by the reader."""
    return _build_full_series(series_id, user.id, include_pages=True)


@router.patch("/series/{series_id}", response_model=SeriesResponse)
def update_series(
    series_id: str,
    body: SeriesUpdate,
    user: AuthUser = Depends(get_current_user),
):
    _require_series(series_id, user.id)
    supabase = get_supabase()

    patch: dict[str, Any] = {}
    if body.title is not None:
        patch["title"] = body.title.strip()
    if body.description is not None:
        patch["description"] = body.description.strip() or None
    if body.status is not None:
        patch["status"] = _validate_status(body.status)
    if body.tags is not None:
        patch["tags"] = _normalize_tags(body.tags)
    if body.source_language is not None:
        patch["source_language"] = body.source_language.strip() or None
    if body.target_language is not None:
        patch["target_language"] = body.target_language.strip() or None
    if body.cover_image_url is not None:
        patch["cover_image_url"] = body.cover_image_url.strip() or None

    if patch:
        try:
            supabase.table("manga_series").update(patch).eq("series_id", series_id).execute()
        except Exception as exc:
            logger.error("Update series %s failed: %s", series_id, exc)
            raise HTTPException(status_code=503, detail="Cập nhật thất bại.") from exc

    return _build_full_series(series_id, user.id)


@router.delete("/series/{series_id}", status_code=204, response_class=Response)
def delete_series(
    series_id: str,
    user: AuthUser = Depends(get_current_user),
) -> Response:
    """
    Delete a series. Chapters cascade-delete (FK ON DELETE CASCADE).
    Pages keep existing (chapter_id is set to NULL via FK ON DELETE SET NULL),
    so they remain in the user's general history.
    """
    series = _require_series(series_id, user.id)
    supabase = get_supabase()

    try:
        supabase.table("manga_series").delete().eq("series_id", series_id).execute()
    except Exception as exc:
        logger.error("Delete series %s failed: %s", series_id, exc)
        raise HTTPException(status_code=503, detail="Xoá thất bại.") from exc

    # Best-effort: remove cover image if it was uploaded
    cover_url = series.get("cover_image_url")
    if cover_url:
        try:
            from app.storage.supabase_storage import _storage_path_from_public_url
            path = _storage_path_from_public_url(SERIES_COVERS_BUCKET, cover_url)
            if path:
                supabase.storage.from_(SERIES_COVERS_BUCKET).remove([path])
        except Exception as exc:
            logger.warning("Cover cleanup for series %s failed: %s", series_id, exc)

    return Response(status_code=204)


# ─── Cover upload ─────────────────────────────────────────────────────────────

@router.post("/series/{series_id}/cover", response_model=SeriesResponse)
async def upload_series_cover(
    series_id: str,
    file: UploadFile = File(...),
    user: AuthUser = Depends(get_current_user),
):
    _require_series(series_id, user.id)

    content_type = (file.content_type or "").lower().split(";")[0].strip()
    ext_map = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    if content_type not in ALLOWED_COVER_MIME:
        # Try fallback from filename extension
        if file.filename:
            suffix = Path(file.filename).suffix.lower()
            mime_by_ext = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
            content_type = mime_by_ext.get(suffix, "")
        if content_type not in ALLOWED_COVER_MIME:
            raise HTTPException(status_code=400, detail="Định dạng ảnh không hỗ trợ. Dùng JPG/PNG/WebP.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Tệp rỗng.")
    if len(data) > COVER_MAX_BYTES:
        raise HTTPException(status_code=400, detail=f"Ảnh bìa vượt quá {COVER_MAX_BYTES // (1024 * 1024)} MB.")

    # Validate it's a real image and downscale to a reasonable cover size
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
        if img.mode in ("RGBA", "P", "LA"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")
        img.thumbnail((800, 1200), Image.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=80, method=4)
        cover_bytes = out.getvalue()
    except Exception as exc:
        logger.warning("Cover image processing failed: %s", exc)
        raise HTTPException(status_code=400, detail="Ảnh bìa không hợp lệ.") from exc

    storage_path = f"{series_id}/cover.webp"
    supabase = get_supabase()

    try:
        supabase.storage.from_(SERIES_COVERS_BUCKET).upload(
            path=storage_path,
            file=cover_bytes,
            file_options={"content-type": "image/webp", "upsert": "true"},
        )
    except Exception as exc:
        logger.error("Cover upload failed for series %s: %s", series_id, exc)
        raise HTTPException(status_code=503, detail="Tải ảnh bìa thất bại.") from exc

    public_url = supabase.storage.from_(SERIES_COVERS_BUCKET).get_public_url(storage_path)
    if not isinstance(public_url, str) or not public_url.startswith("http"):
        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{SERIES_COVERS_BUCKET}/{storage_path}"

    # Cache-bust so the new cover shows up immediately on the client
    public_url = f"{public_url}?v={int(datetime.now(timezone.utc).timestamp())}"

    try:
        supabase.table("manga_series").update({"cover_image_url": public_url}).eq("series_id", series_id).execute()
    except Exception as exc:
        logger.error("Saving cover URL failed: %s", exc)
        raise HTTPException(status_code=503, detail="Lưu ảnh bìa thất bại.") from exc

    return _build_full_series(series_id, user.id)


# ─── Chapters CRUD ────────────────────────────────────────────────────────────

@router.post("/series/{series_id}/chapters", response_model=ChapterResponse, status_code=201)
def create_chapter(
    series_id: str,
    body: ChapterCreate,
    user: AuthUser = Depends(get_current_user),
):
    _require_series(series_id, user.id)
    supabase = get_supabase()

    chapter_number = body.chapter_number
    if chapter_number is None:
        try:
            existing = (
                supabase.table("manga_chapters")
                .select("chapter_number")
                .eq("series_id", series_id)
                .order("chapter_number", desc=True)
                .limit(1)
                .execute()
                .data
                or []
            )
            chapter_number = (existing[0]["chapter_number"] + 1) if existing else 1
        except Exception as exc:
            logger.warning("Auto chapter_number failed: %s", exc)
            chapter_number = 1

    chapter_id = str(uuid.uuid4())
    now = _now_iso()
    record = {
        "chapter_id": chapter_id,
        "series_id": series_id,
        "chapter_number": chapter_number,
        "title": (body.title or "").strip() or None,
        "description": (body.description or "").strip() or None,
        "created_at": now,
        "updated_at": now,
    }
    try:
        supabase.table("manga_chapters").insert(record).execute()
    except Exception as exc:
        logger.error("Create chapter failed: %s", exc)
        # Likely a duplicate chapter_number — caller can retry without specifying it
        raise HTTPException(
            status_code=409,
            detail=f"Không tạo được chương (số chương {chapter_number} có thể đã tồn tại).",
        ) from exc

    # Touch parent series so it sorts to the top of list views
    try:
        supabase.table("manga_series").update({"updated_at": now}).eq("series_id", series_id).execute()
    except Exception:
        pass

    return ChapterResponse(
        chapter_id=chapter_id,
        series_id=series_id,
        chapter_number=chapter_number,
        title=record["title"],
        description=record["description"],
        created_at=now,
        updated_at=now,
        page_count=0,
        pages=[],
    )


@router.patch("/chapters/{chapter_id}", response_model=ChapterResponse)
def update_chapter(
    chapter_id: str,
    body: ChapterUpdate,
    user: AuthUser = Depends(get_current_user),
):
    chapter, _series = _require_chapter(chapter_id, user.id)
    supabase = get_supabase()

    patch: dict[str, Any] = {}
    if body.title is not None:
        patch["title"] = body.title.strip() or None
    if body.description is not None:
        patch["description"] = body.description.strip() or None
    if body.chapter_number is not None:
        patch["chapter_number"] = body.chapter_number

    if patch:
        try:
            supabase.table("manga_chapters").update(patch).eq("chapter_id", chapter_id).execute()
        except Exception as exc:
            logger.error("Update chapter %s failed: %s", chapter_id, exc)
            raise HTTPException(status_code=409, detail="Cập nhật chương thất bại.") from exc

    # Touch series
    try:
        supabase.table("manga_series").update({"updated_at": _now_iso()}).eq("series_id", chapter["series_id"]).execute()
    except Exception:
        pass

    return _get_chapter_with_pages(chapter_id)


@router.delete("/chapters/{chapter_id}", status_code=204, response_class=Response)
def delete_chapter(
    chapter_id: str,
    user: AuthUser = Depends(get_current_user),
) -> Response:
    chapter, _series = _require_chapter(chapter_id, user.id)
    supabase = get_supabase()

    # Pages set chapter_id=NULL via FK ON DELETE SET NULL — they remain in History.
    try:
        supabase.table("manga_chapters").delete().eq("chapter_id", chapter_id).execute()
    except Exception as exc:
        logger.error("Delete chapter %s failed: %s", chapter_id, exc)
        raise HTTPException(status_code=503, detail="Xoá chương thất bại.") from exc

    try:
        supabase.table("manga_series").update({"updated_at": _now_iso()}).eq("series_id", chapter["series_id"]).execute()
    except Exception:
        pass

    return Response(status_code=204)


def _get_chapter_with_pages(chapter_id: str) -> ChapterResponse:
    supabase = get_supabase()
    chap = (
        supabase.table("manga_chapters")
        .select("*")
        .eq("chapter_id", chapter_id)
        .maybe_single()
        .execute()
        .data
    )
    if not chap:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương.")

    pages_rows = (
        supabase.table("manga_pages")
        .select("page_id, page_number, thumbnail_url, translated_image_url, original_image_url, status")
        .eq("chapter_id", chapter_id)
        .order("page_number")
        .execute()
        .data
        or []
    )
    pages = [
        ChapterPage(
            page_id=p["page_id"],
            page_number=p.get("page_number"),
            thumbnail_url=p.get("thumbnail_url"),
            translated_image_url=p.get("translated_image_url"),
            original_image_url=p.get("original_image_url"),
            status=_parse_status(p.get("status")),
        )
        for p in pages_rows
    ]
    return ChapterResponse(
        chapter_id=chap["chapter_id"],
        series_id=chap["series_id"],
        chapter_number=chap["chapter_number"],
        title=chap.get("title"),
        description=chap.get("description"),
        created_at=chap["created_at"],
        updated_at=chap.get("updated_at") or chap["created_at"],
        page_count=len(pages),
        pages=pages,
    )


# ─── Reorder ──────────────────────────────────────────────────────────────────

@router.patch("/series/{series_id}/chapters/reorder", status_code=204, response_class=Response)
def reorder_chapters(
    series_id: str,
    body: ReorderRequest,
    user: AuthUser = Depends(get_current_user),
) -> Response:
    """
    Reorder chapters within a series. Body: items=[{id: chapter_id, order: chapter_number}, ...]
    Two-phase update to dodge the unique (series_id, chapter_number) constraint.
    """
    _require_series(series_id, user.id)
    supabase = get_supabase()

    if not body.items:
        return Response(status_code=204)

    target_ids = [it.id for it in body.items]
    try:
        existing = (
            supabase.table("manga_chapters")
            .select("chapter_id, series_id")
            .in_("chapter_id", target_ids)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.error("Reorder chapters lookup failed: %s", exc)
        raise HTTPException(status_code=503, detail="Sắp xếp lại thất bại.") from exc

    for row in existing:
        if row["series_id"] != series_id:
            raise HTTPException(status_code=403, detail="Chương không thuộc bộ truyện này.")
    if len(existing) != len(target_ids):
        raise HTTPException(status_code=404, detail="Có chương không tồn tại.")

    # Phase 1: move all to high negative numbers (avoid unique conflict)
    try:
        for idx, it in enumerate(body.items):
            supabase.table("manga_chapters").update(
                {"chapter_number": -(idx + 1) - 100000}
            ).eq("chapter_id", it.id).execute()
        # Phase 2: assign final numbers
        for it in body.items:
            supabase.table("manga_chapters").update(
                {"chapter_number": it.order}
            ).eq("chapter_id", it.id).execute()
        supabase.table("manga_series").update({"updated_at": _now_iso()}).eq("series_id", series_id).execute()
    except Exception as exc:
        logger.error("Reorder chapters apply failed: %s", exc)
        raise HTTPException(status_code=503, detail="Sắp xếp lại thất bại.") from exc

    return Response(status_code=204)


@router.patch("/chapters/{chapter_id}/reorder", status_code=204, response_class=Response)
def reorder_pages(
    chapter_id: str,
    body: ReorderRequest,
    user: AuthUser = Depends(get_current_user),
) -> Response:
    """Reorder pages within a chapter. Body items: {id: page_id, order: page_number}."""
    _require_chapter(chapter_id, user.id)
    supabase = get_supabase()

    if not body.items:
        return Response(status_code=204)

    target_ids = [it.id for it in body.items]
    try:
        existing = (
            supabase.table("manga_pages")
            .select("page_id, chapter_id, user_id")
            .in_("page_id", target_ids)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.error("Reorder pages lookup failed: %s", exc)
        raise HTTPException(status_code=503, detail="Sắp xếp lại thất bại.") from exc

    for row in existing:
        if row["chapter_id"] != chapter_id:
            raise HTTPException(status_code=403, detail="Trang không thuộc chương này.")
        if row["user_id"] != user.id:
            raise HTTPException(status_code=403, detail="Truy cập bị từ chối.")
    if len(existing) != len(target_ids):
        raise HTTPException(status_code=404, detail="Có trang không tồn tại.")

    try:
        for it in body.items:
            supabase.table("manga_pages").update({"page_number": it.order}).eq("page_id", it.id).execute()
    except Exception as exc:
        logger.error("Reorder pages apply failed: %s", exc)
        raise HTTPException(status_code=503, detail="Sắp xếp lại thất bại.") from exc

    return Response(status_code=204)


# ─── Add / remove pages ──────────────────────────────────────────────────────

@router.post("/chapters/{chapter_id}/add-pages", response_model=ChapterResponse)
def add_pages_to_chapter(
    chapter_id: str,
    body: AddPagesRequest,
    user: AuthUser = Depends(get_current_user),
):
    chapter, series = _require_chapter(chapter_id, user.id)
    supabase = get_supabase()

    page_ids = list(dict.fromkeys(body.page_ids))  # dedupe, preserve order
    try:
        pages_res = (
            supabase.table("manga_pages")
            .select("page_id, user_id, chapter_id")
            .in_("page_id", page_ids)
            .execute()
        )
        pages = pages_res.data or []
    except Exception as exc:
        logger.error("Add pages lookup failed: %s", exc)
        raise HTTPException(status_code=503, detail="Không truy cập được trang.") from exc

    found_ids = {p["page_id"] for p in pages}
    missing = [pid for pid in page_ids if pid not in found_ids]
    if missing:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy trang: {missing}")

    for p in pages:
        if p.get("user_id") != user.id:
            raise HTTPException(status_code=403, detail="Có trang không thuộc về bạn.")

    # Determine starting page_number = max existing + 1
    try:
        existing_pages = (
            supabase.table("manga_pages")
            .select("page_number")
            .eq("chapter_id", chapter_id)
            .order("page_number", desc=True)
            .limit(1)
            .execute()
            .data
            or []
        )
        next_num = (existing_pages[0].get("page_number") or 0) + 1 if existing_pages else 1
    except Exception:
        next_num = 1

    try:
        for offset_, page_id in enumerate(page_ids):
            supabase.table("manga_pages").update(
                {"chapter_id": chapter_id, "page_number": next_num + offset_}
            ).eq("page_id", page_id).execute()

        supabase.table("manga_series").update({"updated_at": _now_iso()}).eq("series_id", series["series_id"]).execute()
    except Exception as exc:
        logger.error("Add pages apply failed: %s", exc)
        raise HTTPException(status_code=503, detail="Thêm trang thất bại.") from exc

    return _get_chapter_with_pages(chapter_id)


@router.delete("/chapters/{chapter_id}/pages/{page_id}", status_code=204, response_class=Response)
def remove_page_from_chapter(
    chapter_id: str,
    page_id: str,
    user: AuthUser = Depends(get_current_user),
) -> Response:
    """Remove a page from a chapter (chapter_id=NULL). The page itself is preserved."""
    chapter, series = _require_chapter(chapter_id, user.id)
    supabase = get_supabase()

    try:
        page_res = (
            supabase.table("manga_pages")
            .select("page_id, user_id, chapter_id")
            .eq("page_id", page_id)
            .maybe_single()
            .execute()
        )
        page = page_res.data if page_res else None
    except Exception as exc:
        logger.error("Page lookup failed: %s", exc)
        raise HTTPException(status_code=503, detail="Không truy cập được trang.") from exc

    if not page:
        raise HTTPException(status_code=404, detail="Không tìm thấy trang.")
    if page.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Truy cập bị từ chối.")
    if page.get("chapter_id") != chapter_id:
        raise HTTPException(status_code=400, detail="Trang không thuộc chương này.")

    try:
        supabase.table("manga_pages").update(
            {"chapter_id": None, "page_number": None}
        ).eq("page_id", page_id).execute()
        supabase.table("manga_series").update({"updated_at": _now_iso()}).eq("series_id", series["series_id"]).execute()
    except Exception as exc:
        logger.error("Remove page failed: %s", exc)
        raise HTTPException(status_code=503, detail="Gỡ trang thất bại.") from exc

    return Response(status_code=204)
