# Chapter Recap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a reader opens chapter N (N > 1) of a series in the series reader, automatically show a dismissible "Trước đó trong truyện…" card summarizing chapter N-1 — generated once by Gemini and cached in the DB.

**Architecture:** A new nullable `manga_chapters.recap_vi` column caches the summary. `services/rag.py` gains a small, testable function that reads the cache, and on a miss pulls the previous chapter's translated bubble text (ordered by page/position), summarizes it with the existing Gemini key pool, and writes the cache. A new `GET /v1/chapters/{chapter_id}/recap` endpoint (reusing the existing `_require_chapter` ownership check in `routers/series.py`) exposes it. The frontend calls this for the previous chapter whenever the reader lands on the first page of a new chapter, and renders a dismissible card (dismissal remembered per current chapter in localStorage, same pattern as existing mode-persistence keys).

**Tech Stack:** FastAPI + Supabase (Python backend), Next.js 16 / React 19 + TypeScript (frontend), Gemini via the existing `_GeminiPool` in `app/services/rag.py`, pytest for backend tests.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-09-chapter-recap-design.md` — follow it exactly; in particular:
  - Recap covers **only the immediately preceding chapter**, never "story so far".
  - Recap is generated **only when every page of the previous chapter has `status == "completed"`**.
  - Cache semantics on `manga_chapters.recap_vi`: `NULL` = not yet attempted, `""` = attempted, nothing to summarize (permanent, do not retry), non-empty string = cached recap.
  - A Gemini/DB failure during generation must **not** write to the cache (so a later request can retry) — this is different from the `""` case.
  - No credit is deducted for recap generation.
  - Feature is scoped to the series reader (`frontend/src/app/series/[id]/read/page.tsx`) only — not `/reader` or `/qa`.
- Follow existing repo conventions: business logic in `app/services/`, not routers (see `CLAUDE.md`); no `fetch()` directly in components — always via `src/lib/api.ts`; sharp corners / hard offset shadows / `var(--border)` design tokens, no rounded corners or gradients.

---

## Task 1: DB migration — `manga_chapters.recap_vi` cache column

**Files:**
- Create: `backend/supabase_migration_v8_recap.sql`

**Interfaces:**
- Produces: column `manga_chapters.recap_vi` (`text`, nullable) that Task 3 reads/writes.

- [ ] **Step 1: Write the migration file**

```sql
-- v8: Chapter recap cache
-- Caches an auto-generated Vietnamese summary of a chapter, shown to readers
-- when they open the NEXT chapter ("Trước đó trong truyện...").
--
-- NULL  = recap not yet attempted for this chapter.
-- ''    = attempted, but there was nothing to summarize (e.g. no translated
--         text yet) — permanent, do not retry automatically.
-- other = cached Vietnamese recap text.
ALTER TABLE manga_chapters ADD COLUMN IF NOT EXISTS recap_vi text;
```

- [ ] **Step 2: Apply it to your local/dev Supabase project**

Run the contents of `backend/supabase_migration_v8_recap.sql` in the Supabase SQL editor (or `psql`) for your dev project. There is no automated migration runner in this repo — migrations are applied by hand, in order (see `CLAUDE.md` migrations list).

- [ ] **Step 3: Commit**

```bash
git add backend/supabase_migration_v8_recap.sql
git commit -m "feat: add manga_chapters.recap_vi cache column for chapter recap"
```

---

## Task 2: Backend schema — `ChapterRecapResponse`

**Files:**
- Modify: `backend/app/models/schemas.py`

**Interfaces:**
- Produces: `ChapterRecapResponse { recap: Optional[str] }`, imported by Task 4's router.

- [ ] **Step 1: Add the model**

Add this right after the existing `QAStreamRequest` class (around line 188 of `backend/app/models/schemas.py`, before the `# ─── History ───` section comment):

```python
class ChapterRecapResponse(BaseModel):
    """Cached, auto-generated Vietnamese summary of the PREVIOUS chapter,
    shown when a reader opens the next one. `recap` is None when there is
    nothing to show (not yet generated, previous chapter incomplete, or
    generation failed)."""
    recap: Optional[str] = None
```

