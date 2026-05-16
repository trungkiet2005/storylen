/* ── Library page — Browse & Read from MangaDex ──────────── */

function mdxCoverUrl(mangaId, fileName) {
  const rawUrl = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.512.jpg`;
  return `/api/mdx/cover-proxy?url=${encodeURIComponent(rawUrl)}`;
}

window.LibraryPage = {
  _mangas: [],
  _selectedManga: null,
  _chapters: [],
  _initialMangaId: null,
  _initialMangaTitle: null,
  _autoReadLatest: false,
  _activeCoverUrl: "",
  _currentMangaId: "",
  _currentMangaTitle: "",

  async render(params = {}) {
    this._initialMangaId = params.mangaId || null;
    this._initialMangaTitle = params.mangaTitle || null;
    this._autoReadLatest = !!params.autoReadLatest;
    return `
    <div class="page-header">
      <div>
        <div class="page-title">📚 Kho Truyện</div>
        <div class="page-subtitle">Duyệt truyện từ MangaDex · Nhấn vào truyện để xem danh sách chương và đọc.</div>
      </div>
    </div>
    <div class="page-body">
      <!-- Search bar -->
      <div class="search-bar" style="margin-bottom:16px">
        <input class="form-input" id="lib-search" placeholder="Tìm truyện để đọc..." style="flex:1">
        <button class="btn btn-primary" id="lib-search-btn">🔍 Tìm</button>
      </div>
      <!-- Manga grid -->
      <div id="lib-manga-grid" class="story-grid">
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">⏳</div>
          <div class="empty-state-text">Đang tải truyện...</div>
        </div>
      </div>
      <!-- Chapter list panel (hidden by default) -->
      <div id="lib-chapter-panel" style="display:none;margin-top:24px">
        <div class="card">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
            <span class="card-title" id="lib-manga-title">Chương</span>
            <button class="btn btn-ghost btn-sm" id="lib-close-panel">✕ Đóng</button>
          </div>
          <div class="card-body" style="padding:12px">
            <div id="lib-chapter-list" style="display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto"></div>
          </div>
        </div>
      </div>
    </div>`;
  },

  async mount() {
    document
      .getElementById("lib-search-btn")
      ?.addEventListener("click", () => this._search());
    document.getElementById("lib-search")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this._search();
    });
    document
      .getElementById("lib-close-panel")
      ?.addEventListener("click", () => {
        document.getElementById("lib-chapter-panel").style.display = "none";
      });

    if (this._initialMangaId) {
      await this._openChapters(this._initialMangaId, this._initialMangaTitle, {
        autoReadLatest: this._autoReadLatest,
      });
    } else {
      await this._loadPopular();
    }
  },

  async _loadPopular() {
    await this._fetchAndRender("/api/mdx/manga/popular?limit=24");
  },

  async _search() {
    const q = document.getElementById("lib-search")?.value?.trim();
    const url = q
      ? `/api/mdx/manga?limit=24&title=${encodeURIComponent(q)}`
      : "/api/mdx/manga/popular?limit=24";
    await this._fetchAndRender(url);
  },

  async _fetchAndRender(url) {
    const grid = document.getElementById("lib-manga-grid");
    if (!grid) return;
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">⏳</div><div class="empty-state-text">Đang tải...</div></div>`;

    try {
      const res = await fetch(url);
      const json = await res.json();
      this._mangas = json.data || [];

      if (!this._mangas.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">😔</div><div class="empty-state-text">Không tìm thấy truyện</div></div>`;
        return;
      }

      grid.innerHTML = this._mangas
        .map((m, idx) => {
          const cover = m.relationships.find((r) => r.type === "cover_art");
          const coverUrl = cover?.attributes?.fileName
            ? mdxCoverUrl(m.id, cover.attributes.fileName)
            : null;
          const imgStyle = coverUrl
            ? `background-image:url('${coverUrl}')`
            : `background:linear-gradient(135deg,#1d1e26,#2a2b3d)`;
          const t = m.attributes.title;
          const title = t.vi || t.en || t["ja-ro"] || Object.values(t)[0];
          const tags = m.attributes.tags
            .filter((t) => t.attributes.group === "genre")
            .map((t) => t.attributes.name.en)
            .slice(0, 2)
            .join(" • ");
          const badge =
            m.attributes.status === "completed"
              ? `<span class="badge badge-green" style="font-size:10px">Hoàn thành</span>`
              : `<span class="badge badge-accent" style="font-size:10px">Đang ra</span>`;
          return `
            <div class="story-card" style="cursor:pointer" data-idx="${idx}" data-id="${m.id}" data-title="${title.replace(/"/g, "&quot;")}" id="mc-${m.id}">
            <div class="story-cover" style="${imgStyle}"></div>
            <div class="story-body">
              <div class="story-title">${title}</div>
              <div class="story-meta">${tags || "Manga"} ${m.attributes.lastChapter ? "• " + m.attributes.lastChapter + " ch" : ""}</div>
              <div class="story-actions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                ${badge}
                  <button class="btn btn-primary btn-sm read-btn" data-id="${m.id}" data-title="${title.replace(/"/g, "&quot;")}">📖 Đọc ngay</button>
                  <button class="btn btn-ghost btn-sm chapter-btn" data-id="${m.id}" data-title="${title.replace(/"/g, "&quot;")}">📑 Chương</button>
              </div>
            </div>
          </div>`;
        })
        .join("");

      /* Bind read buttons */
      grid.querySelectorAll(".read-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this._openChapters(btn.dataset.id, btn.dataset.title);
        });
      });

      /* Bind chapter buttons */
      grid.querySelectorAll(".chapter-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this._openChapters(btn.dataset.id, btn.dataset.title);
        });
      });

      /* Bind card click to open chapters */
      grid.querySelectorAll(".story-card").forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.closest(".read-btn") || e.target.closest(".chapter-btn"))
            return;
          const id = card.dataset.id;
          const title = card.dataset.title || "";
          if (id) this._openChapters(id, title);
        });
      });
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">❌</div><div class="empty-state-text">Lỗi: ${err.message}</div></div>`;
    }
  },

  async _openChapters(mangaId, title, options = {}) {
    const panel = document.getElementById("lib-chapter-panel");
    const list = document.getElementById("lib-chapter-list");
    const titleEl = document.getElementById("lib-manga-title");
    if (!panel || !list) return;

    this._currentMangaId = mangaId;
    this._currentMangaTitle = title || "";
    this._activeCoverUrl = this._getCoverUrl(mangaId);

    panel.style.display = "block";
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    if (titleEl) titleEl.textContent = `📖 ${title}`;
    list.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-3)">Đang tải danh sách chương...</div>`;

    try {
      const res = await fetch(`/api/mdx/manga/${mangaId}/chapters?limit=100`);
      const json = await res.json();
      const chapters = json.data || [];
      this._chapters = chapters;

      if (!chapters.length) {
        list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-3)">
          <div style="font-size:28px;margin-bottom:10px">😔</div>
          <div style="font-weight:600;margin-bottom:6px">Chưa có chương tiếng Việt</div>
          <div style="font-size:12px">Truyện này chưa được dịch sang tiếng Việt trên MangaDex.</div>
        </div>`;
        return;
      }

      const defaultIndex = Math.max(0, chapters.length - 1);
      const optionsHtml = chapters
        .map((ch, idx) => {
          const num = ch.attributes.chapter || "?";
          const chTitle = ch.attributes.title
            ? ` — ${ch.attributes.title}`
            : "";
          const label = `Chương ${num}${chTitle}`;
          return `<option value="${ch.id}" data-label="${label}" ${idx === defaultIndex ? "selected" : ""}>${label}</option>`;
        })
        .join("");

      list.innerHTML = `
        <div class="chapter-controls">
          <div class="form-group" style="flex:1">
            <label class="form-label">Chọn chương</label>
            <select class="form-select" id="lib-chapter-select">${optionsHtml}</select>
          </div>
          <div class="chapter-actions">
            <button class="btn btn-secondary" id="lib-read-scroll">Đọc (Cuộn)</button>
            <button class="btn btn-primary" id="lib-read-page">Đọc (Trang)</button>
          </div>
        </div>
        <div id="lib-chapter-items">
          ${chapters
            .map((ch) => {
              const num = ch.attributes.chapter || "?";
              const chTitle = ch.attributes.title
                ? ` — ${ch.attributes.title}`
                : "";
              const group =
                ch.relationships?.find((r) => r.type === "scanlation_group")
                  ?.attributes?.name || "Không rõ nhóm dịch";
              const pages = ch.attributes.pages
                ? `${ch.attributes.pages} trang`
                : "";
              return `
            <div class="chapter-row" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:8px;background:var(--bg-2);gap:12px">
              <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
                <span style="font-size:18px">🇻🇳</span>
                <div style="min-width:0">
                  <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Chương ${num}${chTitle}</div>
                  <div style="font-size:11px;color:var(--text-3);margin-top:2px">${group}${pages ? " · " + pages : ""}</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" style="white-space:nowrap" data-cid="${ch.id}" data-manga="${mangaId}" data-title="${title.replace(/"/g, "&quot;")}" data-chapter-label="Chương ${num}${chTitle}">Chọn</button>
            </div>`;
            })
            .join("")}
        </div>`;

      /* Bind chapter read buttons */
      list.querySelectorAll("[data-cid]").forEach((btn) => {
        if (btn.tagName === "BUTTON") {
          btn.addEventListener("click", () => {
            const select = document.getElementById("lib-chapter-select");
            if (select) {
              select.value = btn.dataset.cid;
            }
          });
        }
      });

      document
        .getElementById("lib-read-scroll")
        ?.addEventListener("click", () => this._readSelected("scroll"));
      document
        .getElementById("lib-read-page")
        ?.addEventListener("click", () => this._readSelected("page"));
    } catch (err) {
      list.innerHTML = `<div style="padding:16px;text-align:center;color:var(--red)">Lỗi tải chương: ${err.message}</div>`;
    }
  },

  _readSelected(mode) {
    const select = document.getElementById("lib-chapter-select");
    if (!select) return;
    const chapterId = select.value;
    const option = select.selectedOptions?.[0];
    const chapterLabel = option?.dataset?.label || "";
    if (!chapterId) return;

    this._saveReadingState({
      mangaId: this._currentMangaId,
      mangaTitle: this._currentMangaTitle,
      chapterId,
      chapterLabel,
      coverUrl: this._activeCoverUrl,
      mode,
    });
    window._readerMangaTitle = this._currentMangaTitle;
    App.navigate("reader", {
      mangaId: this._currentMangaId,
      chapterId,
      mode,
      autoLoad: true,
    });
  },

  _getCoverUrl(mangaId) {
    const manga = this._mangas.find((m) => m.id === mangaId);
    if (!manga) return "";
    const cover = manga.relationships.find((r) => r.type === "cover_art");
    if (!cover?.attributes?.fileName) return "";
    return mdxCoverUrl(manga.id, cover.attributes.fileName);
  },

  _saveReadingState(payload) {
    try {
      localStorage.setItem(
        "storylens.reading",
        JSON.stringify({
          mangaId: payload.mangaId,
          mangaTitle: payload.mangaTitle,
          chapterId: payload.chapterId,
          chapterLabel: payload.chapterLabel,
          coverUrl: payload.coverUrl || "",
          mode: payload.mode || "scroll",
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch (e) {
      /* ignore */
    }
  },
};
