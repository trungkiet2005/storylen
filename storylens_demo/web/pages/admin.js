/* ── Admin approval page ───────────────────────────────── */
window.AdminPage = {
  _requests: [],
  _mangaRequests: [],
  _currentTab: "users", // 'users' or 'mangas'

  async render() {
    return `
    <div class="page-header">
      <div>
        <div class="page-title">🛡️ Quản trị hệ thống</div>
        <div class="page-subtitle">Duyệt người dịch và duyệt truyện xuất bản.</div>
      </div>
    </div>
    <div class="page-body">
      <div style="margin-bottom: 24px; display: flex; gap: 12px;">
        <button class="btn ${this._currentTab === 'users' ? 'btn-primary' : 'btn-secondary'}" onclick="window.AdminPage.switchTab('users')">👤 Duyệt Người Dịch</button>
        <button class="btn ${this._currentTab === 'mangas' ? 'btn-primary' : 'btn-secondary'}" onclick="window.AdminPage.switchTab('mangas')">📚 Duyệt Truyện Xuất Bản</button>
      </div>

      <div id="admin-users-tab" style="display: ${this._currentTab === 'users' ? 'block' : 'none'};">
        <div class="admin-grid" id="admin-requests"></div>
      </div>

      <div id="admin-mangas-tab" style="display: ${this._currentTab === 'mangas' ? 'block' : 'none'};">
        <div class="admin-grid" id="admin-manga-requests"></div>
      </div>
    </div>`;
  },

  async mount() {
    const container = document.getElementById("admin-requests");
    container?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      this._updateStatus(btn.dataset.id, btn.dataset.action);
    });

    const mangaContainer = document.getElementById("admin-manga-requests");
    mangaContainer?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      this._updateMangaStatus(btn.dataset.id, btn.dataset.action);
    });

    await this._load();
    await this._loadMangas();
  },

  async switchTab(tab) {
    this._currentTab = tab;
    document.getElementById("main").innerHTML = await this.render();
    await this.mount();
  },

  async _load() {
    const container = document.getElementById("admin-requests");
    if (!container) return;
    try {
      this._requests = await API.get("/api/v1/auth/users?status=pending");
      if (!this._requests.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">Không có yêu cầu duyệt người dịch.</div></div>';
        return;
      }
      container.innerHTML = this._requests.map((r) => this._renderCard(r)).join("");
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-text">Lỗi tải dữ liệu.</div></div>';
    }
  },

  async _loadMangas() {
    const container = document.getElementById("admin-manga-requests");
    if (!container) return;
    try {
      const mangas = await API.get("/api/v1/manga?status=pending_review");
      this._mangaRequests = mangas;
      if (!this._mangaRequests.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">Không có yêu cầu duyệt xuất bản truyện.</div></div>';
        return;
      }
      container.innerHTML = this._mangaRequests.map((r) => this._renderMangaCard(r)).join("");
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-text">Lỗi tải dữ liệu.</div></div>';
    }
  },

  async _updateStatus(id, action) {
    try {
      let payload = {};
      if (action === "approve") {
        const url = prompt("Nhập Kaggle Worker URL cấp cho người dùng này (hoặc để trống):");
        if (url !== null && url.trim() !== "") {
          payload.kaggle_worker_url = url.trim();
        }
      }
      await API.post(`/api/v1/auth/users/${id}/${action}`, payload);
      if (window.Toast) Toast.success(action === "approve" ? "Đã duyệt." : "Đã từ chối.");
      await this._load();
    } catch (err) {
      if (window.Toast) Toast.error(err.message || "Lỗi");
    }
  },

  async _updateMangaStatus(id, action) {
    try {
      await API.post(`/api/v1/manga/${id}/${action}`, {});
      if (window.Toast) Toast.success(action === "approve" ? "Đã duyệt xuất bản." : "Đã từ chối xuất bản.");
      await this._loadMangas();
    } catch (err) {
      if (window.Toast) Toast.error(err.message || "Lỗi");
    }
  },

  _renderCard(req) {
    return `
      <div class="admin-card">
        <div class="admin-header">
          <div>
            <div class="admin-name">${req.username}</div>
            <div class="admin-meta">Vai trò: ${req.role}</div>
          </div>
          <span class="badge badge-yellow">Chờ duyệt</span>
        </div>
        <div class="admin-body">
          <div class="admin-actions">
            <button class="btn btn-success btn-sm" data-action="approve" data-id="${req.id}">Duyệt</button>
            <button class="btn btn-danger btn-sm" data-action="reject" data-id="${req.id}">Từ chối</button>
          </div>
        </div>
      </div>`;
  },

  _renderMangaCard(req) {
    return `
      <div class="admin-card">
        <div class="admin-header">
          <div>
            <div class="admin-name">${req.title}</div>
            <div class="admin-meta">Người đăng: ${req.created_by || "Unknown"}</div>
          </div>
          <span class="badge badge-accent">Xin xuất bản</span>
        </div>
        <div class="admin-body">
          <div class="admin-actions" style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/studio/${req.id}'">Xem trước</button>
            <button class="btn btn-success btn-sm" data-action="approve" data-id="${req.id}">Duyệt (Publish)</button>
            <button class="btn btn-danger btn-sm" data-action="reject" data-id="${req.id}">Từ chối</button>
          </div>
        </div>
      </div>`;
  },
};