- [ ] **Step 2: Typecheck the backend imports**

Run: `cd backend && python -c "from app.models.schemas import ChapterRecapResponse; print(ChapterRecapResponse(recap=None))"`
Expected: prints `recap=None` with no import errors.

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/schemas.py
git commit -m "feat: add ChapterRecapResponse schema"
```

---

## Task 3: Backend service — recap generation + cache in `services/rag.py`

**Files:**
- Modify: `backend/app/services/rag.py`
- Create: `backend/tests/test_recap.py`

**Interfaces:**
- Consumes: `_pool` (module-level `_GeminiPool`), `get_supabase()`, `settings.GEMINI_MODEL`, `_latest_translation(translations: list[dict]) -> str` — all already defined earlier in `rag.py`.
- Produces: `get_or_generate_chapter_recap(chapter_id: str) -> str | None`, consumed by Task 4's router.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_recap.py`:

```python
"""Unit tests for chapter-recap generation/caching in `services/rag`.

Mirrors the FakeSupabase style used in `test_rag.py`: filter-agnostic fakes
where the test seeds exactly the rows relevant to that test.
"""
import os
from types import SimpleNamespace

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")

from app.services import rag  # noqa: E402


class _FakeQuery:
    def __init__(self, data, on_update=None):
        self._data = data
        self._on_update = on_update
        self._single = False

    def select(self, *a, **k):
        return self

    def eq(self, *a, **k):
        return self

    def in_(self, *a, **k):
        return self

    def order(self, *a, **k):
        return self

    def maybe_single(self):
        self._single = True
        return self

    def update(self, values):
        if self._on_update:
            self._on_update(values)
        return self

    def execute(self):
        if self._single:
            return SimpleNamespace(data=self._data[0] if self._data else None)
        return SimpleNamespace(data=self._data)


class FakeSupabase:
    def __init__(self, *, chapters=None, pages=None, bubbles=None):
        self.chapters = chapters or []
        self.pages = pages or []
        self.bubbles = bubbles or []
        self.updates: list[tuple[str, dict]] = []

    def table(self, name):
        if name == "manga_chapters":
            return _FakeQuery(
                self.chapters,
                on_update=lambda v: self.updates.append(("manga_chapters", v)),
            )
        if name == "manga_pages":
            return _FakeQuery(self.pages)
        if name == "bubble_data":
            return _FakeQuery(self.bubbles)
        return _FakeQuery([])


def test_cache_hit_returns_cached_text_without_generating(monkeypatch):
    fake = FakeSupabase(chapters=[{"chapter_id": "c1", "recap_vi": "Đã có sẵn"}])
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(
        rag, "_generate_recap_text", lambda ctx: (_ for _ in ()).throw(AssertionError("must not regenerate"))
    )

    assert rag.get_or_generate_chapter_recap("c1") == "Đã có sẵn"
    assert fake.updates == []


def test_cache_hit_empty_string_means_nothing_to_show(monkeypatch):
    fake = FakeSupabase(chapters=[{"chapter_id": "c1", "recap_vi": ""}])
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)

    assert rag.get_or_generate_chapter_recap("c1") is None
    assert fake.updates == []


def test_incomplete_chapter_returns_none_and_does_not_cache(monkeypatch):
    fake = FakeSupabase(
        chapters=[{"chapter_id": "c1", "recap_vi": None}],
        pages=[
            {"page_id": "p1", "status": "completed"},
            {"page_id": "p2", "status": "translating"},
        ],
    )
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)

    assert rag.get_or_generate_chapter_recap("c1") is None
    assert fake.updates == []


def test_generates_and_caches_when_all_pages_completed(monkeypatch):
    fake = FakeSupabase(
        chapters=[{"chapter_id": "c1", "recap_vi": None}],
        pages=[{"page_id": "p1", "status": "completed"}],
        bubbles=[
            {
                "page_id": "p1", "x": 0, "y": 0,
                "translation_history": [{"translated_text_vi": "Xin chào", "translated_at": "2026-01-01"}],
            },
        ],
    )
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    captured = {}

    def _fake_generate(context):
        captured["context"] = context
        return "Chương trước: nhân vật chào nhau."

    monkeypatch.setattr(rag, "_generate_recap_text", _fake_generate)

    result = rag.get_or_generate_chapter_recap("c1")

    assert result == "Chương trước: nhân vật chào nhau."
    assert "Xin chào" in captured["context"]
    assert fake.updates == [("manga_chapters", {"recap_vi": "Chương trước: nhân vật chào nhau."})]


def test_no_translated_content_caches_empty_and_returns_none(monkeypatch):
    fake = FakeSupabase(
        chapters=[{"chapter_id": "c1", "recap_vi": None}],
        pages=[{"page_id": "p1", "status": "completed"}],
        bubbles=[],  # nothing translated
    )
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(
        rag, "_generate_recap_text", lambda ctx: (_ for _ in ()).throw(AssertionError("must not call Gemini"))
    )

    assert rag.get_or_generate_chapter_recap("c1") is None
    assert fake.updates == [("manga_chapters", {"recap_vi": ""})]


def test_generation_failure_does_not_cache(monkeypatch):
    fake = FakeSupabase(
        chapters=[{"chapter_id": "c1", "recap_vi": None}],
        pages=[{"page_id": "p1", "status": "completed"}],
        bubbles=[
            {
                "page_id": "p1", "x": 0, "y": 0,
                "translation_history": [{"translated_text_vi": "Xin chào", "translated_at": "2026-01-01"}],
            },
        ],
    )
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(rag, "_generate_recap_text", lambda ctx: None)  # Gemini failed

    assert rag.get_or_generate_chapter_recap("c1") is None
    assert fake.updates == []  # transient failure — must be retryable, so no cache write
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_recap.py -v`
Expected: `ModuleNotFoundError`/`AttributeError` — `get_or_generate_chapter_recap` and `_generate_recap_text` don't exist yet on `rag`.

