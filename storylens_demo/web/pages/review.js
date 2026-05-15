/* ── OCR Story page ─────────────────────────────────────── */
window.ReviewPage = {
  _mangas: [],
  _chapters: [],
  _pages: [],
  _overlayIndex: 0,
  _overlayKeyHandler: null,

  async render() {
    this._mangas = await API.get("/api/v1/manga").catch(() => []);
    const mangaOptions = this._mangas
      .map((m) => `<option value="${m.id}">${m.title}</option>`)
      .join("");

    return `
    <div class="page-header">
      <div>
        <div class="page-title">🧾 OCR Truyện</div>
        <div class="page-subtitle">Xem kết quả OCR theo từng trang và trưng bày thành các ô đẹp</div>
      </div>
    </div>
    <div class="page-body">
      <div class="card mb-16" style="margin-bottom:16px">
        <div class="card-body ocr-toolbar">
          <div class="form-group" style="flex:1">
            <label class="form-label">Chọn truyện</label>
            <select class="form-select" id="ocr-manga">
              <option value="">— chọn truyện —</option>${mangaOptions}
            </select>
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">Chọn chương</label>
            <select class="form-select" id="ocr-chapter">
              <option value="">— chọn chương —</option>
            </select>
          </div>
          <button class="btn btn-primary" id="ocr-load-btn">📥 Tải OCR</button>
        </div>
      </div>
      <div id="ocr-content">
        <div class="empty-state">
          <div class="empty-state-icon">🧾</div>
          <div class="empty-state-text">Chọn truyện và chương để xem OCR</div>
          <div class="empty-state-sub">Trang đầu tiên sẽ được dùng làm nền khi có nhiều ảnh</div>
        </div>
      </div>

      <div id="ocr-overlay" class="ocr-overlay" aria-hidden="true">
        <div class="ocr-overlay-backdrop" data-action="close"></div>
        <div class="ocr-overlay-card">
          <button class="ocr-overlay-close" data-action="close">✕</button>
          <div class="ocr-overlay-image" id="ocr-overlay-image"></div>
          <div class="ocr-overlay-body">
            <div class="ocr-overlay-title" id="ocr-overlay-title"></div>
            <div class="ocr-overlay-actions">
              <button class="btn btn-ghost" id="ocr-prev">◀ Trước</button>
              <button class="btn btn-ghost" id="ocr-next">Sau ▶</button>
              <a class="btn btn-secondary" id="ocr-overlay-open" target="_blank" rel="noopener">Mở ảnh lớn</a>
              <button class="btn btn-ghost" data-action="close">Đóng</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  async mount() {
    document
      .getElementById("ocr-manga")
      ?.addEventListener("change", () => this._loadChapters());
    document
      .getElementById("ocr-load-btn")
      ?.addEventListener("click", () => this._loadPages());
    this._bindOverlay();
  },

  unmount() {
    this._clearBackground();
  },

  async _loadChapters() {
    const mangaId = document.getElementById("ocr-manga")?.value;
    const chapterSel = document.getElementById("ocr-chapter");
    if (!chapterSel) return;
    chapterSel.innerHTML = '<option value="">— chọn chương —</option>';
    if (!mangaId) return;

    this._chapters = await API.get(`/api/v1/manga/${mangaId}/chapters`).catch(
      () => [],
    );
    if (!this._chapters.length) {
      chapterSel.innerHTML = '<option value="">(chưa có chương)</option>';
      return;
    }
    chapterSel.innerHTML = this._chapters
      .map((c) => {
        const title = c.title ? ` - ${c.title}` : "";
        return `<option value="${c.id}">Chương ${c.chapter_number}${title}</option>`;
      })
      .join("");
  },

  async _loadPages() {
    const mangaId = document.getElementById("ocr-manga")?.value;
    const chapterId = document.getElementById("ocr-chapter")?.value;
    if (!mangaId || !chapterId) {
      Toast.warn("Chọn truyện và chương trước");
      return;
    }

    const btn = document.getElementById("ocr-load-btn");
    btn.disabled = true;
    try {
      const result = await API.get(
        `/api/v1/library/${mangaId}/chapters/${chapterId}`,
      );
      this._pages = result.pages || [];
      const content = document.getElementById("ocr-content");
      if (!content) return;

      if (!this._pages.length) {
        this._clearBackground();
        content.innerHTML =
          '<div class="empty-state"><div class="empty-state-text">Chương này chưa có trang OCR</div></div>';
        return;
      }

      const heroUrl = this._pages[0].input_url || this._pages[0].output_url;
      if (heroUrl) this._applyBackground(heroUrl);

      content.innerHTML = `
        <div class="ocr-meta">
          <div class="ocr-count">${this._pages.length} trang OCR</div>
          <div class="ocr-note">Nền lấy từ trang đầu tiên</div>
        </div>
        <div class="ocr-grid">
          ${this._pages.map((p, i) => this._renderPageCard(p, i)).join("")}
        </div>`;

      this._bindPageCards();
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.disabled = false;
    }
  },

  _renderPageCard(page, index) {
    const thumb = page.output_url || page.input_url;
    const count = page.boxes?.length || 0;
    const badge = page.output_url ? "Đã render" : "OCR";
    const bgStyle = thumb
      ? `background-image:url('${thumb}')`
      : "background:linear-gradient(135deg,#1c1d28,#2f2a3a)";
    const fullUrl = page.output_url || page.input_url || "";

    return `
      <div class="ocr-card" data-full-url="${fullUrl}" data-index="${index}">
        <div class="ocr-thumb" style="${bgStyle}">
          <div class="ocr-page-badge">Trang ${page.page_index + 1}</div>
          <div class="ocr-status">${badge}</div>
        </div>
        <div class="ocr-body">
          <div class="ocr-title">Trang ${page.page_index + 1}</div>
          <div class="ocr-meta-row">${count} khung thoại • ${page.output_url ? "Có bản dịch" : "OCR gốc"}</div>
          <div class="ocr-actions">
            ${page.input_url ? `<a class="btn btn-ghost btn-sm" href="${page.input_url}" target="_blank" rel="noopener">Ảnh gốc</a>` : ""}
            ${page.output_url ? `<a class="btn btn-secondary btn-sm" href="${page.output_url}" target="_blank" rel="noopener">Ảnh đã render</a>` : ""}
          </div>
        </div>
      </div>`;
  },

  _bindPageCards() {
    document.querySelectorAll(".ocr-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (link) e.preventDefault();
        this._openOverlay(card);
      });
    });
  },

  _bindOverlay() {
    const overlay = document.getElementById("ocr-overlay");
    if (!overlay) return;
    overlay.querySelectorAll('[data-action="close"]').forEach((el) => {
      el.addEventListener("click", () => this._closeOverlay());
    });
    document
      .getElementById("ocr-prev")
      ?.addEventListener("click", () => this._stepOverlay(-1));
    document
      .getElementById("ocr-next")
      ?.addEventListener("click", () => this._stepOverlay(1));
  },

  _openOverlay(card) {
    const overlay = document.getElementById("ocr-overlay");
    if (!overlay) return;
    const index = parseInt(card.dataset.index || "0", 10);
    this._overlayIndex = Number.isNaN(index) ? 0 : index;
    this._renderOverlay();
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    this._bindOverlayKeys();
  },

  _closeOverlay() {
    const overlay = document.getElementById("ocr-overlay");
    if (!overlay) return;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    this._unbindOverlayKeys();
  },

  _renderOverlay() {
    const page = this._pages[this._overlayIndex];
    if (!page) return;
    const url = page.output_url || page.input_url || "";
    const title = `Trang ${page.page_index + 1}`;

    const imageEl = document.getElementById("ocr-overlay-image");
    const titleEl = document.getElementById("ocr-overlay-title");
    const openEl = document.getElementById("ocr-overlay-open");
    const prevBtn = document.getElementById("ocr-prev");
    const nextBtn = document.getElementById("ocr-next");

    if (titleEl) titleEl.textContent = title;
    if (imageEl) {
      imageEl.style.backgroundImage = url
        ? `url('${url}')`
        : "linear-gradient(135deg,#1c1d28,#2f2a3a)";
    }
    if (openEl) {
      if (url) {
        openEl.href = url;
        openEl.style.display = "inline-flex";
      } else {
        openEl.style.display = "none";
      }
    }
    if (prevBtn) prevBtn.disabled = this._overlayIndex <= 0;
    if (nextBtn)
      nextBtn.disabled = this._overlayIndex >= this._pages.length - 1;
  },

  _stepOverlay(dir) {
    const next = Math.max(
      0,
      Math.min(this._pages.length - 1, this._overlayIndex + dir),
    );
    if (next === this._overlayIndex) return;
    this._overlayIndex = next;
    this._renderOverlay();
  },

  _bindOverlayKeys() {
    this._overlayKeyHandler = (e) => {
      if (e.key === "Escape") this._closeOverlay();
      if (e.key === "ArrowLeft") this._stepOverlay(-1);
      if (e.key === "ArrowRight") this._stepOverlay(1);
    };
    window.addEventListener("keydown", this._overlayKeyHandler);
  },

  _unbindOverlayKeys() {
    if (this._overlayKeyHandler) {
      window.removeEventListener("keydown", this._overlayKeyHandler);
      this._overlayKeyHandler = null;
    }
  },

  _applyBackground(url) {
    document.body.style.setProperty("--ocr-bg", `url('${url}')`);
  },

  _clearBackground() {
    document.body.style.removeProperty("--ocr-bg");
  },
};
