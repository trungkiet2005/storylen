/* ── Admin Users Management ───────────────────────────────── */
window.AdminUsersPage = {
  _users: [],
  _activeFilter: '',

  async render() {
    return `
    <div class="page-header">
      <div>
        <div class="page-title">👥 Quản lý Users</div>
        <div class="page-subtitle">Phê duyệt dịch giả · Xem & kiểm tra API keys.</div>
      </div>
    </div>
    <div class="page-body">
      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-bottom:24px">
        <div class="card" style="padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--accent)" id="stat-total">—</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:4px">Tổng Users</div>
        </div>
        <div class="card" style="padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#f59e0b" id="stat-pending">—</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:4px">Chờ duyệt</div>
        </div>
        <div class="card" style="padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#10b981" id="stat-approved">—</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:4px">Đã duyệt</div>
        </div>
        <div class="card" style="padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--accent)" id="stat-mangas">—</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:4px">Tổng truyện upload</div>
        </div>
      </div>

      <!-- Filter -->
      <div style="display:flex;gap:8px;margin-bottom:16px" id="filter-bar">
        <button class="chip active" data-filter="">Tất cả</button>
        <button class="chip" data-filter="pending">⏳ Chờ duyệt</button>
        <button class="chip" data-filter="approved">✅ Đã duyệt</button>
        <button class="chip" data-filter="rejected">❌ Từ chối</button>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="card-body" style="padding:0">
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="background:var(--bg-2);border-bottom:1px solid var(--border)">
                  <th style="padding:12px 16px;text-align:left;font-weight:600">Username</th>
                  <th style="padding:12px 16px;text-align:left;font-weight:600">Trạng thái</th>
                  <th style="padding:12px 16px;text-align:center;font-weight:600">Truyện</th>
                  <th style="padding:12px 16px;text-align:left;font-weight:600">Role</th>
                  <th style="padding:12px 16px;text-align:center;font-weight:600">Hành động</th>
                </tr>
              </thead>
              <tbody id="users-tbody">
                <tr><td colspan="5" style="padding:32px;text-align:center;color:var(--text-3)">⏳ Đang tải...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div id="keys-modal" style="display:none;position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);align-items:center;justify-content:center">
      <div style="background:var(--bg-1);border:1px solid var(--border);border-radius:var(--r-lg);width:min(560px,95vw);max-height:85vh;overflow-y:auto;box-shadow:var(--shadow-lg)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:700;font-size:16px" id="modal-title">API Keys</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px" id="modal-sub"></div>
          </div>
          <button class="btn btn-ghost btn-sm" id="modal-close">✕</button>
        </div>
        <div style="padding:24px" id="modal-body">...</div>
      </div>
    </div>`;
  },

  async mount() {
    document.getElementById('filter-bar')?.addEventListener('click', e => {
      const chip = e.target.closest('[data-filter]');
      if (!chip) return;
      document.querySelectorAll('#filter-bar .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      this._activeFilter = chip.dataset.filter;
      this._renderTable();
    });
    document.getElementById('modal-close')?.addEventListener('click', () => this._closeModal());
    document.getElementById('keys-modal')?.addEventListener('click', e => {
      if (e.target === document.getElementById('keys-modal')) this._closeModal();
    });
    await this._loadUsers();
  },

  async _loadUsers() {
    try {
      this._users = await API.get('/api/v1/auth/users/stats/all');
      this._updateStats();
      this._renderTable();
    } catch (e) {
      const tbody = document.getElementById('users-tbody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--red)">Lỗi: ${e.message}</td></tr>`;
    }
  },

  _updateStats() {
    const pending  = this._users.filter(u => u.translator_status === 'pending').length;
    const approved = this._users.filter(u => u.translator_status === 'approved').length;
    const mangas   = this._users.reduce((s, u) => s + u.manga_count, 0);
    const $  = id => document.getElementById(id);
    if ($('stat-total'))   $('stat-total').textContent   = this._users.length;
    if ($('stat-pending')) $('stat-pending').textContent = pending;
    if ($('stat-approved'))$('stat-approved').textContent= approved;
    if ($('stat-mangas'))  $('stat-mangas').textContent  = mangas;
  },

  _renderTable() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    const list = this._activeFilter
      ? this._users.filter(u => u.translator_status === this._activeFilter)
      : this._users;

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--text-3)">Không có user nào</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(u => {
      const statusBadge = {
        pending:  '<span class="badge badge-yellow">⏳ Chờ duyệt</span>',
        approved: '<span class="badge badge-green">✅ Đã duyệt</span>',
        rejected: '<span class="badge" style="background:rgba(239,68,68,.15);color:#ef4444">❌ Từ chối</span>',
      }[u.translator_status] || `<span class="badge">${u.translator_status}</span>`;

      const roleLabel = { admin:'🛡️ Admin', translator:'📝 Dịch giả', user:'👤 User' }[u.role] || u.role;

      let actionBtns;
      if (u.role === 'admin') {
        actionBtns = `
          <button class="btn btn-sm keys-btn" data-id="${u.id}" data-user="${u.username}"
            style="background:rgba(99,102,241,.12);color:#818cf8;border:1px solid rgba(99,102,241,.3)">
            🔑 Keys
          </button>`;
      } else if (u.translator_status === 'approved') {
        actionBtns = `
          <div style="display:flex;gap:6px;justify-content:center">
            <button class="btn btn-sm keys-btn" data-id="${u.id}" data-user="${u.username}"
              style="background:rgba(99,102,241,.12);color:#818cf8;border:1px solid rgba(99,102,241,.3)">
              🔑 Keys
            </button>
            <button class="btn btn-sm reject-btn" data-id="${u.id}" data-user="${u.username}"
              style="background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.3)">
              Thu hồi
            </button>
          </div>`;
      } else {
        actionBtns = `
          <div style="display:flex;gap:6px;justify-content:center">
            <button class="btn btn-primary btn-sm approve-btn" data-id="${u.id}" data-user="${u.username}">✓ Duyệt</button>
            <button class="btn btn-sm reject-btn" data-id="${u.id}" data-user="${u.username}"
              style="background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.3)">
              ✕ Từ chối
            </button>
          </div>`;
      }

      return `
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:12px 16px;font-weight:600">${u.username}</td>
          <td style="padding:12px 16px">${statusBadge}</td>
          <td style="padding:12px 16px;text-align:center;font-weight:700;color:${u.manga_count ? 'var(--accent)' : 'var(--text-3)'}">${u.manga_count}</td>
          <td style="padding:12px 16px">${roleLabel}</td>
          <td style="padding:12px 16px;text-align:center">${actionBtns}</td>
        </tr>`;
    }).join('');

    document.querySelectorAll('.approve-btn').forEach(btn =>
      btn.addEventListener('click', () => this._approve(btn.dataset.id, btn.dataset.user)));
    document.querySelectorAll('.reject-btn').forEach(btn =>
      btn.addEventListener('click', () => this._reject(btn.dataset.id, btn.dataset.user)));
    document.querySelectorAll('.keys-btn').forEach(btn =>
      btn.addEventListener('click', () => this._openKeys(btn.dataset.id, btn.dataset.user)));
  },

  async _approve(userId, username) {
    if (!confirm(`Phê duyệt "${username}"?\nUser sẽ được role Dịch giả và có thể upload + nhập truyện.`)) return;
    try {
      await API.post(`/api/v1/auth/users/${userId}/approve`, {});
      Toast.success(`✅ Đã phê duyệt "${username}"`);
      await this._loadUsers();
    } catch (e) { Toast.error('Lỗi: ' + e.message); }
  },

  async _reject(userId, username) {
    if (!confirm(`Thu hồi / từ chối "${username}"?`)) return;
    try {
      await API.post(`/api/v1/auth/users/${userId}/reject`, {});
      Toast.success(`Đã cập nhật "${username}"`);
      await this._loadUsers();
    } catch (e) { Toast.error('Lỗi: ' + e.message); }
  },

  /* ── Keys modal ──────────────────────────────────────────── */
  async _openKeys(userId, username) {
    const modal = document.getElementById('keys-modal');
    const body  = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');
    const sub   = document.getElementById('modal-sub');

    title.textContent = `🔑 API Keys — ${username}`;
    sub.textContent   = 'Chỉnh sửa keys và kiểm tra kết nối';
    modal.style.display = 'flex';

    const user = this._users.find(u => u.id === userId);
    const keys = user?.api_keys || {};
    body.innerHTML = this._keysFormHtml(userId, keys);

    document.getElementById('test-btn')?.addEventListener('click', () => this._testKeys(userId));
    document.getElementById('save-keys-btn')?.addEventListener('click', () => this._saveKeys(userId));
  },

  _keysFormHtml(userId, keys) {
    const field = (id, label, val, placeholder, hint) => `
      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">${label}</label>
        <input class="form-input" id="key-${id}" value="${(val||'').replace(/"/g,'&quot;')}" placeholder="${placeholder}" style="font-family:monospace;font-size:12px">
        ${hint ? `<div style="font-size:11px;color:var(--text-3);margin-top:4px">${hint}</div>` : ''}
      </div>`;

    return `
      ${field('kaggle_worker_url', '🌐 Kaggle Worker URL', keys.kaggle_worker_url, 'https://xxxx.ngrok-free.app', 'URL ngrok của Kaggle notebook đang chạy')}
      ${field('gemini_api_key', '✨ Gemini API Key', keys.gemini_api_key, 'AIza...', 'Google AI Studio API key')}
      ${field('kaggle_username', '👤 Kaggle Username', keys.kaggle_username, 'username', '')}
      ${field('kaggle_key', '🔐 Kaggle API Key', keys.kaggle_key, 'xxxxxxxx', '')}

      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary" id="save-keys-btn">💾 Lưu</button>
        <button class="btn btn-secondary" id="test-btn">🔌 Test kết nối</button>
      </div>

      <div id="test-results" style="margin-top:16px"></div>`;
  },

  _getFormKeys() {
    const val = id => document.getElementById(id)?.value.trim() || null;
    return {
      kaggle_worker_url: val('key-kaggle_worker_url'),
      gemini_api_key:    val('key-gemini_api_key'),
      kaggle_username:   val('key-kaggle_username'),
      kaggle_key:        val('key-kaggle_key'),
    };
  },

  async _saveKeys(userId) {
    const payload = this._getFormKeys();
    const btn = document.getElementById('save-keys-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang lưu...'; }
    try {
      await API.put(`/api/v1/auth/users/${userId}/keys`, payload);
      Toast.success('✅ Đã lưu API keys');
      await this._loadUsers();
    } catch (e) {
      Toast.error('Lỗi lưu: ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Lưu'; }
    }
  },

  async _testKeys(userId) {
    const btn = document.getElementById('test-btn');
    const results = document.getElementById('test-results');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang test...'; }

    // Gửi giá trị form hiện tại (không cần save trước)
    const formKeys = this._getFormKeys();
    try {
      const res = await API.post(`/api/v1/auth/users/${userId}/test-keys`, {
        kaggle_worker_url: formKeys.kaggle_worker_url,
        gemini_api_key:    formKeys.gemini_api_key,
      });
      results.innerHTML = res.map(r => {
        const color  = r.ok ? '#10b981' : '#ef4444';
        const icon   = r.ok ? '✅' : '❌';
        const labels = {
          kaggle_worker_url: '🌐 Kaggle Worker',
          gemini_api_key:    '✨ Gemini API Key',
        };
        return `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:8px;background:var(--bg-2);margin-bottom:8px;border:1px solid ${r.ok ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.2)'}">
            <span style="font-size:16px;flex-shrink:0">${icon}</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px">${labels[r.key] || r.key}</div>
              ${r.url && r.url !== '(secret)' ? `<div style="font-size:11px;color:var(--text-3);font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.url}</div>` : ''}
              <div style="font-size:12px;color:${color};margin-top:4px">${r.detail}${r.status ? ` (HTTP ${r.status})` : ''}</div>
            </div>
          </div>`;
      }).join('');
    } catch (e) {
      results.innerHTML = `<div style="color:var(--red);font-size:13px">Lỗi: ${e.message}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔌 Test kết nối'; }
    }
  },

  _closeModal() {
    const modal = document.getElementById('keys-modal');
    if (modal) modal.style.display = 'none';
  },
};