- [ ] **Step 3: Implement the recap functions in `services/rag.py`**

Add this block at the end of `backend/app/services/rag.py` (after the existing `answer_question_stream` function, i.e. append to the file):

```python
# ─── Chapter recap ("Trước đó trong truyện...") ───────────────────────────────

_RECAP_PROMPT = """Bạn tóm tắt lại một chương truyện manga đã dịch, để người đọc \
nhớ lại nội dung trước khi đọc chương tiếp theo.
Chỉ dựa trên nội dung dưới đây, viết 2-4 câu tiếng Việt, tự nhiên, không dùng \
markdown, không thêm suy đoán ngoài nội dung.

--- NỘI DUNG CHƯƠNG ---
{context}
-----------------------

Tóm tắt:"""

_RECAP_CONTEXT_MAX_CHARS = 8000


def _chapter_translation_context(supabase, chapter_id: str) -> str:
    """Ordered translated text for every page of a chapter (position order)."""
    try:
        pages_res = (
            supabase.table("manga_pages")
            .select("page_id, page_number")
            .eq("chapter_id", chapter_id)
            .order("page_number", desc=False)
            .execute()
        )
    except Exception as exc:
        logger.error("Recap: failed to list pages for chapter %s: %s", chapter_id, exc)
        return ""

    page_ids = [p["page_id"] for p in (pages_res.data or []) if isinstance(p, dict) and p.get("page_id")]
    if not page_ids:
        return ""

    try:
        bubbles_res = (
            supabase.table("bubble_data")
            .select("page_id, x, y, translation_history(translated_text_vi, translated_at)")
            .in_("page_id", page_ids)
            .execute()
        )
    except Exception as exc:
        logger.error("Recap: failed to load bubbles for chapter %s: %s", chapter_id, exc)
        return ""

    page_order = {pid: i for i, pid in enumerate(page_ids)}
    rows = [r for r in (bubbles_res.data or []) if isinstance(r, dict)]
    try:
        rows.sort(key=lambda r: (page_order.get(r.get("page_id"), 0), r.get("y") or 0, r.get("x") or 0))
    except Exception:
        pass

    lines = [
        _latest_translation(row.get("translation_history") or []).strip()
        for row in rows
    ]
    context = "\n".join(line for line in lines if line)
    return context[:_RECAP_CONTEXT_MAX_CHARS]


def _all_pages_completed(supabase, chapter_id: str) -> bool:
    try:
        res = (
            supabase.table("manga_pages")
            .select("page_id, status")
            .eq("chapter_id", chapter_id)
            .execute()
        )
    except Exception as exc:
        logger.error("Recap: failed to check page statuses for chapter %s: %s", chapter_id, exc)
        return False
    rows = res.data or []
    if not rows:
        return False
    return all(isinstance(r, dict) and r.get("status") == "completed" for r in rows)


def _generate_recap_text(context: str) -> str | None:
    """Returns the recap text, or None if Gemini is unavailable/fails
    (a transient condition — caller must NOT cache None)."""
    if not _pool.available:
        logger.warning("Recap generation skipped: Gemini pool unavailable.")
        return None
    client = _pool.next_client()
    if client is None:
        return None
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=_RECAP_PROMPT.format(context=context),
        )
        text = (response.text or "").strip()
        return text or None
    except Exception as exc:
        logger.warning("Recap generation failed: %s", exc)
        return None


def _cache_recap(supabase, chapter_id: str, recap_vi: str) -> None:
    try:
        supabase.table("manga_chapters").update({"recap_vi": recap_vi}).eq("chapter_id", chapter_id).execute()
    except Exception as exc:
        logger.warning("Recap: failed to cache recap for chapter %s: %s", chapter_id, exc)


def get_or_generate_chapter_recap(chapter_id: str) -> str | None:
    """
    Ownership must already be enforced by the caller (the router uses
    `_require_chapter`). Returns the cached recap (None if cached as "" —
    meaning 'nothing to summarize'), or generates + caches it on a miss.
    Returns None on any failure without caching, so a later call can retry.
    """
    supabase = get_supabase()

    try:
        res = (
            supabase.table("manga_chapters")
            .select("recap_vi")
            .eq("chapter_id", chapter_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.error("Recap: failed to read cache for chapter %s: %s", chapter_id, exc)
        return None

    row = res.data if res else None
    cached = row.get("recap_vi") if row else None
    if cached is not None:
        return cached or None

    if not _all_pages_completed(supabase, chapter_id):
        return None

    context = _chapter_translation_context(supabase, chapter_id)
    if not context.strip():
        _cache_recap(supabase, chapter_id, "")
        return None

    recap = _generate_recap_text(context)
    if recap is None:
        return None  # transient Gemini failure — do not cache, allow retry

    _cache_recap(supabase, chapter_id, recap)
    return recap
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_recap.py -v`
Expected: all 6 tests `PASS`.

