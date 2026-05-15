/* ── Home / Landing page ────────────────────────────────── */

/* Helpers to work with MangaDex API */
const MDX = {
  getCoverUrl(mangaId, fileName, size = 512) {
    const rawUrl = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.${size}.jpg`;
    return `/api/mdx/cover-proxy?url=${encodeURIComponent(rawUrl)}`;
  },

  getTitle(manga) {
    const t = manga.attributes.title;
    return t.vi || t.en || t["ja-ro"] || Object.values(t)[0] || "Unknown";
  },

  getGenres(manga) {
    return manga.attributes.tags
      .filter((t) => t.attributes.group === "genre")
      .map((t) => t.attributes.name.en || Object.values(t.attributes.name)[0])
      .slice(0, 3)
      .join(" • ");
  },

  async fetchPopular(limit = 20) {
    try {
      const url = `/api/mdx/manga/popular?limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).map((m) => {
        const cover = m.relationships.find((r) => r.type === "cover_art");
        const coverUrl = cover?.attributes?.fileName
          ? this.getCoverUrl(m.id, cover.attributes.fileName)
          : null;
        return {
          id: m.id,
          title: this.getTitle(m),
          coverUrl,
          genres: this.getGenres(m),
          status: m.attributes.status,
          chapters: m.attributes.lastChapter,
        };
      });
    } catch (e) {
      return [];
    }
  },
};

