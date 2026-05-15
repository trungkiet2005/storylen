/* ── Login page ────────────────────────────────────────── */
window.LoginPage = {
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
          <a href="#/register">Đăng ký dịch</a>
          <a href="#/login" class="btn btn-primary btn-sm">Đăng nhập</a>
        </nav>
      </header>
      <div class="auth-page">
        <div class="auth-card">
        <div class="auth-header">
          <div class="auth-title">Đăng nhập để dịch truyện</div>
          <div class="auth-subtitle">Dùng tài khoản của bạn để tiếp tục dự án dịch.</div>
        </div>
        <form id="login-form" class="auth-form">
          <div class="form-group">
            <label class="form-label">Tên đăng nhập</label>
            <input class="form-input" id="login-username" placeholder="admin" required>
          </div>
          <div class="form-group">
            <label class="form-label">Mật khẩu</label>
            <input class="form-input" type="password" id="login-password" placeholder="••••••••" required>
          </div>
          <button class="btn btn-primary btn-lg" type="submit">Đăng nhập</button>
        </form>
        <div class="auth-footer">
          <span>Chưa có tài khoản?</span>
          <a href="#/register">Đăng ký dịch truyện</a>
        </div>
        </div>
        <div class="auth-side">
          <div class="auth-side-card">
            <div class="auth-side-title">Quy trình dịch truyện</div>
            <ul class="auth-side-list">
              <li>Gửi yêu cầu dịch → Admin duyệt</li>
              <li>Tạo project, tải chương lên</li>
              <li>Biên tập thoại, kiểm tra chất lượng</li>
            </ul>
            <a class="btn btn-secondary" href="#/admin">Xem trang quản trị</a>
          </div>
        </div>
      </div>
    </div>`;
  },

  async mount() {
    document.getElementById("login-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this._login();
    });
  },

  async _login() {
    try {
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value;
      const res = await API.post("/api/v1/auth/login", { username, password });
      window.Auth.login(res);
      window.App.renderNav();
      if (window.Toast) Toast.success("Đăng nhập thành công!");
      if (res.role === "admin") return window.App.navigate("admin-home");
      return window.App.navigate("home");
    } catch (err) {
      if (window.Toast) Toast.error(err.message || "Đăng nhập thất bại");
    }
  },
};