- [ ] **Step 5: Run the full backend suite to check nothing broke**

Run: `cd backend && python -m pytest -q`
Expected: all tests pass (existing `test_rag.py` etc. unaffected — this only appends new module-level functions).

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/rag.py backend/tests/test_recap.py
git commit -m "feat: add chapter recap generation + cache to services/rag"
```

---

## Task 4: Backend endpoint — `GET /chapters/{chapter_id}/recap`

**Files:**
- Modify: `backend/app/routers/series.py`

**Interfaces:**
- Consumes: `_require_chapter(chapter_id: str, user_id: str) -> tuple[dict, dict]` (existing, `series.py:106`), `get_or_generate_chapter_recap(chapter_id: str) -> str | None` (Task 3), `ChapterRecapResponse` (Task 2), `get_current_user` / `AuthUser` (existing imports).
- Produces: `GET /v1/chapters/{chapter_id}/recap` → `{"recap": str | None}`, consumed by Task 5's frontend client.

- [ ] **Step 1: Add the import**

In `backend/app/routers/series.py`, extend the existing `from app.models.schemas import (...)` block (around line 22) to include `ChapterRecapResponse`:

```python
from app.models.schemas import (
    AddPagesRequest,
    ChapterCreate,
    ChapterPage,
    ChapterRecapResponse,
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
```

Also add, right below the existing imports block:

```python
from app.services.rag import get_or_generate_chapter_recap
```

- [ ] **Step 2: Add the endpoint**

Append to the end of `backend/app/routers/series.py` (after `export_chapter_zip`, i.e. after the file's current last line):

```python


@router.get("/chapters/{chapter_id}/recap", response_model=ChapterRecapResponse)
def get_chapter_recap(chapter_id: str, user: AuthUser = Depends(get_current_user)):
    """
    Auto-generated, cached Vietnamese summary of THIS chapter — the frontend
    calls this for the PREVIOUS chapter when a reader opens the next one
    ("Trước đó trong truyện..."). Returns {"recap": null} if not ready yet
    (chapter incomplete, nothing translated, or generation failed) — this is
    a best-effort reading aid, not an error condition.
    """
    _require_chapter(chapter_id, user.id)
    recap = get_or_generate_chapter_recap(chapter_id)
    return ChapterRecapResponse(recap=recap)
```

- [ ] **Step 3: Sanity-check the app still imports and the route is registered**

Run:
```bash
cd backend && python -c "
from app.main import app
paths = [r.path for r in app.routes]
assert '/v1/chapters/{chapter_id}/recap' in paths, paths
print('OK: recap route registered')
"
```
Expected: `OK: recap route registered`.

- [ ] **Step 4: Run the full backend test suite**

Run: `cd backend && python -m pytest -q`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/series.py
git commit -m "feat: add GET /chapters/{chapter_id}/recap endpoint"
```

---

## Task 5: Frontend API client — `getChapterRecap`

**Files:**
- Modify: `frontend/src/lib/api.ts`

**Interfaces:**
- Consumes: `request<T>(path: string, options?: RequestInit): Promise<T>` (existing generic fetch wrapper, `api.ts:163`).
- Produces: `getChapterRecap(chapterId: string): Promise<{ recap: string | null }>`, consumed by Task 6.

- [ ] **Step 1: Add the function and type**

In `frontend/src/lib/api.ts`, add right after the existing `getSeriesFull` function (around line 1109):

```typescript
export interface ChapterRecapResponse {
  recap: string | null;
}

export async function getChapterRecap(chapterId: string): Promise<ChapterRecapResponse> {
  return request<ChapterRecapResponse>(`/chapters/${chapterId}/recap`);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no NEW errors introduced (the repo has a few pre-existing unrelated errors — e.g. `@sentry/nextjs` types, `pdfjs-dist` — confirm the error count/list is unchanged from before this edit).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add getChapterRecap API client function"
```

---

## Task 6: Frontend wiring — recap card in the series reader

**Files:**
- Modify: `frontend/src/app/series/[id]/read/page.tsx`

**Interfaces:**
- Consumes: `getChapterRecap(chapterId: string): Promise<{ recap: string | null }>` (Task 5), existing state (`series: SeriesDetail | null`, `flatPages: FlatPage[]`, `index: number`, `current: FlatPage`), existing `Icon` component (`<Icon name="x" size={...} />` pattern already used in `QAChatPanel.tsx`).
- Produces: nothing consumed elsewhere — this is the leaf UI.

- [ ] **Step 1: Add recap state**

In `SeriesReadInner`, near the other `useState` declarations (around line 208, right after the `highlight` state), add:

```typescript
  // "Trước đó trong truyện...": recap of the PREVIOUS chapter, shown when
  // landing on the first page of a new chapter (dismissible, remembered per
  // current chapter in localStorage).
  const [recap, setRecap] = useState<{ chapterId: string; text: string } | null>(null);
```

- [ ] **Step 2: Add the fetch effect**

Add this effect after the `flatPages` / `current` derivations (right after the block ending `const currentBubbles = currentDetail?.processed_data ?? [];` around line 296):

```typescript
  useEffect(() => {
    setRecap(null);
    if (!series || !current || current.chapter_number <= 1) return;

    const isFirstPageOfChapter = flatPages[index - 1]?.chapter_id !== current.chapter_id;
    if (!isFirstPageOfChapter) return;

    const prevChapter = series.chapters.find(c => c.chapter_number === current.chapter_number - 1);
    if (!prevChapter) return;

    const dismissKey = `storylens.recap-dismissed.${current.chapter_id}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(dismissKey)) return;

    let cancelled = false;
    getChapterRecap(prevChapter.chapter_id)
      .then(res => {
        if (!cancelled && res.recap) {
          setRecap({ chapterId: current.chapter_id, text: res.recap });
        }
      })
      .catch(() => {
        // Best-effort reading aid — silent failure, no toast.
      });
    return () => {
      cancelled = true;
    };
  }, [series, current, flatPages, index]);

  const dismissRecap = useCallback(() => {
    if (recap && typeof window !== "undefined") {
      window.localStorage.setItem(`storylens.recap-dismissed.${recap.chapterId}`, "1");
    }
    setRecap(null);
  }, [recap]);
