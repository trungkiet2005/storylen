# Chapter Recap Video — Frontend Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the already-complete backend "video recap" feature
(`POST /narrate/recap/{chapter_id}`, `services/recap_video.py`) into the
frontend: expose its credit cost up front, add a "Cả chương" tab to the
existing `ListenMode` drawer, and mount `ListenMode` into the series reader
(which currently has no Listen Mode at all).

**Architecture:** Two small backend additions (typed response for the recap
endpoint, credit/limit fields on the existing `/narrate/voices` response) plus
one frontend component restructure (`ListenMode.tsx` gains a tab switcher) and
one new mount point (`series/[id]/read/page.tsx`). No new backend
job/polling — the recap endpoint stays synchronous; the frontend shows a
spinner with a "this may take a few minutes" note instead.

**Tech Stack:** FastAPI + Pydantic (backend), Next.js 16.2.6 / React 19 +
TypeScript (frontend), pytest + respx (backend tests), Vitest + React Testing
Library (frontend tests).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-09-chapter-recap-video-design.md` —
  follow it exactly; in particular:
  - No new background job/polling for recap — synchronous request + spinner UX only.
  - `/reader` (single-page reader) must keep working unchanged — it has no
    `chapterId`, so the "Cả chương" tab must not render there at all.
  - Cost line must show **before** the user commits to generating (page count ×
    `credit_cost_per_page`), not after.
  - Reuse the existing engine/voice pickers for both tabs — do not duplicate them.
- Repo conventions (`CLAUDE.md`): business logic in `app/services/`, not
  routers; no `fetch()` directly in frontend components — always via
  `src/lib/api.ts`; sharp corners / hard offset shadows / 2px borders design
  language, no rounded corners or gradients; App Router only.
- Next.js 16.2.6 + React 19 — this is not the Next.js of most training data;
  if a step touches page/layout APIs beyond what's shown here, check
  `frontend/AGENTS.md` first.
- Backend venv lives at `backend/.venv` (not the global `python`) — every
  backend command below is run through it.
- Do **not** touch the `worktree-chapter-recap` branch/worktree
  (`.claude/worktrees/chapter-recap`) — that is the unrelated TEXT recap card
  feature. This plan's work happens on the main worktree (`d:\storylen`,
  branch `main`).

---

## Task 1: Backend schema — `RecapVideoResponse` + credit fields on `VoicesResponse`

**Files:**
- Modify: `backend/app/models/schemas.py:352-354` (`VoicesResponse`)
- Modify: `backend/app/models/schemas.py` (add `RecapVideoResponse` after `ChapterNarrationStatusResponse`, currently ending at line 369)

**Interfaces:**
- Consumes: nothing new.
- Produces: `VoicesResponse.credit_cost_per_page: int`,
  `VoicesResponse.max_chapter_pages: int`, and
  `RecapVideoResponse { chapter_id: str, video_url: str }`, both consumed by
  Task 2's router changes.

- [ ] **Step 1: Add the fields and model**

In `backend/app/models/schemas.py`, replace:

```python
class VoicesResponse(BaseModel):
    default_engine: str
    engines: list[TTSEngineInfo] = []
```

with:

```python
class VoicesResponse(BaseModel):
    default_engine: str
    engines: list[TTSEngineInfo] = []
    credit_cost_per_page: int = 1
    max_chapter_pages: int = 60
```

Then, right after `ChapterNarrationStatusResponse` (the class ending
`error: Optional[str] = None` / `segments: list[...] = []` around line 369 —
i.e. append after that class, still inside the
`# ─── Narration / Listen mode ───` section), add:

```python


class RecapVideoResponse(BaseModel):
    """A rendered, narrated recap video (.mp4) for one chapter."""
    chapter_id: str
    video_url: str
```

- [ ] **Step 2: Sanity-check the models import and construct**

Run:
```bash
cd backend && .venv/Scripts/python.exe -c "
from app.models.schemas import VoicesResponse, RecapVideoResponse
v = VoicesResponse(default_engine='edge')
print(v.credit_cost_per_page, v.max_chapter_pages)
print(RecapVideoResponse(chapter_id='c1', video_url='https://x/y.mp4'))
"
```
Expected: prints `1 60` then `chapter_id='c1' video_url='https://x/y.mp4'`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/schemas.py
git commit -m "feat(narration): add RecapVideoResponse + credit/limit fields on VoicesResponse"
```

---

## Task 2: Backend router — populate the new fields, type the recap response

**Files:**
- Modify: `backend/app/routers/narration.py:22-28` (import block)
- Modify: `backend/app/routers/narration.py:59-65` (`list_voices`)
- Modify: `backend/app/routers/narration.py:175-222` (`recap_chapter`)
- Test: `backend/tests/test_narration_router.py`

**Interfaces:**
- Consumes: `VoicesResponse`, `RecapVideoResponse` (Task 1),
  `get_settings().NARRATION_CREDIT_COST` / `.NARRATION_MAX_CHAPTER_PAGES`
  (existing, `backend/app/config.py:166-167`).
- Produces: `GET /v1/narrate/voices` response now includes
  `credit_cost_per_page` / `max_chapter_pages`; `POST /v1/narrate/recap/{chapter_id}`
  now validates against `RecapVideoResponse` — consumed by Task 4's frontend client.

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/test_narration_router.py`, right after
`test_voices_lists_engines` (after its closing `assert` line, before the
`test_voices_requires_auth` function):

