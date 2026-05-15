/* ── Translate Studio page ───────────────────────────────── */
window.StudioPage = {
  _ws: null,
  _jobId: null,
  _stageMap: {
    'job.started':        0,
    'image.loaded':       1,
    'detect.boxes_found': 2,
    'ocr.done':           3,
    'rag.done':           4,
    'grok.translation_done': 5,
    'grok.critic_done':   6,
    'render.done':        7,
    'job.done':           8,
  },

  async render() {
    const mangas = await API.get('/api/v1/manga').catch(() => []);
    const mangaOptions = mangas.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
    return `
    <div class="page-header">
      <div>
        <div class="page-title">🎬 Translate Studio</div>
        <div class="page-subtitle">Upload a manga page and watch the AI pipeline in real time</div>
      </div>
    </div>
    <div class="page-body">
      <div class="col-2">
        <!-- Upload form -->
        <div class="card">
          <div class="card-header"><span class="card-title">📤 Upload Page</span></div>
          <div class="card-body">
            <form id="studio-form" style="display:flex;flex-direction:column;gap:14px">
              <div class="form-group">
                <label class="form-label">Manga Project</label>
                <div style="display:flex;gap:8px">
                  <select class="form-select" id="s-manga" style="flex:1">
                    <option value="">— chọn hoặc tạo mới —</option>${mangaOptions}
                    <option value="__new__">➕ Tạo truyện mới...</option>
                  </select>
                </div>
                <div id="new-manga-wrap" style="display:none;margin-top:8px">
                  <input class="form-input" id="s-manga-new" placeholder="Nhập tên truyện mới..." style="width:100%">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Chapter Number *</label>
                <input class="form-input" id="s-chapter" placeholder="1, 2, 3..." type="number" min="1" value="1" required>
              </div>
              <div class="form-group">
                <label class="form-label">Page Index</label>
                <input class="form-input" id="s-page-idx" type="number" value="0" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">Manga Image *</label>
                <div class="drop-zone" id="drop-zone">
                  <div class="drop-zone-icon">🖼️</div>
                  <div class="drop-zone-text">Drop image here or click to browse</div>
                  <div class="drop-zone-hint">JPG / PNG / WebP — max 30MB</div>
                  <input type="file" id="s-file" accept=".jpg,.jpeg,.png,.webp" style="display:none">
                </div>
                <div id="file-preview" style="margin-top:8px"></div>
              </div>
              <button type="submit" class="btn btn-primary btn-lg" id="submit-btn">🚀 Start Translation</button>
            </form>
          </div>
        </div>

        <!-- Progress panel -->
        <div>
          <div class="card">
            <div class="card-header"><span class="card-title">📊 Pipeline Progress</span></div>
            <div class="card-body">
              <!-- Pipeline stages -->
              <div class="pipeline" id="pipeline-stages">
                ${['Loaded','Detect','OCR','RAG','Translate','Critic','Render','Done'].map((s,i) =>
                  `<div class="stage" id="stage-${i}">
                    <div class="stage-dot">${['🖼','🔍','📖','🧠','🤖','✏️','🎨','✅'][i]}</div>
                    <div class="stage-label">${s}</div>
                  </div>`
                ).join('')}
              </div>
              ${ProgressBar.create('main-progress')}
              <div id="progress-label" style="font-size:12px;color:var(--text-3);margin-top:6px;text-align:center">Waiting…</div>
            </div>
          </div>
          <div class="card mt-16">
            <div class="card-header">
              <span class="card-title">📡 Event Stream</span>
              <span class="badge badge-default" id="ws-badge">Disconnected</span>
            </div>
            <div class="event-stream" id="event-stream">
              <div style="color:var(--text-3);font-size:12px">Start a job to see events…</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  mount() {
    this._setupDropZone();
    document.getElementById('studio-form')?.addEventListener('submit', (e) => this._submit(e));
    document.getElementById('s-manga')?.addEventListener('change', (e) => {
      const wrap = document.getElementById('new-manga-wrap');
      if (wrap) wrap.style.display = e.target.value === '__new__' ? 'block' : 'none';
    });
  },

  unmount() {
    if (this._ws) { this._ws.close(); this._ws = null; }
  },

  _setupDropZone() {
    const zone = document.getElementById('drop-zone');
    const input = document.getElementById('s-file');
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) this._previewFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => { if (input.files[0]) this._previewFile(input.files[0]); });
  },

  _previewFile(file) {
    const input = document.getElementById('s-file');
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    const url = URL.createObjectURL(file);
    const preview = document.getElementById('file-preview');
    if (preview) preview.innerHTML = `<img src="${url}" style="border-radius:var(--r);border:1px solid var(--border);max-height:150px;object-fit:contain">`;
    const zone = document.getElementById('drop-zone');
    if (zone) zone.querySelector('.drop-zone-text').textContent = file.name;
  },

  async _submit(e) {
    e.preventDefault();
    let mangaId = document.getElementById('s-manga').value;
    const chapterNum = document.getElementById('s-chapter').value.trim();
    const pageIdx = parseInt(document.getElementById('s-page-idx').value || '0');
    const fileInput = document.getElementById('s-file');
    const file = fileInput?.files?.[0];

    if (!chapterNum || !file) { Toast.warn('Cần chọn chapter và ảnh'); return; }

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Đang xử lý…';

    try {
      /* Nếu chọn "Tạo mới" → tạo manga project trước */
      if (mangaId === '__new__' || !mangaId) {
        const newTitle = document.getElementById('s-manga-new')?.value.trim()
          || `Truyện ${new Date().toLocaleString('vi-VN')}`;
        const created = await API.post('/api/v1/manga', { title: newTitle });
        mangaId = created.id;
        Toast.info(`📚 Đã tạo project: ${newTitle}`);
      }

      /* Tìm hoặc tạo chapter */
      const chapters = await API.get(`/api/v1/manga/${mangaId}/chapters`).catch(() => []);
      let chapter = chapters.find(c => String(c.chapter_number) === String(chapterNum));
      if (!chapter) {
        chapter = await API.post(`/api/v1/manga/${mangaId}/chapters`, { chapter_number: parseInt(chapterNum) });
      }
      const chapterId = chapter.id;

      const fd = new FormData();
      fd.append('chapter_id', chapterId);
      fd.append('page_index', pageIdx);
      fd.append('image', file);

      const job = await API.postForm(`/api/v1/manga/${mangaId}/translate/pages`, fd);
      this._jobId = job.job_id;
      Toast.success(`Job created: ${job.job_id.slice(0,8)}…`);
      this._connectWS(job.job_id);
    } catch(err) {
      Toast.error('Submit failed: ' + err.message);
      btn.disabled = false;
      btn.textContent = '🚀 Start Translation';
    }
  },

  _connectWS(jobId) {
    const badge = document.getElementById('ws-badge');
    if (badge) { badge.textContent = 'Connecting…'; badge.className = 'badge badge-yellow'; }

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this._ws = new WebSocket(`${proto}://${location.host}/ws/v1/jobs/${jobId}`);

    this._ws.onopen = () => {
      if (badge) { badge.textContent = 'Connected'; badge.className = 'badge badge-green'; }
    };
    this._ws.onclose = () => {
      if (badge) { badge.textContent = 'Disconnected'; badge.className = 'badge badge-default'; }
    };
    this._ws.onmessage = (ev) => {
      const event = JSON.parse(ev.data);
      if (event.type === 'ping') return;
      this._handleEvent(event);
    };
  },

  _handleEvent(event) {
    // Progress bar
    ProgressBar.set('main-progress', event.progress || 0);
    const label = document.getElementById('progress-label');
    if (label) label.textContent = `${event.type} — ${event.progress}%`;

    // Stage highlighting
    const stageIdx = this._stageMap[event.type];
    if (stageIdx !== undefined) {
      document.querySelectorAll('.stage').forEach((el, i) => {
        el.className = 'stage' + (i < stageIdx ? ' done' : i === stageIdx ? ' active' : '');
      });
    }
    if (event.type === 'job.done') {
      document.querySelectorAll('.stage').forEach(el => el.className = 'stage done');
      const btn = document.getElementById('submit-btn');
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Start Translation'; }
      Toast.success('Translation complete! Go to Review Studio.');
    }
    if (event.type === 'job.failed') {
      Toast.error('Job failed: ' + (event.payload?.error || 'Unknown'));
      const btn = document.getElementById('submit-btn');
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Start Translation'; }
    }

    // Event stream log
    const stream = document.getElementById('event-stream');
    if (stream) {
      const time = new Date().toLocaleTimeString('vi-VN');
      const typeClass = event.type.includes('done') || event.type === 'job.done' ? 'done'
                      : event.type.includes('failed') || event.type.includes('error') ? 'error' : '';
      const item = document.createElement('div');
      item.className = 'event-item';
      item.innerHTML = `
        <span class="event-time">${time}</span>
        <span class="event-type ${typeClass}">${event.type}</span>
        <span class="event-detail">${event.progress}% — ${JSON.stringify(event.payload || {}).slice(0,80)}</span>`;
      stream.appendChild(item);
      stream.scrollTop = stream.scrollHeight;
      // Trim old events
      while (stream.children.length > 80) stream.removeChild(stream.firstChild);
    }
  },
};