```

- [ ] **Step 3: Add the `getChapterRecap` import**

In the existing `import { ... } from "@/lib/api";` block at the top of the file, add `getChapterRecap` to the named imports.

- [ ] **Step 4: Render the card**

Insert this right after the view-mode toolbar block and before the `{loading ? (` conditional (i.e. right after the closing `)}` at line 696, before line 698's `{loading ? (`):

```typescript
          {recap && recap.chapterId === current?.chapter_id && (
            <div
              className="stroke-ink"
              style={{
                background: "var(--panel)",
                boxShadow: "4px 4px 0 0 var(--border)",
                padding: "12px 14px",
                marginBottom: 12,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: 1 }}>
                <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 4 }}>
                  Trước đó trong truyện…
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--fg)" }}>{recap.text}</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={dismissRecap}
                aria-label="Đóng tóm tắt"
                style={{ padding: 4, flexShrink: 0 }}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          )}
```

- [ ] **Step 5: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no NEW errors introduced versus the pre-existing baseline (Sentry types / pdfjs-dist / the unrelated `PageData` union error at `page.tsx:334` are pre-existing — confirm the error list is otherwise unchanged).

- [ ] **Step 6: Manual verify**

With the backend + AI module running and a series that has ≥ 2 fully-translated chapters:
1. Open `series/<id>/read`, jump to chapter 1's last page, go to chapter 2's first page (or use the chapter dropdown).
2. Confirm the "Trước đó trong truyện…" card appears above the toolbar/page area with a 2-4 sentence Vietnamese summary of chapter 1.
3. Click the `x` to dismiss it; reload the page on chapter 2 — confirm it does NOT reappear.
4. Clear `localStorage` (or open in a private window) and reopen chapter 2 — confirm the card reappears with the *same* text (served from the DB cache — check backend logs to confirm Gemini was not called a second time).
5. Open chapter 1 (the first chapter) — confirm no card appears (no previous chapter).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/series/\[id\]/read/page.tsx
git commit -m "feat: show previous-chapter recap card in the series reader"
```

---

## Self-Review Notes

- **Spec coverage:** all 5 "kết quả mong muốn" rows in the spec map to tasks —
  auto-show on chapter open (Task 6 Step 2/4), previous-chapter-only scope
  (Task 3's `_chapter_translation_context` + Task 6's `chapter_number - 1`
  lookup), DB cache (Task 1 + Task 3's `_cache_recap`), dismissible per-chapter
  (Task 6 Step 2's `dismissRecap` + localStorage key), silent degrade on any
  failure (Task 3's `None`-returning branches + Task 6's `.catch(() => {})`).
- **Type consistency:** `get_or_generate_chapter_recap(chapter_id: str) -> str | None`
  (Task 3) is called identically in Task 4's router; `ChapterRecapResponse.recap`
  (Task 2) matches the JSON shape `getChapterRecap` (Task 5) expects; frontend
  `recap` state shape `{ chapterId, text }` (Task 6) is internal to that task,
  not shared elsewhere — no drift found.
- **No placeholders:** every step has complete, runnable code — confirmed on
  re-read.

