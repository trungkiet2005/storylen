/* ── Admin home page ─────────────────────────────────── */
window.AdminHomePage = {
  async render() {
    return `
    <div class="page-header">
      <div>
        <div class="page-title">🧭 Admin Home</div>
        <div class="page-subtitle">Quản trị quy trình dịch truyện và duyệt người dùng.</div>
      </div>
    </div>
    <div class="page-body">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📥</div>
          <div class="stat-value">Nhập truyện</div>
          <div class="stat-label">Tạo manga, chương, upload trang</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎬</div>
          <div class="stat-value">Dịch truyện</div>
          <div class="stat-label">Chạy pipeline dịch tự động</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✏️</div>
          <div class="stat-value">Biên tập</div>
          <div class="stat-label">Review, chỉnh sửa và duyệt</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🛡️</div>
          <div class="stat-value">Duyệt dịch</div>
          <div class="stat-label">Xét duyệt quyền người dịch</div>
        </div>
      </div>
      <div class="col-2" style="gap:20px">
        <div class="card">
          <div class="card-header"><span class="card-title">Hành động nhanh</span></div>
          <div class="card-body" style="display:flex;flex-wrap:wrap;gap:10px">
            <a class="btn btn-primary" href="#/import">Nhập truyện</a>
            <a class="btn btn-secondary" href="#/studio">Dịch truyện</a>
            <a class="btn btn-secondary" href="#/review">Biên tập</a>
            <a class="btn btn-secondary" href="#/admin">Duyệt người dịch</a>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Tài khoản admin</span></div>
          <div class="card-body">
            <div class="text-muted">Đăng nhập bằng tài khoản admin để truy cập các tính năng studio.</div>
          </div>
        </div>
      </div>
    </div>`;
  },
};
