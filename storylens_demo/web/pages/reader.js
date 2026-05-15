/* ── Reader page — MangaDex Fast Reader ───────────────────── */
window.ReaderPage = {
  _pages: [],
  _current: 0,
  _mangaId: "",
  _chapterId: "",
  _chapters: [],
  _mode: "scroll",
  _preferredMode: "scroll",
  _loading: false,
  _chapterListReady: false,
  _autoLoad: false,

  async render(params = {}) {
    const saved = this._getSavedReading();
    this._mangaId = params.mangaId || "";
    this._chapterId = params.chapterId || saved.chapterId || "";
    this._preferredMode = params.mode || saved.mode || "scroll";
    this._autoLoad = params.autoLoad === true || !!this._chapterId;
    if (!this._mangaId) this._mangaId = saved.mangaId || "";
    if (!window._readerMangaTitle && saved.mangaTitle) {
      window._readerMangaTitle = saved.mangaTitle;
    }
    return `
    <div id="reader-root" style="min-height:100vh;background:#0d0d0d">
      <!-- Topbar -->
      <div style="position:sticky;top:0;z-index:100;background:rgba(10,10,14,0.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:10px 24px;display:flex;align-items:center;gap:14px">
        <button class="btn btn-ghost btn-sm" onclick="App.navigate('library')">← Quay lại</button>
        <div style="flex:1;font-weight:700;font-size:14px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" id="reader-title">
          ${window._readerMangaTitle || ""}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-ghost btn-sm" id="reader-prev-chapter" title="Chương trước">◀ Chương</button>
          <button class="btn btn-ghost btn-sm" id="reader-next-chapter" title="Chương sau">Chương ▶</button>
        </div>
        <div style="min-width:240px;max-width:320px">
          <select class="form-select" id="reader-chapter-select" disabled>
            <option value="">Đang tải chương...</option>
          </select>
        </div>
        <span id="reader-page-label" style="font-size:12px;color:var(--text-3);white-space:nowrap"></span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" id="btn-scroll" title="Cuộn dọc">↕ Cuộn</button>
          <button class="btn btn-sm" id="btn-page" title="Lật trang">📄 Trang</button>
        </div>
      </div>

      <!-- Content -->
      <div id="reader-content" style="display:flex;flex-direction:column;align-items:center">
        ${this._renderLoadingState()}
      </div>

      <!-- Bottom nav (page mode) -->
      <div id="reader-nav" style="display:none;position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:200;display:flex;gap:10px;background:rgba(15,15,20,0.97);padding:10px 20px;border-radius:99px;border:1px solid var(--border);box-shadow:var(--shadow-lg)">
        <button class="btn btn-secondary btn-sm" id="r-prev">◀</button>
        <span id="r-nav-label" style="font-size:12px;color:var(--text-2);align-self:center;min-width:70px;text-align:center">—</span>
        <button class="btn btn-primary btn-sm" id="r-next">▶</button>
      </div>
    </div>`;
  },

  async mount() {
    document
      .getElementById("r-prev")
      ?.addEventListener("click", () => this._go(-1));
    document
      .getElementById("r-next")
      ?.addEventListener("click", () => this._go(1));
    document
      .getElementById("btn-scroll")
      ?.addEventListener("click", () => this._setMode("scroll"));
    document
      .getElementById("btn-page")
      ?.addEventListener("click", () => this._setMode("page"));
    document
      .getElementById("reader-chapter-select")
      ?.addEventListener("change", (e) => this._onSelectChapter(e));
    document
      .getElementById("reader-prev-chapter")
      ?.addEventListener("click", () => this._goChapter(-1));
    document
      .getElementById("reader-next-chapter")
      ?.addEventListener("click", () => this._goChapter(1));
    this._keyHandler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") this._go(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") this._go(-1);
    };
    window.addEventListener("keydown", this._keyHandler);

    if (!this._mangaId && this._chapterId) {
      await this._hydrateFromChapter(this._chapterId);
    }

    const chapterListPromise = this._loadChapterList();
    if (this._chapterId) {
      await this._loadChapter(this._chapterId);
    } else {
      this._renderNoChapterState();
    }
    await chapterListPromise;
  },

  unmount() {
    if (this._keyHandler)
      window.removeEventListener("keydown", this._keyHandler);
  },

  async _loadChapter(chapterId) {
    const content = document.getElementById("reader-content");
    const t0 = Date.now();
    this._setLoading(true);
    this._chapterId = chapterId;

    const chapterSelect = document.getElementById("reader-chapter-select");
    if (chapterSelect && chapterSelect.value !== chapterId) {
      chapterSelect.value = chapterId;
    }

    try {
      /* 1. Fetch at-home server URL from our backend proxy (fast — cached by CDN) */
      const res = await fetch(`/api/mdx/chapter/${chapterId}/pages`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const baseUrl = json.baseUrl;
      const ch = json.chapter;
      if (!baseUrl || !ch) throw new Error("Không nhận được dữ liệu trang");

      /* 2. Build image URLs — use dataSaver for 60% smaller files */
      const files = ch.dataSaver?.length ? ch.dataSaver : ch.data;
      const quality = ch.dataSaver?.length ? "data-saver" : "data";
      /* Proxy through backend — MangaDex CDN blocks direct browser requests */
      this._pages = files.map((f) => {
        const raw = `${baseUrl}/${quality}/${ch.hash}/${f}`;
        return `/api/mdx/cover-proxy?url=${encodeURIComponent(raw)}`;
      });

      this._current = 0;

      if (!this._pages.length) throw new Error("Chương này không có trang nào");

      /* 3. Render immediately in preferred mode */
      this._setMode(this._preferredMode || "scroll");

      const ms = Date.now() - t0;
      const label = document.getElementById("reader-page-label");
      if (label) label.textContent = `${this._pages.length} trang · ${ms}ms`;

      this._setLoading(false);
      this._updateChapterNav();
      this._scrollToContent();
    } catch (err) {
      if (content)
        content.innerHTML = `
        <div style="padding:80px;text-align:center">
          <div style="font-size:40px;margin-bottom:16px">😢</div>
          <div style="color:var(--red);font-weight:600">${err.message}</div>
          <div style="margin-top:10px;color:var(--text-3);font-size:13px">Thử chọn chương khác hoặc đợi vài giây rồi thử lại.</div>
          <div style="margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="ReaderPage._loadChapter(ReaderPage._chapterId)">Thử lại</button>
            <button class="btn btn-secondary btn-sm" onclick="App.navigate('library')">← Về kho truyện</button>
          </div>
        </div>`;
    } finally {
      if (this._loading) this._setLoading(false);
    }
  },

  async _loadChapterList() {
    const select = document.getElementById("reader-chapter-select");
    this._chapterListReady = false;
    if (!select || !this._mangaId) {
      if (select) {
        select.innerHTML = '<option value="">(chưa chọn truyện)</option>';
        select.disabled = true;
      }
      return;
    }

    select.innerHTML = '<option value="">Đang tải chương...</option>';
    select.disabled = true;

    try {
      const res = await fetch(
        `/api/mdx/manga/${this._mangaId}/chapters?limit=200`,
      );
      const json = await res.json();
      const chapters = json.data || [];
      this._chapters = chapters;

      if (!chapters.length) {
        select.innerHTML = '<option value="">(không có chương)</option>';
        return;
      }

      const optionsHtml = chapters
        .map((ch) => {
          const num = ch.attributes.chapter || "?";
          const chTitle = ch.attributes.title
            ? ` — ${ch.attributes.title}`
            : "";
          const label = `Chương ${num}${chTitle}`;
          return `<option value="${ch.id}" data-label="${label}">${label}</option>`;
        })
        .join("");

      select.innerHTML = optionsHtml;
      const defaultId = this._chapterId || chapters[chapters.length - 1].id;
      select.value = defaultId;
      if (!this._chapterId) this._chapterId = defaultId;
      this._chapterListReady = true;
      this._updateChapterNav();
    } catch (err) {
      select.innerHTML = '<option value="">Lỗi tải chương</option>';
    } finally {
      select.disabled = this._loading || !this._chapterListReady;
      this._updateChapterNav();
    }
  },

  async _hydrateFromChapter(chapterId) {
    if (!chapterId || this._mangaId) return;
    try {
      const res = await fetch(`/api/mdx/chapter/${chapterId}`);
      if (!res.ok) return;
      const json = await res.json();
      const chapter = json?.data;
      const mangaRel = chapter?.relationships?.find((r) => r.type === "manga");
      if (mangaRel?.id) this._mangaId = mangaRel.id;
    } catch (err) {
      /* ignore */
    }
  },

  _onSelectChapter(e) {
    const select = e?.target;
    const chapterId = select?.value || "";
    if (!chapterId) return;
    this._chapterId = chapterId;
    this._pages = [];
    this._loadChapter(chapterId);
  },

  _goChapter(dir) {
    if (this._loading || !this._chapters.length) return;
    const index = this._getChapterIndex(this._chapterId);
    if (index === -1) return;
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= this._chapters.length) return;
    const nextId = this._chapters[nextIndex].id;
    const select = document.getElementById("reader-chapter-select");
    if (select) select.value = nextId;
    this._loadChapter(nextId);
  },

  _getChapterIndex(chapterId) {
    if (!chapterId) return -1;
    return this._chapters.findIndex((ch) => ch.id === chapterId);
  },

  _setLoading(isLoading) {
    this._loading = isLoading;
    ["btn-scroll", "btn-page", "r-prev", "r-next"].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = isLoading;
    });
    const select = document.getElementById("reader-chapter-select");
    if (select) select.disabled = isLoading || !this._chapterListReady;

    const label = document.getElementById("reader-page-label");
    if (label && isLoading) label.textContent = "Đang tải...";

    this._updateChapterNav();
  },

  _setMode(mode) {
    this._mode = mode;
    this._preferredMode = mode;
    const content = document.getElementById("reader-content");
    const nav = document.getElementById("reader-nav");
    if (!content || !this._pages.length) return;

    const scrollBtn = document.getElementById("btn-scroll");
    const pageBtn = document.getElementById("btn-page");
    if (scrollBtn) {
      scrollBtn.className = `btn btn-sm${mode === "scroll" ? " btn-primary" : " btn-ghost"}`;
    }
    if (pageBtn) {
      pageBtn.className = `btn btn-sm${mode === "page" ? " btn-primary" : " btn-ghost"}`;
    }

    if (mode === "scroll") {
      if (nav) nav.style.display = "none";
      /* Render ALL pages at once — browser lazy-loads automatically */
      content.style.gap = "2px";
      content.innerHTML = this._pages
        .map(
          (url, i) => `
        <div style="width:100%;max-width:950px;margin:0 auto;line-height:0">
          <img src="${url}"
            loading="${i < 2 ? "eager" : "lazy"}"
            decoding="async"
            alt="Trang ${i + 1}"
            style="width:100%;display:block"
            onerror="this.style.cssText='width:100%;height:200px;display:flex;align-items:center;justify-content:center;background:#111;color:#555';this.alt='Lỗi tải trang ${i + 1}'">
        </div>`,
        )
        .join("");
      const label = document.getElementById("reader-page-label");
      if (label) label.textContent = `${this._pages.length} trang`;
      this._scrollToContent();
    } else {
      if (nav) nav.style.display = "flex";
      this._renderSingle();
    }
  },

  _renderLoadingState() {
    return `
      <div style="min-height:calc(100vh - 72px);width:100%;display:flex;align-items:center;justify-content:center;padding:48px 16px;text-align:center;color:var(--text-3)">
        <div>
          <div style="font-size:40px;margin-bottom:16px">⏳</div>
          <div>Đang tải truyện...</div>
        </div>
      </div>`;
  },

  _renderNoChapterState() {
    const content = document.getElementById("reader-content");
    if (!content) return;
    content.innerHTML = `
      <div style="min-height:calc(100vh - 72px);width:100%;display:flex;align-items:center;justify-content:center;padding:48px 16px;text-align:center;color:var(--text-3)">
        <div>
          <div style="font-size:40px;margin-bottom:16px">📖</div>
          <div style="font-weight:600;margin-bottom:8px">Chưa chọn chương</div>
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('library')">← Về kho truyện</button>
        </div>
      </div>`;
    const label = document.getElementById("reader-page-label");
    if (label) label.textContent = "";
    this._updateChapterNav();
  },

  _getSavedReading() {
    try {
      return JSON.parse(localStorage.getItem("storylens.reading") || "{}");
    } catch (e) {
      return {};
    }
  },

  _renderSingle() {
    const content = document.getElementById("reader-content");
    const navLabel = document.getElementById("r-nav-label");
    const topLabel = document.getElementById("reader-page-label");
    if (!content) return;

    const url = this._pages[this._current];
    const n = this._current + 1;
    const total = this._pages.length;
    if (navLabel) navLabel.textContent = `${n} / ${total}`;
    if (topLabel) topLabel.textContent = `${n} / ${total}`;

    /* Preload next page */
    if (this._pages[this._current + 1]) {
      const img = new Image();
      img.src = this._pages[this._current + 1];
    }

    content.innerHTML = `
      <div style="width:100%;max-width:950px;margin:0 auto;min-height:80vh;display:flex;align-items:flex-start;justify-content:center">
        <img src="${url}" alt="Trang ${n}"
          decoding="async"
          style="width:100%;display:block;max-height:92vh;object-fit:contain"
          onerror="this.parentElement.innerHTML='<div style=padding:80px;text-align:center;color:var(--text-3)>Lỗi tải trang ${n}</div>'">
      </div>`;
  },

  _go(dir) {
    if (this._mode !== "page") return;
    const next = Math.max(
      0,
      Math.min(this._pages.length - 1, this._current + dir),
    );
    if (next === this._current) return;
    this._current = next;
    this._renderSingle();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  _scrollToContent() {
    if (this._loading) return;
    const content = document.getElementById("reader-content");
    content?.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  _updateChapterNav() {
    const prevBtn = document.getElementById("reader-prev-chapter");
    const nextBtn = document.getElementById("reader-next-chapter");
    if (!prevBtn || !nextBtn) return;

    const index = this._getChapterIndex(this._chapterId);
    const hasPrev = index > 0;
    const hasNext = index !== -1 && index < this._chapters.length - 1;

    prevBtn.disabled = this._loading || !this._chapterListReady || !hasPrev;
    nextBtn.disabled = this._loading || !this._chapterListReady || !hasNext;
  },
};