window.HomePage = {
  _slideshowTimer: null,
  _mangas: [],
  _reading: null,

  async render() {
    /* Fetch manga from MangaDex */
    this._mangas = await MDX.fetchPopular(24);
    this._local = await API.get("/api/v1/manga").catch(() => []);
    this._reading = this._getReadingState();
    this._translations = await this._loadTranslations();

    const coverHtml = [...this._mangas, ...this._mangas]
      .map((m, i) => {
        const imgStyle = m.coverUrl
          ? `background-image:url('${m.coverUrl}')`
          : `background: linear-gradient(135deg, #1a1a2e, #16213e)`;
        return `
        <div class="cover-card" style="${imgStyle}">
          <div class="cover-tag">${m.title}</div>
          <div class="cover-index">#${(i % this._mangas.length) + 1}</div>
        </div>`;
      })
      .join("");

    const featuredHtml = this._mangas
      .slice(0, 12)
      .map((m, i) => {
        const imgStyle = m.coverUrl
          ? `background-image:url('${m.coverUrl}')`
          : `background:linear-gradient(135deg,#1d1e26,#2a2b3d)`;
        const badge =
          m.status === "completed"
            ? `<span class="badge badge-green" style="font-size:10px">Hoàn thành</span>`
            : `<span class="badge badge-accent" style="font-size:10px">Đang ra</span>`;
        const meta = `${m.genres || "Manga"}${m.chapters ? " • " + m.chapters + " chương" : ""}`;
        return `
        <div class="story-card" data-preview="true" data-title="${m.title.replace(/"/g, "&quot;")}" data-meta="${meta.replace(/"/g, "&quot;")}" data-cover="${m.coverUrl || ""}" data-manga-id="${m.id}">
          <div class="story-cover" style="${imgStyle}"></div>
          <div class="story-body">
            <div class="story-title">${m.title}</div>
            <div class="story-meta">${meta}</div>
            <div class="story-actions" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              ${badge}
              <button class="btn btn-primary btn-sm" data-read-btn="true" data-manga-id="${m.id}" data-title="${m.title.replace(/"/g, "&quot;")}">Đọc ngay</button>
              <button class="btn btn-secondary btn-sm" data-preview-btn="true">Xem nhanh</button>
            </div>
          </div>
        </div>`;
      })
      .join("");

    const localHtml = (this._local || [])
      .slice(0, 6)
      .map((m) => {
        const imgStyle = m.cover_url
          ? `background-image:url('${m.cover_url}')`
          : `background:linear-gradient(135deg,#222236,#403243)`;
        return `
        <div class="story-card" data-preview="true" data-title="${m.title.replace(/"/g, "&quot;")}" data-meta="Tác phẩm đã xuất bản" data-cover="${m.cover_url || ""}">
          <div class="story-cover" style="${imgStyle}"></div>
          <div class="story-body">
            <div class="story-title">${m.title}</div>
            <div class="story-meta">Tác phẩm của tôi</div>
            <div class="story-actions">
              <button class="btn btn-secondary btn-sm" data-preview-btn="true">Xem nhanh</button>
            </div>
          </div>
        </div>`;
      })
      .join("");

    const readingHtml = this._reading
      ? `
      <section class="section reading-section">
        <div class="section-head">
          <h2>Đang đọc</h2>
          <p>Tiếp tục chương đang xem gần nhất.</p>
        </div>
        <div class="reading-card">
          <div class="reading-cover" style="${this._reading.coverUrl ? `background-image:url('${this._reading.coverUrl}')` : "background:linear-gradient(135deg,#1d1e26,#2a2b3d)"}"></div>
          <div class="reading-body">
            <div class="reading-title">${this._reading.mangaTitle || "Manga"}</div>
            <div class="reading-meta">${this._reading.chapterLabel || "Chương mới"}</div>
            <div class="reading-actions">
              <button class="btn btn-primary" id="reading-continue" data-manga="${this._reading.mangaId}" data-chapter="${this._reading.chapterId}" data-title="${(this._reading.mangaTitle || "").replace(/"/g, "&quot;")}">Đọc tiếp</button>
            </div>
          </div>
        </div>
      </section>`
      : "";

    const translationHtml = this._translations.length
      ? `
      <section class="section">
        <div class="section-head">
          <h2>Tuyển tập dịch</h2>
          <p>Các trang đã render gần đây từ pipeline dịch.</p>
        </div>
        <div class="story-grid">
          ${this._translations
            .map((t) => {
              const imgStyle = t.imageUrl
                ? `background-image:url('${t.imageUrl}')`
                : "background:linear-gradient(135deg,#1d1e26,#2a2b3d)";
              const label =
                t.pageIndex >= 0 ? `Trang ${t.pageIndex + 1}` : "Trang";
              return `
              <div class="story-card">
                <div class="story-cover" style="${imgStyle}"></div>
                <div class="story-body">
                  <div class="story-title">${label}</div>
                  <div class="story-meta">Job ${t.jobId.slice(0, 8)}...</div>
                  <div class="story-actions">
                    ${t.imageUrl ? `<a class="btn btn-secondary btn-sm" href="${t.imageUrl}" target="_blank" rel="noopener">Xem bản dịch</a>` : ""}
                  </div>
                </div>
              </div>`;
            })
            .join("")}
        </div>
      </section>`
      : `
      <section class="section">
        <div class="section-head">
          <h2>Tuyển tập dịch</h2>
          <p>Chưa có bản dịch để hiển thị.</p>
        </div>
      </section>`;

    return `
    <div class="landing">
      <header class="landing-topbar">
        <div class="brand">
          <span class="brand-dot"></span>
          <span>StoryLens</span>
        </div>
        <nav class="top-links">
          <a href="#/search">Tìm truyện</a>
          <a href="#danh-sach">Danh sách</a>
          <a href="#/register">Đăng ký dịch</a>
          <a href="#/login" class="btn btn-primary btn-sm">Dịch truyện</a>
        </nav>
      </header>

      <section class="hero">
        <div class="hero-text">
          <div class="hero-kicker">Nền tảng dịch truyện cho đội nhóm</div>
          <h1 class="hero-title">Kho truyện số hóa, dịch nhanh,<br>kiểm soát chất lượng từng khung thoại.</h1>
          <p class="hero-lead">Sắp xếp quy trình dịch truyện từ A-Z: nhận dự án, dịch, biên tập và xuất bản trong một giao diện gọn gàng, đậm chất truyện tranh.</p>
          <div class="hero-actions stagger">
            <a class="btn btn-primary btn-lg" href="#/login">Bắt đầu dịch</a>
            <a class="btn btn-secondary btn-lg" href="#/search">Khám phá kho truyện</a>
            <a class="btn btn-ghost btn-lg" href="#/register">Đăng ký đội dịch</a>
          </div>
          <div class="hero-meta">
            <div class="meta-item">🎬 Studio dịch truyện</div>
            <div class="meta-item">🛡️ Duyệt quyền người dịch</div>
            <div class="meta-item">📚 Thư viện truyện nổi bật</div>
          </div>
        </div>
        <div class="hero-panel">
          <div class="panel-card">
            <div class="panel-title">Luồng vận hành</div>
            <div class="panel-steps">
              <div class="panel-step">
                <div class="step-dot">1</div>
                <div>
                  <div class="step-title">Đăng ký dịch</div>
                  <div class="step-desc">Gửi yêu cầu và hồ sơ nhóm dịch.</div>
                </div>
              </div>
              <div class="panel-step">
                <div class="step-dot">2</div>
                <div>
                  <div class="step-title">Dịch &amp; biên tập</div>
                  <div class="step-desc">Dịch theo chương, sửa thoại trực quan.</div>
                </div>
              </div>
              <div class="panel-step">
                <div class="step-dot">3</div>
                <div>
                  <div class="step-title">Xuất bản</div>
                  <div class="step-desc">Duyệt QC và phát hành cho độc giả.</div>
                </div>
              </div>
            </div>
            <a class="panel-link" href="#/register">Đăng ký dịch ngay →</a>
          </div>
        </div>
      </section>

      <section class="marquee">
        <div class="marquee-track">
          ${coverHtml}
        </div>
      </section>

      ${readingHtml}

      ${translationHtml}

      <section class="section local-section">
        <div class="section-head">
          <h2>Tác phẩm của tôi</h2>
          <p>Những truyện bạn đã tạo hoặc được cấp quyền quản lý.</p>
        </div>
        <div class="story-grid">
          ${localHtml || '<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-text">Chưa có tác phẩm của bạn</div></div>'}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Không gian cho đội dịch chuyên nghiệp</h2>
          <p>Tối ưu thao tác, giảm thời gian thao tác lặp, tập trung vào chất lượng bản dịch.</p>
        </div>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">🧭</div>
            <div class="feature-title">Theo dõi tiến độ</div>
            <p>Quản lý project theo chương, phân công từng người dịch.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🎨</div>
            <div class="feature-title">Giữ phong cách thoại</div>
            <p>Tùy biến giọng điệu nhân vật và từ vựng đặc thù.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔒</div>
            <div class="feature-title">Duyệt quyền người dịch</div>
            <p>Admin bật quyền dịch sau khi xét duyệt hồ sơ.</p>
          </div>
        </div>
      </section>

      <section class="section" id="danh-sach">
        <div class="section-head">
          <h2>Truyện nổi bật từ MangaDex</h2>
          <p>Dữ liệu thực từ MangaDex API — những tựa manga phổ biến nhất có bản dịch tiếng Việt.</p>
        </div>
        <div class="story-grid">
          ${featuredHtml || '<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-text">Đang tải truyện...</div></div>'}
        </div>
      </section>

      <section class="section search-cta">
        <div class="search-panel">
          <div>
            <h3>Tìm truyện theo thể loại, tác giả, nhóm dịch</h3>
            <p>Trang tìm kiếm giúp lọc nhanh, phân loại chất lượng, và gợi ý dự án phù hợp.</p>
          </div>
          <div class="search-actions">
            <a class="btn btn-primary btn-lg" href="#/search">Mở trang tìm kiếm</a>
            <a class="btn btn-secondary btn-lg" href="#/login">Dịch truyện ngay</a>
          </div>
        </div>
      </section>

      <div id="story-overlay" class="story-overlay" aria-hidden="true">
        <div class="story-overlay-backdrop" data-action="close"></div>
        <div class="story-overlay-card">
          <button class="story-overlay-close" data-action="close">✕</button>
          <div class="story-overlay-cover" id="story-overlay-cover"></div>
          <div class="story-overlay-body">
            <div class="story-overlay-title" id="story-overlay-title"></div>
            <div class="story-overlay-meta" id="story-overlay-meta"></div>
            <div class="story-overlay-actions">
              <button class="btn btn-primary" id="story-overlay-read">Đọc truyện</button>
              <button class="btn btn-ghost" id="story-overlay-open">Mở kho truyện</button>
              <button class="btn btn-ghost" data-action="close">Đóng</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  mount() {
    this._bindPreview();
    this._bindReading();
    /* ── Background slideshow ── */
    const bgImages = [
      "/static/pages/image/anh-kimetsu-no-yaiba-1.jpg",
      "/static/pages/image/demon-slayer-wallpapers-v0-tzdlua1d64me1.webp",
      "/static/pages/image/blue-lock-movie-thumb.jpg",
      "/static/pages/image/anh-anime-one-piece.jpg",
      "/static/pages/image/hinh-nen-thanh-guom-diet-quy-tanjiro.jpg",
      "/static/pages/image/hinh-nen-kimetsu-yaiba-ngau-3-1.webp",
      "/static/pages/image/hinh-nen-may-tinh-kimetsu-01.jpg",
    ];

    const old = document.getElementById("bg-slideshow");
    if (old) old.remove();
    if (this._slideshowTimer) clearInterval(this._slideshowTimer);

    const container = document.createElement("div");
    container.id = "bg-slideshow";
    container.className = "bg-slideshow";

    const overlay = document.createElement("div");
    overlay.className = "bg-overlay";

    const slides = bgImages.map((src, i) => {
      const slide = document.createElement("div");
      slide.className = "bg-slide" + (i === 0 ? " active" : "");
      slide.style.backgroundImage = `url('${src}')`;
      return slide;
    });

    slides.forEach((s) => container.appendChild(s));
    container.appendChild(overlay);
    document.body.insertBefore(container, document.body.firstChild);

    let current = 0;
    this._slideshowTimer = setInterval(() => {
      slides[current].classList.remove("active");
      current = (current + 1) % slides.length;
      slides[current].classList.add("active");
    }, 30000);
  },

  _bindPreview() {
    const overlay = document.getElementById("story-overlay");
    if (!overlay) return;

    document
      .querySelectorAll('.story-card[data-preview="true"]')
      .forEach((card) => {
        card.addEventListener("click", () => this._openPreview(card));
        const btn = card.querySelector('[data-preview-btn="true"]');
        if (btn)
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            this._openPreview(card);
          });
      });

    document.querySelectorAll('[data-read-btn="true"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._readNow(btn.dataset.mangaId, btn.dataset.title);
      });
    });

    overlay.querySelectorAll('[data-action="close"]').forEach((el) => {
      el.addEventListener("click", () => this._closePreview());
    });

    const openBtn = document.getElementById("story-overlay-open");
    if (openBtn) {
      openBtn.addEventListener("click", () => {
        this._closePreview();
        window.location.hash = "#/library";
      });
    }

    const readBtn = document.getElementById("story-overlay-read");
    if (readBtn) {
      readBtn.addEventListener("click", () => this._readFromPreview());
    }
  },

  _openPreview(card) {
    const overlay = document.getElementById("story-overlay");
    if (!overlay) return;
    const title = card.dataset.title || "Manga";
    const meta = card.dataset.meta || "";
    const cover = card.dataset.cover || "";
    const cardCover = card.querySelector(".story-cover");
    const cardCoverStyle = cardCover ? cardCover.style.backgroundImage : "";
    const mangaId = card.dataset.mangaId || "";

    const titleEl = document.getElementById("story-overlay-title");
    const metaEl = document.getElementById("story-overlay-meta");
    const coverEl = document.getElementById("story-overlay-cover");
    if (titleEl) titleEl.textContent = title;
    if (metaEl) metaEl.textContent = meta;
    if (coverEl) {
      if (cover) {
        coverEl.style.backgroundImage = `url('${cover}')`;
      } else if (cardCoverStyle) {
        coverEl.style.backgroundImage = cardCoverStyle;
      } else {
        coverEl.style.backgroundImage =
          "linear-gradient(135deg,#1d1e26,#2a2b3d)";
      }
    }

    this._previewMangaId = mangaId;
    this._previewMangaTitle = title;
    const readBtn = document.getElementById("story-overlay-read");
    if (readBtn) {
      readBtn.style.display = mangaId ? "inline-flex" : "none";
    }

    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
  },

  _closePreview() {
    const overlay = document.getElementById("story-overlay");
    if (!overlay) return;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    this._previewMangaId = "";
    this._previewMangaTitle = "";
  },

  _readFromPreview() {
    if (!this._previewMangaId) return;
    this._closePreview();
    this._readNow(this._previewMangaId, this._previewMangaTitle);
  },

  _readNow(mangaId, title) {
    if (!mangaId) return;
    if (window.App?.navigate) {
      window.App.navigate("library", {
        mangaId,
        mangaTitle: title || "",
      });
    } else {
      window.location.hash = "#/library";
    }
  },

  _bindReading() {
    const btn = document.getElementById("reading-continue");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const mangaId = btn.dataset.manga;
      const chapterId = btn.dataset.chapter;
      const title = btn.dataset.title || "";
      if (!mangaId || !chapterId) return;
      window._readerMangaTitle = title;
      App.navigate("reader", { mangaId, chapterId });
    });
  },

  _getReadingState() {
    try {
      const raw = localStorage.getItem("storylens.reading");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  async _loadTranslations() {
    try {
      const jobs = await API.get("/api/v1/jobs?limit=12");
      const done = (jobs || []).filter((j) =>
        ["done", "rendered"].includes(j.status),
      );
      const results = await Promise.all(
        done.slice(0, 6).map(async (j) => {
          try {
            const res = await API.get(`/api/v1/jobs/${j.id}/result`);
            const page = res.page || {};
            return {
              jobId: j.id,
              imageUrl: page.output_url || page.input_url || "",
              pageIndex:
                typeof page.page_index === "number" ? page.page_index : -1,
            };
          } catch (e) {
            return null;
          }
        }),
      );
      return results.filter(Boolean);
    } catch (e) {
      return [];
    }
  },

  unmount() {
    const el = document.getElementById("bg-slideshow");
    if (el) el.remove();
    if (this._slideshowTimer) {
      clearInterval(this._slideshowTimer);
      this._slideshowTimer = null;
    }
  },
};
