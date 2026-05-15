/* ── Search page ─────────────────────────────────────────── */
window.SearchPage = {
  _currentQuery: '',
  _currentGenre: '',
  _loading: false,

  async render() {
    return `
    <div class="page-header">
      <div>
        <div class="page-title">🔎 Tìm truyện</div>
        <div class="page-subtitle">Dữ liệu thực từ MangaDex · Lọc theo thể loại, trạng thái phát hành.</div>
      </div>
      <div class="search-meta" id="search-total">Đang tải...</div>
    </div>
    <div class="page-body">
      <div class="search-bar">
        <input class="form-input" id="search-input" placeholder="Nhập tên truyện..." value="">
        <button class="btn btn-primary" id="search-btn">Tìm kiếm</button>
      </div>
      <div class="chip-row" id="genre-chips">
        <button class="chip active" data-genre="">Tất cả</button>
        <button class="chip" data-genre="391b0423-d847-456f-aff0-8b0cfc03066b">Action</button>
        <button class="chip" data-genre="cdc58593-87dd-415e-bbc0-2ec27bf404cc">Fantasy</button>
        <button class="chip" data-genre="423e2eae-a7a2-4a8b-ac03-a8351462d71d">Romance</button>
        <button class="chip" data-genre="4d32cc48-9f00-4cca-9b5a-a839f0764984">Comedy</button>
        <button class="chip" data-genre="ace04997-f6bd-436e-b261-779182193d3d">Isekai</button>
        <button class="chip" data-genre="87cc87cd-a395-47af-b27a-93258283bbc6">Adventure</button>
        <button class="chip" data-genre="e5301a23-ebd9-49dd-a0cb-2add944c7fe9">Slice of Life</button>
      </div>
      <div class="result-grid" id="search-results">
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon" style="animation:spin 1s linear infinite">⏳</div>
          <div class="empty-state-text">Đang tải truyện...</div>
        </div>
      </div>
    </div>`;
  },

  async mount() {
    document.getElementById('search-btn')?.addEventListener('click', () => this._doSearch());
    document.getElementById('search-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._doSearch();
    });

    document.getElementById('genre-chips')?.addEventListener('click', e => {
      const chip = e.target.closest('[data-genre]');
      if (!chip) return;
      document.querySelectorAll('#genre-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      this._currentGenre = chip.dataset.genre;
      this._doSearch();
    });

    await this._doSearch();
  },

  async _doSearch() {
    if (this._loading) return;
    this._loading = true;
    const query = document.getElementById('search-input')?.value?.trim() || '';
    this._currentQuery = query;

    const grid = document.getElementById('search-results');
    if (grid) grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">⏳</div>
        <div class="empty-state-text">Đang tải...</div>
      </div>`;

    try {
      let url = `/api/mdx/manga?limit=24`;

      if (query) {
        url += `&title=${encodeURIComponent(query)}`;
      }
      if (this._currentGenre) {
        url += `&includedTags=${encodeURIComponent(this._currentGenre)}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      const mangas = json.data || [];

      const total = document.getElementById('search-total');
      if (total) total.textContent = `${json.total ?? mangas.length} truyện`;

      if (!grid) return;

      if (!mangas.length) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-state-icon">😔</div>
            <div class="empty-state-text">Không tìm thấy truyện nào</div>
          </div>`;
        return;
      }

      grid.innerHTML = mangas.map(m => {
        const cover = m.relationships.find(r => r.type === 'cover_art');
        const coverUrl = cover?.attributes?.fileName
          ? `https://uploads.mangadex.org/covers/${m.id}/${cover.attributes.fileName}.256.jpg`
          : null;
        const imgStyle = coverUrl
          ? `background-image:url('${coverUrl}')`
          : `background:linear-gradient(135deg,#1d1e26,#2a2b3d)`;
        const t = m.attributes.title;
        const title = t.vi || t.en || t['ja-ro'] || Object.values(t)[0];
        const genres = m.attributes.tags
          .filter(t => t.attributes.group === 'genre')
          .map(t => t.attributes.name.en)
          .slice(0, 2).join(' • ');
        const badge = m.attributes.status === 'completed'
          ? `<span class="badge badge-green" style="font-size:10px">Hoàn thành</span>`
          : `<span class="badge badge-accent" style="font-size:10px">Đang ra</span>`;
        return `
          <div class="story-card">
            <div class="story-cover" style="${imgStyle}"></div>
            <div class="story-body">
              <div class="story-title">${title}</div>
              <div class="story-meta">${genres || 'Manga'} ${m.attributes.lastChapter ? '• ' + m.attributes.lastChapter + ' chương' : ''}</div>
              <div class="story-actions" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                ${badge}
                <button class="btn btn-primary btn-sm read-btn" data-id="${m.id}" data-title="${title.replace(/"/g, '&quot;')}">📖 Đọc</button>
                <a class="btn btn-secondary btn-sm" href="https://mangadex.org/title/${m.id}" target="_blank">MangaDex ↗</a>
              </div>
            </div>
          </div>`;
      }).join('');

      grid.querySelectorAll('.read-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          App.navigate('library', { mangaId: btn.dataset.id, mangaTitle: btn.dataset.title });
        });
      });

    } catch (e) {
      const grid = document.getElementById('search-results');
      if (grid) grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">❌</div>
          <div class="empty-state-text">Lỗi kết nối MangaDex API</div>
          <div class="empty-state-sub">${e.message}</div>
        </div>`;
    } finally {
      this._loading = false;
    }
  },
};
