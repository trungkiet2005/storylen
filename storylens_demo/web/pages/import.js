/* ── Import Source / Upload page ─────────────────────────── */
window.ImportPage = {
  _mangas: [],

  async render() {
    return `
    <div class="page-header">
      <div>
        <div class="page-title">📥 Import Source</div>
        <div class="page-subtitle">Create manga projects and upload chapters</div>
      </div>
    </div>
    <div class="page-body">
      <div class="col-2">
        <!-- Create manga -->
        <div class="card">
          <div class="card-header"><span class="card-title">✨ New Manga Project</span></div>
          <div class="card-body">
            <form id="manga-form" style="display:flex;flex-direction:column;gap:14px">
              <div class="form-group">
                <label class="form-label">Title *</label>
                <input class="form-input" id="manga-title" placeholder="e.g. Doraemon" required>
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Source Language</label>
                  <select class="form-select" id="manga-src">
                    <option value="ja">Japanese</option>
                    <option value="zh">Chinese</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Target Language</label>
                  <select class="form-select" id="manga-tgt">
                    <option value="vi">Vietnamese</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              <button type="submit" class="btn btn-primary">➕ Create Project</button>
            </form>
          </div>
        </div>
        <!-- Add chapter -->
        <div class="card">
          <div class="card-header"><span class="card-title">📖 Add Chapter</span></div>
          <div class="card-body">
            <form id="chapter-form" style="display:flex;flex-direction:column;gap:14px">
              <div class="form-group">
                <label class="form-label">Manga Project *</label>
                <select class="form-select" id="chapter-manga"></select>
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Chapter Number *</label>
                  <input class="form-input" id="chapter-num" type="number" min="1" value="1">
                </div>
                <div class="form-group">
                  <label class="form-label">Title (optional)</label>
                  <input class="form-input" id="chapter-title" placeholder="Chapter title">
                </div>
              </div>
              <button type="submit" class="btn btn-primary">📖 Add Chapter</button>
            </form>
          </div>
        </div>
      </div>
      <!-- Manga list -->
      <div class="card mt-24">
        <div class="card-header"><span class="card-title">📚 Your Projects</span></div>
        <div class="table-wrap">
          <table><thead><tr><th>Title</th><th>Lang</th><th>Published</th><th>ID</th></tr></thead>
          <tbody id="manga-table-body"></tbody></table>
        </div>
      </div>
    </div>`;
  },

  async mount() {
    await this._loadMangas();
    document.getElementById('manga-form')?.addEventListener('submit', (e) => this._createManga(e));
    document.getElementById('chapter-form')?.addEventListener('submit', (e) => this._createChapter(e));
  },

  async _loadMangas() {
    this._mangas = await API.get('/api/v1/manga').catch(() => []);
    const sel = document.getElementById('chapter-manga');
    if (sel) sel.innerHTML = this._mangas.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
    const tbody = document.getElementById('manga-table-body');
    if (!tbody) return;
    if (!this._mangas.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-3)">No projects yet</td></tr>';
      return;
    }
    tbody.innerHTML = this._mangas.map(m => `<tr>
      <td style="font-weight:600">${m.title}</td>
      <td>${m.source_language} → ${m.target_language}</td>
      <td>${m.published ? '<span class="badge badge-green">Published</span>' : '<span class="badge badge-default">Draft</span>'}</td>
      <td class="font-mono" style="font-size:11px;color:var(--text-3)">${m.id.slice(0,8)}…</td>
    </tr>`).join('');
  },

  async _createManga(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      await API.post('/api/v1/manga', {
        title: document.getElementById('manga-title').value.trim(),
        source_language: document.getElementById('manga-src').value,
        target_language: document.getElementById('manga-tgt').value,
      });
      Toast.success('Manga project created!');
      document.getElementById('manga-title').value = '';
      await this._loadMangas();
    } catch(e) { Toast.error(e.message); }
    finally { btn.disabled = false; }
  },

  async _createChapter(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    const mangaId = document.getElementById('chapter-manga').value;
    try {
      await API.post(`/api/v1/manga/${mangaId}/chapters`, {
        chapter_number: parseInt(document.getElementById('chapter-num').value),
        title: document.getElementById('chapter-title').value || null,
      });
      Toast.success('Chapter added!');
    } catch(e) { Toast.error(e.message); }
    finally { btn.disabled = false; }
  },
};