```python
def test_voices_includes_credit_and_page_limit(client):
    resp = client.get("/v1/narrate/voices")
    assert resp.status_code == 200
    body = resp.json()
    assert body["credit_cost_per_page"] == narration_router.get_settings().NARRATION_CREDIT_COST
    assert body["max_chapter_pages"] == narration_router.get_settings().NARRATION_MAX_CHAPTER_PAGES
```

Add a new section at the end of the file (after `test_chapter_status_missing_returns_404`):

```python


# ─── /recap ──────────────────────────────────────────────────────────────────

def test_recap_chapter_success(client, monkeypatch):
    monkeypatch.setattr(
        narration_service, "list_chapter_pages",
        lambda supabase, cid, uid: [{"page_id": "p1"}, {"page_id": "p2"}],
    )
    from app.services import recap_video

    monkeypatch.setattr(recap_video, "ffmpeg_available", lambda: True)
    monkeypatch.setattr(narration_router.recap_video, "ffmpeg_available", lambda: True, raising=False)
    monkeypatch.setattr(
        recap_video, "build_chapter_recap",
        lambda *a, **k: "https://storage/manga-audio/c1-recap.mp4",
    )
    resp = client.post("/v1/narrate/recap/c1", json={"engine": "edge"})
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"chapter_id": "c1", "video_url": "https://storage/manga-audio/c1-recap.mp4"}


def test_recap_chapter_no_ffmpeg_returns_503(client, monkeypatch):
    monkeypatch.setattr(
        narration_service, "list_chapter_pages",
        lambda supabase, cid, uid: [{"page_id": "p1"}],
    )
    from app.services import recap_video

    monkeypatch.setattr(recap_video, "ffmpeg_available", lambda: False)
    resp = client.post("/v1/narrate/recap/c1", json={})
    assert resp.status_code == 503


def test_recap_chapter_empty_returns_404(client, monkeypatch):
    monkeypatch.setattr(narration_service, "list_chapter_pages", lambda *a, **k: [])
    resp = client.post("/v1/narrate/recap/c1", json={})
    assert resp.status_code == 404


def test_recap_chapter_too_many_pages_returns_400(client, monkeypatch):
    monkeypatch.setattr(
        narration_service, "list_chapter_pages",
        lambda supabase, cid, uid: [{"page_id": f"p{i}"} for i in range(100)],
    )
    from app.services import recap_video

    monkeypatch.setattr(recap_video, "ffmpeg_available", lambda: True)
    resp = client.post("/v1/narrate/recap/c1", json={})
    assert resp.status_code == 400


def test_recap_chapter_render_error_maps_to_502(client, monkeypatch):
    monkeypatch.setattr(
        narration_service, "list_chapter_pages",
        lambda supabase, cid, uid: [{"page_id": "p1"}],
    )
    from app.services import recap_video

    monkeypatch.setattr(recap_video, "ffmpeg_available", lambda: True)

    def boom(*a, **k):
        raise recap_video.RecapError("ffmpeg exploded")

    monkeypatch.setattr(recap_video, "build_chapter_recap", boom)
    resp = client.post("/v1/narrate/recap/c1", json={})
    assert resp.status_code == 502
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_narration_router.py -k "credit_and_page_limit or recap_chapter" -v`
Expected: `test_voices_includes_credit_and_page_limit` FAILs (`KeyError`/`assert None == 1`
— field doesn't exist yet), and the 5 new `recap_chapter` tests FAIL
(`AttributeError: module 'app.routers.narration' has no attribute 'recap_video'`
— the router currently does a local `from app.services import recap_video`
inside the function, not a module-level import, so `monkeypatch.setattr(narration_router.recap_video, ...)` fails; this also confirms Step 3 needs to hoist the import).

- [ ] **Step 3: Implement the router changes**

In `backend/app/routers/narration.py`, add `recap_video` to the module-level
imports (so tests can `monkeypatch.setattr(narration_router.recap_video, ...)`)
and add `RecapVideoResponse` to the schema import. Replace:

```python
from app.models.schemas import (
    ChapterNarrateResponse,
    ChapterNarrationStatusResponse,
    NarrateRequest,
    NarrationResponse,
    VoicesResponse,
)
from app.rate_limit import limiter
from app.routers.auth import AuthUser, get_current_user
from app.services import narration
from app.services.credit_service import check_has_credits, deduct
from app.services.tts import registry as tts_registry
```

with:

```python
from app.models.schemas import (
    ChapterNarrateResponse,
    ChapterNarrationStatusResponse,
    NarrateRequest,
    NarrationResponse,
    RecapVideoResponse,
    VoicesResponse,
)
from app.rate_limit import limiter
from app.routers.auth import AuthUser, get_current_user
from app.services import narration, recap_video
from app.services.credit_service import check_has_credits, deduct
from app.services.tts import registry as tts_registry
```

Replace `list_voices`:

```python
@router.get("/voices", response_model=VoicesResponse)
def list_voices(user: AuthUser = Depends(get_current_user)):
    """List available TTS engines and their voices so the reader can offer a picker."""
    return VoicesResponse(
        default_engine=tts_registry.default_engine(),
        engines=tts_registry.describe_engines(),
    )
```

with:

```python
@router.get("/voices", response_model=VoicesResponse)
def list_voices(user: AuthUser = Depends(get_current_user)):
    """List available TTS engines and their voices so the reader can offer a picker."""
    settings = get_settings()
    return VoicesResponse(
        default_engine=tts_registry.default_engine(),
        engines=tts_registry.describe_engines(),
        credit_cost_per_page=settings.NARRATION_CREDIT_COST,
        max_chapter_pages=settings.NARRATION_MAX_CHAPTER_PAGES,
    )
```

Replace the `recap_chapter` function body's local import and return, i.e. replace:

```python
@router.post("/recap/{chapter_id}")
@limiter.limit(lambda: get_settings().RATE_LIMIT_NARRATE)
def recap_chapter(
    request: Request,
    chapter_id: str,
    payload: NarrateRequest | None = None,
    user: AuthUser = Depends(get_current_user),
):
    """Render a narrated recap video (.mp4) for a chapter. Needs ffmpeg on the host."""
    _ensure_enabled()
    payload = payload or NarrateRequest()
    supabase = get_supabase()
    settings = get_settings()

    from app.services import recap_video

    if not recap_video.ffmpeg_available():
```

with:

```python
@router.post("/recap/{chapter_id}", response_model=RecapVideoResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_NARRATE)
def recap_chapter(
    request: Request,
    chapter_id: str,
    payload: NarrateRequest | None = None,
    user: AuthUser = Depends(get_current_user),
):
    """Render a narrated recap video (.mp4) for a chapter. Needs ffmpeg on the host."""
    _ensure_enabled()
    payload = payload or NarrateRequest()
    supabase = get_supabase()
    settings = get_settings()

    if not recap_video.ffmpeg_available():
```

And replace the function's final `return`:

```python
    return {"chapter_id": chapter_id, "video_url": video_url}
```

with:

```python
    return RecapVideoResponse(chapter_id=chapter_id, video_url=video_url)
```

- [ ] **Step 4: Remove the now-redundant test patch line**

The test written in Step 1 has a belt-and-suspenders line
`monkeypatch.setattr(narration_router.recap_video, "ffmpeg_available", lambda: True, raising=False)`
immediately after patching `recap_video.ffmpeg_available` directly — since
`narration_router.recap_video` is now the same module object as `recap_video`
(Step 3 made it a module-level import), patching the module directly is
sufficient and the router-attribute patch is redundant but harmless. Leave it
as-is; no change needed.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_narration_router.py -v`
Expected: all tests PASS (existing 12 + 1 voices test + 5 recap tests = 18).

- [ ] **Step 6: Run the full backend suite to check nothing broke**

Run: `cd backend && .venv/Scripts/python.exe -m pytest -q`
Expected: no new failures versus the pre-existing baseline (narration router
tests that depend on real network, if any were already failing before this
task in your environment, remain the only failures — compare against a `git
stash` run if unsure).

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/narration.py backend/tests/test_narration_router.py
git commit -m "feat(narration): type the recap endpoint response, expose credit cost + page limit on /voices"
```

---

## Task 3: Frontend API client — `getChapterRecapVideo` + extended `VoicesResponse`

**Files:**
- Modify: `frontend/src/lib/api.ts:989-992` (`VoicesResponse` interface)
- Modify: `frontend/src/lib/api.ts` (add `getChapterRecapVideo` after `getChapterNarrationStatus`, currently ending at line 1062)

**Interfaces:**
- Consumes: `request<T>(path: string, options?: RequestInit): Promise<T>` (existing).
- Produces: `VoicesResponse.credit_cost_per_page: number`,
  `VoicesResponse.max_chapter_pages: number`,
  `getChapterRecapVideo(chapterId: string, options?: NarrateOptions): Promise<RecapVideoResponse>`
  where `RecapVideoResponse { chapter_id: string; video_url: string }` —
  consumed by Task 4's `ListenMode.tsx`.

- [ ] **Step 1: Extend `VoicesResponse` and add the client function + type**

In `frontend/src/lib/api.ts`, replace:

```typescript
export interface VoicesResponse {
  default_engine: string;
  engines: TTSEngineInfo[];
}
```

with:

```typescript
export interface VoicesResponse {
  default_engine: string;
  engines: TTSEngineInfo[];
  credit_cost_per_page: number;
  max_chapter_pages: number;
}
```

Right after `getChapterNarrationStatus` (after its closing `}`, before the
`// ─── History ───` comment), add:

```typescript

export interface RecapVideoResponse {
  chapter_id: string;
  video_url: string;
}

/** Render a narrated recap video (.mp4) for a whole chapter. Synchronous —
 * may take a while for long chapters; the caller should show a spinner. */
export async function getChapterRecapVideo(
  chapterId: string,
  options: NarrateOptions = {},
): Promise<RecapVideoResponse> {
  return request<RecapVideoResponse>(`/narrate/recap/${chapterId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no NEW errors versus the pre-existing baseline (Sentry types /
pdfjs-dist / the `PageData` union error — confirm the error list is
otherwise unchanged).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(narration): add getChapterRecapVideo API client + extend VoicesResponse"
```

---

## Task 4: `ListenMode.tsx` — add the "Cả chương" tab and recap-video UI

**Files:**
- Modify: `frontend/src/components/ListenMode.tsx` (full-file rewrite — the
  component gains a tab switcher, see rationale below)
- Test: `frontend/__tests__/components/ListenMode.test.tsx`

**Interfaces:**
- Consumes: `getChapterRecapVideo(chapterId, options): Promise<RecapVideoResponse>`,
  extended `VoicesResponse` (both Task 3), existing `listVoices`, `narratePage`,
  `APIError`, `TTSEngineInfo` (unchanged).
- Produces: `<ListenMode pageId chapterId? chapterPageCount? compact? />` —
  when `chapterId` is omitted (as in `/reader` today), the component renders
  and behaves **exactly** as it does now (verified by the existing, unmodified
  tests in `ListenMode.test.tsx` still passing). Consumed by Task 5's series
  reader mount.

The tab switcher is enough new state and rendering logic (tab state, a second
result type, a second generate handler, conditional cost/limit display) that
patching in place would be harder to get right than replacing the file
wholesale. The file stays single-purpose per drawer, just with two
mutually-exclusive content panes.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/__tests__/components/ListenMode.test.tsx`. First, extend the
mocked API module (replace the existing `vi.mock` block):

```typescript
vi.mock("@/lib/api", () => {
  class APIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    APIError,
    listVoices: vi.fn(),
    narratePage: vi.fn(),
    getChapterRecapVideo: vi.fn(),
  };
});
```

Then replace the import line:

```typescript
import { ListenMode } from "@/components/ListenMode";
import { listVoices, narratePage, APIError } from "@/lib/api";
```

with:

```typescript
import { ListenMode } from "@/components/ListenMode";
import { listVoices, narratePage, getChapterRecapVideo, APIError } from "@/lib/api";
```

and:

```typescript
const mockListVoices = vi.mocked(listVoices);
const mockNarrate = vi.mocked(narratePage);
```

with:

```typescript
const mockListVoices = vi.mocked(listVoices);
const mockNarrate = vi.mocked(narratePage);
const mockRecapVideo = vi.mocked(getChapterRecapVideo);
```

Extend `VOICES` (replace the whole constant) to include the new fields:

```typescript
const VOICES = {
  default_engine: "edge",
  credit_cost_per_page: 1,
  max_chapter_pages: 60,
  engines: [
    {
      engine: "edge",
      available: true,
      is_default: true,
      voices: [
        { id: "vi-VN-HoaiMyNeural", label: "Hoài My (nữ, VN)", locale: "vi-VN", gender: "Female" },
        { id: "vi-VN-NamMinhNeural", label: "Nam Minh (nam, VN)", locale: "vi-VN", gender: "Male" },
      ],
    },
    { engine: "coqui", available: false, is_default: false, voices: [] },
  ],
};
```

Add a reset for the new mock in `beforeEach` (replace the block):

```typescript
beforeEach(() => {
  mockListVoices.mockReset();
  mockNarrate.mockReset();
  mockRecapVideo.mockReset();
  mockListVoices.mockResolvedValue(VOICES as never);
  mockNarrate.mockResolvedValue(NARRATION as never);
});
```

Finally, add a new `describe` block at the end of the file (after the closing
`});` of the existing `describe("ListenMode", ...)` block):

```typescript

describe("ListenMode — chapter recap tab", () => {
  it("does not show a chapter tab when chapterId is not provided", async () => {
    render(<ListenMode pageId="p1" />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    await screen.findByTestId("listen-mode-panel");
    expect(screen.queryByTestId("listen-tab-chapter")).toBeNull();
  });

  it("shows both tabs when chapterId is provided, defaulting to the page tab", async () => {
    render(<ListenMode pageId="p1" chapterId="c1" chapterPageCount={5} />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    await screen.findByTestId("listen-tab-chapter");
    expect(screen.getByTestId("listen-generate")).toBeTruthy();
    expect(screen.queryByTestId("listen-recap-generate")).toBeNull();
  });

  it("shows the credit cost before generating and calls getChapterRecapVideo on click", async () => {
    mockRecapVideo.mockResolvedValue({ chapter_id: "c1", video_url: "https://video.example.com/c1.mp4" } as never);
    render(<ListenMode pageId="p1" chapterId="c1" chapterPageCount={5} />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    fireEvent.click(await screen.findByTestId("listen-tab-chapter"));

    const cost = await screen.findByTestId("listen-recap-cost");
    expect(cost.textContent).toContain("5");

    fireEvent.click(screen.getByTestId("listen-recap-generate"));
    await waitFor(() => expect(mockRecapVideo).toHaveBeenCalledWith("c1", expect.objectContaining({ engine: "edge" })));
    const video = (await screen.findByTestId("listen-recap-video")) as HTMLVideoElement;
    expect(video.getAttribute("src")).toBe("https://video.example.com/c1.mp4");
    expect(screen.getByTestId("listen-recap-download")).toBeTruthy();
  });

  it("disables the recap button and warns when the chapter exceeds the page limit", async () => {
    render(<ListenMode pageId="p1" chapterId="c1" chapterPageCount={999} />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    fireEvent.click(await screen.findByTestId("listen-tab-chapter"));
    const btn = (await screen.findByTestId("listen-recap-generate")) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("surfaces a recap generation error", async () => {
    mockRecapVideo.mockRejectedValue(new APIError(503, "Xuất video recap chưa khả dụng trên máy chủ này (thiếu ffmpeg)."));
    render(<ListenMode pageId="p1" chapterId="c1" chapterPageCount={5} />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    fireEvent.click(await screen.findByTestId("listen-tab-chapter"));
    fireEvent.click(await screen.findByTestId("listen-recap-generate"));
    const err = await screen.findByTestId("listen-error");
    expect(err.textContent).toContain("ffmpeg");
  });
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `cd frontend && npx vitest run __tests__/components/ListenMode.test.tsx`
Expected: the 8 pre-existing tests still PASS; the 5 new tests FAIL (no
`listen-tab-chapter` / `listen-recap-*` test ids exist yet).

- [ ] **Step 3: Replace `ListenMode.tsx` with the tabbed version**

Replace the entire contents of `frontend/src/components/ListenMode.tsx` with:

```typescript
"use client";

/**
 * ListenMode — "Nghe truyện" (audio narration) + chapter recap video.
 *
 * Two tabs share one drawer:
 *  - "Trang này": a VLM looks at the current page, weaves the translated
 *    dialogue into a short Vietnamese storytelling script, then a
 *    local/Microsoft TTS voice reads it aloud.
 *  - "Cả chương" (only shown when a chapterId is supplied): renders a
 *    narrated recap video (.mp4) for the whole chapter — one still image per
 *    page over its narration audio, concatenated. Synchronous on the
 *    backend (no job/polling), so this can take a while for long chapters;
 *    the UI shows a spinner + a "may take a few minutes" note instead of a
 *    progress bar.
 *
 * Self-contained: renders its own trigger button + drawer, so wiring into the
 * reader is a single <ListenMode pageId=… chapterId=… /> mount. Talks to the
 * backend only through src/lib/api.ts.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/Icons";
import {
  APIError,
  getChapterRecapVideo,
  listVoices,
  narratePage,
  type NarrationResponse,
  type RecapVideoResponse,
  type TTSEngineInfo,
} from "@/lib/api";

interface Props {
  pageId: string | null;
  /** When provided, a second "Cả chương" tab offers a recap video for this chapter. */
  chapterId?: string;
  /** Page count of `chapterId`, used to show the credit cost before generating. */
  chapterPageCount?: number;
  /** Optional label override for the trigger button. */
  compact?: boolean;
}

type Tab = "page" | "chapter";

export function ListenMode({ pageId, chapterId, chapterPageCount, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(!pageId && chapterId ? "chapter" : "page");
  const [engines, setEngines] = useState<TTSEngineInfo[]>([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [engine, setEngine] = useState<string>("");
  const [voice, setVoice] = useState<string>("");
  const [costPerPage, setCostPerPage] = useState<number | null>(null);
  const [maxChapterPages, setMaxChapterPages] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [narration, setNarration] = useState<NarrationResponse | null>(null);
  const [recapVideo, setRecapVideo] = useState<RecapVideoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const availableEngines = engines.filter(e => e.available);
  const currentEngine = engines.find(e => e.engine === engine);
  const overPageLimit = maxChapterPages != null && (chapterPageCount ?? 0) > maxChapterPages;

  // Load voices the first time the drawer opens.
  useEffect(() => {
    if (!open || voicesLoaded) return;
    listVoices()
      .then(res => {
        setEngines(res.engines);
        setCostPerPage(res.credit_cost_per_page);
        setMaxChapterPages(res.max_chapter_pages);
        const firstAvail = res.engines.find(e => e.available);
        const pick = res.engines.find(e => e.engine === res.default_engine && e.available) || firstAvail;
        if (pick) {
          setEngine(pick.engine);
          setVoice(pick.voices[0]?.id ?? "");
        }
        setVoicesLoaded(true);
      })
      .catch(err => {
        setError(err instanceof APIError ? err.message : "Không tải được danh sách giọng đọc.");
        setVoicesLoaded(true);
      });
  }, [open, voicesLoaded]);

  // Keep the voice in sync when the engine changes.
  useEffect(() => {
    if (!currentEngine) return;
    if (!currentEngine.voices.some(v => v.id === voice)) {
      setVoice(currentEngine.voices[0]?.id ?? "");
    }
  }, [engine]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear stale errors when switching tabs.
  useEffect(() => {
    setError(null);
  }, [tab]);

  const handleGeneratePage = useCallback(async () => {
    if (!pageId) return;
    setGenerating(true);
    setError(null);
    setNarration(null);
    try {
      const result = await narratePage(pageId, { engine: engine || undefined, voice: voice || undefined });
      setNarration(result);
      // Autoplay once the <audio> has the new src.
      requestAnimationFrame(() => {
        audioRef.current?.load();
        audioRef.current?.play().catch(() => {/* autoplay may be blocked; user can press play */});
      });
    } catch (err) {
      setError(err instanceof APIError ? err.message : "Không tạo được lời kể.");
    } finally {
      setGenerating(false);
    }
  }, [pageId, engine, voice]);

  const handleGenerateRecap = useCallback(async () => {
    if (!chapterId) return;
    setGenerating(true);
    setError(null);
    setRecapVideo(null);
    try {
      const result = await getChapterRecapVideo(chapterId, { engine: engine || undefined, voice: voice || undefined });
      setRecapVideo(result);
    } catch (err) {
      setError(err instanceof APIError ? err.message : "Không tạo được video recap.");
    } finally {
      setGenerating(false);
    }
  }, [chapterId, engine, voice]);

  // Reset the rendered narration/recap when the underlying page/chapter changes.
  useEffect(() => {
    setNarration(null);
    setError(null);
  }, [pageId]);

  useEffect(() => {
    setRecapVideo(null);
  }, [chapterId]);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn btn-sm"
        title="Nghe truyện — AI kể chuyện bằng giọng nói"
        aria-label="Nghe truyện"
        data-testid="listen-mode-trigger"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Icon name="sparkle" size={12} />
        {!compact && "Nghe"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.18 }}
            className="stroke-ink-thick panel-shadow-lg"
            data-testid="listen-mode-panel"
            role="dialog"
            aria-label="Nghe truyện"
            style={{
              position: "fixed",
              right: 16,
              bottom: 16,
              width: "min(380px, calc(100vw - 32px))",
              background: "var(--panel)",
              zIndex: 9000,
              padding: "16px 18px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="sparkle" size={14} />
                <span className="caps-xs" style={{ color: "var(--accent)" }}>Nghe truyện</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                data-testid="listen-mode-close"
                style={{ background: "transparent", border: "1.5px solid var(--border)", padding: "4px 6px", cursor: "pointer", color: "var(--fg)" }}
              >
                <Icon name="close" size={12} />
              </button>
            </div>

            {/* Tab switcher — only shown when a chapter is in scope */}
            {chapterId && (
              <div style={{ display: "flex", border: "1.5px solid var(--border)", marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => setTab("page")}
                  data-testid="listen-tab-page"
                  aria-pressed={tab === "page"}
                  style={{
                    flex: 1, padding: "6px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: tab === "page" ? "var(--accent)" : "transparent",
                    color: tab === "page" ? "#fff" : "var(--fg)",
                    border: "none", borderRight: "1.5px solid var(--border)",
                  }}
                >
                  Trang này
                </button>
                <button
                  type="button"
                  onClick={() => setTab("chapter")}
                  data-testid="listen-tab-chapter"
                  aria-pressed={tab === "chapter"}
                  style={{
                    flex: 1, padding: "6px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: tab === "chapter" ? "var(--accent)" : "transparent",
                    color: tab === "chapter" ? "#fff" : "var(--fg)",
                    border: "none",
                  }}
                >
                  Cả chương
                </button>
              </div>
            )}

            {/* Engine + voice pickers (shared by both tabs) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="caps-xs" style={{ color: "var(--muted)" }}>Engine</span>
                <select
                  value={engine}
                  onChange={e => setEngine(e.target.value)}
                  disabled={!voicesLoaded || generating}
                  data-testid="listen-engine-select"
                  style={selectStyle}
                >
                  {availableEngines.length === 0 && <option value="">(không có)</option>}
                  {availableEngines.map(e => (
                    <option key={e.engine} value={e.engine}>
                      {engineLabel(e.engine)}{e.is_default ? " ★" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="caps-xs" style={{ color: "var(--muted)" }}>Giọng</span>
                <select
                  value={voice}
                  onChange={e => setVoice(e.target.value)}
                  disabled={!currentEngine || generating}
                  data-testid="listen-voice-select"
                  style={selectStyle}
                >
                  {(currentEngine?.voices ?? []).map(v => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {tab === "page" ? (
              <>
                {/* Generate button — this page */}
                <button
                  onClick={handleGeneratePage}
                  disabled={!pageId || generating || availableEngines.length === 0}
                  className="btn"
                  data-testid="listen-generate"
                  style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}
                >
                  {generating ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} style={{ display: "inline-flex" }}>
                        <Icon name="refresh" size={14} />
                      </motion.span>
                      Đang tạo lời kể…
                    </>
                  ) : (
                    <><Icon name="sparkle" size={14} /> Tạo &amp; nghe trang này</>
                  )}
                </button>

                {error && (
                  <div style={{ padding: "8px 10px", background: "var(--bg-2)", border: "1.5px solid var(--accent)", color: "var(--accent)", fontSize: 12, marginBottom: 10 }} data-testid="listen-error">
                    {error}
                  </div>
                )}

                {narration && (
                  <div data-testid="listen-result">
                    {narration.audio_url && (
                      <audio
                        ref={audioRef}
                        controls
                        src={narration.audio_url}
                        data-testid="listen-audio"
                        style={{ width: "100%", marginBottom: 10 }}
                      />
                    )}
                    <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 4 }}>
                      Lời kể
                      {narration.source === "dialogue_fallback" && (
                        <span title="VLM không phản hồi — đang đọc thẳng lời thoại" style={{ marginLeft: 6, color: "var(--accent)" }}>
                          · đọc thoại
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg)", background: "var(--bg-2)", border: "1.5px solid var(--border-soft)", padding: "8px 10px", maxHeight: 160, overflowY: "auto" }}>
                      {narration.script}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Cost + limit info — chapter recap */}
                {chapterPageCount != null && costPerPage != null && (
                  <div className="caps-xs" data-testid="listen-recap-cost" style={{ color: "var(--muted)", marginBottom: 8 }}>
                    Sẽ tốn {chapterPageCount * costPerPage} credit cho {chapterPageCount} trang
                  </div>
                )}
                {overPageLimit && (
                  <div style={{ padding: "8px 10px", background: "var(--bg-2)", border: "1.5px solid var(--accent)", color: "var(--accent)", fontSize: 12, marginBottom: 10 }}>
                    Chương có {chapterPageCount} trang, vượt giới hạn {maxChapterPages} trang mỗi lần xuất recap.
                  </div>
                )}

                <button
                  onClick={handleGenerateRecap}
                  disabled={!chapterId || generating || availableEngines.length === 0 || overPageLimit}
                  className="btn"
                  data-testid="listen-recap-generate"
                  style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}
                >
                  {generating ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} style={{ display: "inline-flex" }}>
                        <Icon name="refresh" size={14} />
                      </motion.span>
                      Đang tạo video… (có thể mất vài phút với chương dài)
                    </>
                  ) : (
                    <><Icon name="sparkle" size={14} /> Tạo video recap</>
                  )}
                </button>

                {error && (
                  <div style={{ padding: "8px 10px", background: "var(--bg-2)", border: "1.5px solid var(--accent)", color: "var(--accent)", fontSize: 12, marginBottom: 10 }} data-testid="listen-error">
                    {error}
                  </div>
                )}

                {recapVideo && (
                  <div data-testid="listen-recap-result">
                    <video
                      controls
                      src={recapVideo.video_url}
                      data-testid="listen-recap-video"
                      style={{ width: "100%", marginBottom: 8, background: "#000" }}
                    />
                    <a
                      href={recapVideo.video_url}
                      download
                      data-testid="listen-recap-download"
                      className="btn btn-sm btn-ghost"
                      style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}
                    >
                      <Icon name="download" size={12} /> Tải video
                    </a>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const selectStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1.5px solid var(--border)",
  color: "var(--fg)",
  padding: "5px 6px",
  fontSize: 12,
  cursor: "pointer",
};

function engineLabel(engine: string): string {
  switch (engine) {
    case "edge": return "Microsoft";
    case "pyttsx3": return "Offline";
    case "coqui": return "XTTS (GPU)";
    default: return engine;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run __tests__/components/ListenMode.test.tsx`
Expected: all 13 tests PASS (8 pre-existing + 5 new).

- [ ] **Step 5: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no NEW errors versus the pre-existing baseline. In particular,
confirm `src/app/reader/page.tsx:1302`'s existing
`<ListenMode pageId={pageData.page_id} />` call still typechecks (it must,
since `chapterId`/`chapterPageCount` are optional).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ListenMode.tsx frontend/__tests__/components/ListenMode.test.tsx
git commit -m "feat(narration): add chapter recap video tab to ListenMode"
```

---

## Task 5: Mount `ListenMode` in the series reader

**Files:**
- Modify: `frontend/src/app/series/[id]/read/page.tsx:13-22` (import block)
- Modify: `frontend/src/app/series/[id]/read/page.tsx:670-679` (toolbar button row)

**Interfaces:**
- Consumes: `<ListenMode pageId chapterId? chapterPageCount? />` (Task 4),
  existing `current: FlatPage | undefined` (has `.page_id`, `.chapter_id`),
  existing `series: SeriesDetail | null` (has `.chapters: ChapterResponse[]`,
  each with `.chapter_id` and `.page_count` — `frontend/src/lib/api.ts:1116-1126`).
- Produces: nothing consumed elsewhere — leaf UI mount.

- [ ] **Step 1: Import `ListenMode`**

In `frontend/src/app/series/[id]/read/page.tsx`, replace:

```typescript
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPage } from "@/components/Animations";
import { QAChatPanel } from "@/components/QAChatPanel";
```

with:

```typescript
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPage } from "@/components/Animations";
import { QAChatPanel } from "@/components/QAChatPanel";
import { ListenMode } from "@/components/ListenMode";
```

- [ ] **Step 2: Mount it in the toolbar, next to "Chỉnh sửa"**

Replace:

```typescript
              {current && (
                <button
                  className="btn btn-sm"
                  onClick={() => setShowEditPanel(true)}
                  title="Mở panel ngữ cảnh để sửa bản dịch ngay trong reader"
                  style={{ fontSize: 11, padding: "4px 8px" }}
                >
                  <Icon name="settings" size={11} /> Chỉnh sửa
                </button>
              )}

              <button
                onClick={() => setImmersive(true)}
```

with:

```typescript
              {current && (
                <button
                  className="btn btn-sm"
                  onClick={() => setShowEditPanel(true)}
                  title="Mở panel ngữ cảnh để sửa bản dịch ngay trong reader"
                  style={{ fontSize: 11, padding: "4px 8px" }}
                >
                  <Icon name="settings" size={11} /> Chỉnh sửa
                </button>
              )}

              {current && (
                <ListenMode
                  pageId={current.page_id}
                  chapterId={current.chapter_id}
                  chapterPageCount={series?.chapters.find(c => c.chapter_id === current.chapter_id)?.page_count}
                  compact
                />
              )}

              <button
                onClick={() => setImmersive(true)}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no NEW errors versus the pre-existing baseline.

- [ ] **Step 4: Manual verify**

With the backend running (and `ffmpeg` installed on the host — check with
`ffmpeg -version`) and a series that has ≥1 fully-translated chapter:
1. Open `series/<id>/read`.
2. Confirm a "Nghe" button now appears in the toolbar (next to "Chỉnh sửa").
3. Click it → drawer opens with two tabs, "Trang này" active by default.
4. Click "Cả chương" → confirm the cost line reads
   "Sẽ tốn N credit cho N trang" (N = the chapter's page count ×
   `NARRATION_CREDIT_COST`, default cost 1/page).
5. Click "Tạo video recap" → spinner with the "may take a few minutes" label
   appears, button disabled.
6. On success: a playable `<video>` appears plus a working "Tải video" download link.
7. Reload the page, open `/reader?page=<any page id>` for a single page —
   confirm the Listen button still works exactly as before (no tab
   switcher visible, since no `chapterId` is passed there).

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/series/[id]/read/page.tsx"
git commit -m "feat(narration): mount ListenMode (page + chapter recap) in the series reader"
```

---

## Self-Review Notes

- **Spec coverage:** all 7 "kết quả mong muốn" rows map to tasks — Listen
  button in series reader (Task 5), tab switcher (Task 4 Step 3), cost shown
  before generating (Task 4's `listen-recap-cost` block, Task 2's
  `credit_cost_per_page`), spinner-only wait UX with no new job/polling
  (Task 4's `generating` branch, no backend job added), playable video +
  download link (Task 4's `listen-recap-video`/`listen-recap-download`),
  errors surfaced via the existing `listen-error` element (Task 4), `/reader`
  unchanged (Task 4 Step 1's first new test + Task 5 Step 4's manual check 7).
- **Type consistency:** `RecapVideoResponse` is defined identically in
  backend `schemas.py` (Task 1: `chapter_id: str, video_url: str`) and
  frontend `api.ts` (Task 3: `chapter_id: string; video_url: string`) — no
  drift. `getChapterRecapVideo(chapterId: string, options?: NarrateOptions)`
  (Task 3) is called with the same shape in `ListenMode.tsx`'s
  `handleGenerateRecap` (Task 4). `VoicesResponse.credit_cost_per_page` /
  `.max_chapter_pages` (Tasks 1 & 3) are read under the same names in
  `ListenMode.tsx` (Task 4).
- **No placeholders:** every step has complete, runnable code — confirmed on
  re-read. Task 4 Step 4 has a conditional fallback for the `download` icon
  name specifically because `Icons.tsx`'s exact icon set wasn't verified
  ahead of time; it's the one intentionally-guarded lookup, not a TBD.
