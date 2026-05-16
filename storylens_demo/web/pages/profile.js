window.ProfilePage = {
  _keys: {},
  _mangas: [],

  async render() {
    return `
    <div class="page-header">
      <div>
        <div class="page-title">👤 Tài khoản của tôi</div>
        <div class="page-subtitle">Quản lý truyện đang dịch và thiết lập API Keys cá nhân.</div>
      </div>
    </div>
    <div class="page-body">
      <div style="display:flex; gap: 24px; flex-wrap: wrap;">
        
        <!-- Left: API Keys -->
        <div class="card" style="flex: 1; min-width: 300px;">
          <div class="card-header"><div class="card-title">🔑 Cấu hình API Keys</div></div>
          <div class="card-body">
            <div style="margin-bottom: 12px; color: var(--text-3); font-size: 13px;">
              Nhập API Key của bạn để sử dụng cho dịch thuật AI (Gemini). API Key được lưu bảo mật trong tài khoản của bạn.
            </div>
            <div class="form-group">
              <label>Gemini API Key</label>
              <input type="password" id="prof-gemini" class="form-input" placeholder="AIzaSy...">
            </div>
            <div style="margin-top: 16px;">
              <button id="prof-save-keys" class="btn btn-primary">💾 Lưu cấu hình</button>
            </div>
          </div>
        </div>

        <!-- Right: Drafts -->
        <div class="card" style="flex: 2; min-width: 400px;">
          <div class="card-header"><div class="card-title">📝 Truyện đang dịch (Nháp)</div></div>
          <div class="card-body">
            <div id="prof-drafts" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="color:var(--text-3); text-align:center; padding: 20px;">⏳ Đang tải...</div>
            </div>
          </div>
        </div>

      </div>
    </div>
    `;
  },

  async mount() {
    document.getElementById('prof-save-keys')?.addEventListener('click', () => this._saveKeys());
    await this._loadKeys();
    await this._loadDrafts();
  },

  async _loadKeys() {
    try {
      const keys = await window.API.get('/api/v1/auth/me/keys');
      this._keys = keys || {};
      if (this._keys.gemini_api_key) document.getElementById('prof-gemini').value = this._keys.gemini_api_key;
    } catch (e) {
      if (window.Toast) Toast.error("Lỗi khi tải API keys");
    }
  },

  async _saveKeys() {
    const btn = document.getElementById('prof-save-keys');
    btn.disabled = true;
    btn.textContent = "Đang lưu...";
    try {
      const payload = {
        gemini_api_key: document.getElementById('prof-gemini').value.trim() || null,
      };
      await window.API.put('/api/v1/auth/me/keys', payload);
      if (window.Toast) Toast.success("Đã lưu API keys!");
    } catch (e) {
      if (window.Toast) Toast.error("Lỗi: " + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "💾 Lưu cấu hình";
    }
  },

  async _loadDrafts() {
    try {
      // List manga will filter based on role. Translators get their drafts + approved.
      // So we just fetch all and filter by publish_status !== 'approved' to find drafts.
      const mangas = await window.API.get('/api/v1/manga');
      this._mangas = mangas.filter(m => m.publish_status === 'draft' || m.publish_status === 'pending_review' || m.publish_status === 'rejected');
      this._renderDrafts();
    } catch (e) {
      document.getElementById('prof-drafts').innerHTML = `<div style="color:var(--red);">Lỗi tải dữ liệu</div>`;
    }
  },

  _renderDrafts() {
    const container = document.getElementById('prof-drafts');
    if (!this._mangas.length) {
      container.innerHTML = `<div style="color:var(--text-3); text-align:center; padding: 20px;">Bạn chưa có truyện nháp nào.</div>`;
      return;
    }

    container.innerHTML = this._mangas.map(m => {
      let statusBadge = '';
      if (m.publish_status === 'draft') statusBadge = '<span class="badge" style="background:var(--bg-3)">Bản nháp</span>';
      else if (m.publish_status === 'pending_review') statusBadge = '<span class="badge badge-accent">Đang chờ duyệt</span>';
      else if (m.publish_status === 'rejected') statusBadge = '<span class="badge badge-red">Bị từ chối</span>';

      return `
      <div style="background: var(--bg-2); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${m.title}</div>
          <div style="font-size: 12px; color: var(--text-3);">${m.created_at ? new Date(m.created_at).toLocaleDateString() : ''} ${statusBadge}</div>
        </div>
        <div style="display: flex; gap: 8px;">
          ${m.publish_status === 'draft' || m.publish_status === 'rejected' ? `<button class="btn btn-primary btn-sm" onclick="window.ProfilePage._requestPublish('${m.id}')">🚀 Xin Xuất Bản</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/studio/${m.id}'">🖍️ Studio</button>
        </div>
      </div>
      `;
    }).join('');
  },

  async _requestPublish(id) {
    if (!confirm("Bạn muốn gửi truyện này cho Admin duyệt để xuất bản lên Kho Truyện?")) return;
    try {
      await window.API.post(`/api/v1/manga/${id}/publish-request`, {});
      if (window.Toast) Toast.success("Đã gửi yêu cầu xuất bản!");
      await this._loadDrafts();
    } catch (e) {
      if (window.Toast) Toast.error("Lỗi: " + e.message);
    }
  }
};
