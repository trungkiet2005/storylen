/* ── Register translator page ──────────────────────────── */
window.RegisterPage = {
  async render() {
    return `
    <div class="auth-shell">
      <header class="landing-topbar">
        <div class="brand">
          <span class="brand-dot"></span>
          <span>StoryLens</span>
        </div>
        <nav class="top-links">
          <a href="#/search">Tìm truyện</a>
          <a href="#/login">Đăng nhập</a>
          <a href="#/register" class="btn btn-primary btn-sm">Đăng ký dịch</a>
        </nav>
      </header>
      <div class="auth-page">
        <div class="auth-card">
        <div class="auth-header">
          <div class="auth-title">Đăng ký dịch truyện</div>
          <div class="auth-subtitle">Gửi thông tin để admin xét duyệt quyền dịch.</div>
        </div>
        <form id="register-form" class="auth-form">
          <div class="form-group">
            <label class="form-label">Tên đăng nhập</label>
            <input class="form-input" id="reg-username" placeholder="nhomdich123" required>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Họ và tên</label>
              <input class="form-input" id="reg-name" placeholder="Nguyễn Văn A" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-input" type="email" id="reg-email" placeholder="ban@storylens.vn" required>
            </div>
          </div>
            <div class="form-group">
              <label class="form-label">Mật khẩu</label>
              <input class="form-input" type="password" id="reg-password" placeholder="Tối thiểu 6 ký tự" required>
            </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Nhóm dịch</label>
              <input class="form-input" id="reg-team" placeholder="StoryLens Team" required>
            </div>
            <div class="form-group">
              <label class="form-label">Vai trò</label>
              <select class="form-select" id="reg-role">
                <option value="translator">Dịch giả</option>
                <option value="editor">Biên tập</option>
                <option value="qc">QC chất lượng</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Liên kết portfolio</label>
            <input class="form-input" id="reg-link" placeholder="https://...">
          </div>
          <div class="form-group">
            <label class="form-label">Lý do muốn tham gia</label>
            <textarea class="form-textarea" id="reg-note" placeholder="Chia sẻ kinh nghiệm, dự án đã làm..."></textarea>
          </div>
          <button class="btn btn-primary btn-lg" type="submit">Gửi đăng ký</button>
        </form>
        <div class="auth-footer">
          <span>Đã có tài khoản?</span>
          <a href="#/login">Đăng nhập</a>
        </div>
        </div>
        <div class="auth-side">
          <div class="auth-side-card">
            <div class="auth-side-title">Trạng thái xét duyệt</div>
            <div class="status-card" id="reg-status">
              <div class="status-label">Chưa gửi</div>
              <div class="status-desc">Hoàn tất biểu mẫu để gửi yêu cầu.</div>
            </div>
            <div class="status-hint">Admin sẽ duyệt và bật quyền dịch truyện cho bạn.</div>
          </div>
        </div>
      </div>
    </div>`;
  },

  async mount() {
    document
      .getElementById("register-form")
      ?.addEventListener("submit", (e) => {
        e.preventDefault();
        this._register();
      });
  },

  async _register() {
    try {
      const username = document.getElementById("reg-username").value.trim();
      const password = (
        document.getElementById("reg-password").value || ""
      ).trim();
      await API.post("/api/v1/auth/register", {
        username,
        password,
      });
      const status = document.getElementById("reg-status");
      if (status) {
        status.innerHTML =
          '<div class="status-label">Đang chờ duyệt</div><div class="status-desc">Yêu cầu đã được gửi. Admin sẽ phản hồi sớm.</div>';
        status.classList.add("pending");
      }
      if (window.Toast) Toast.info("Đăng ký thành công! Hãy đăng nhập.");
      window.App.navigate("login");
    } catch (err) {
      if (window.Toast) Toast.error(err.message || "Đăng ký thất bại");
    }
  },
};
