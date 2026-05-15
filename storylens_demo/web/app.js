/* ── StoryLens SPA — App Router + API Client ─────────────── */
"use strict";

// ── API Client ────────────────────────────────────────────
window.API = {
  base: "", // same origin

  async _fetch(method, path, body, isForm = false) {
    const headers = isForm
      ? {}
      : body
        ? { "Content-Type": "application/json" }
        : {};
    const token = window.Auth?.token;
    if (token) headers.Authorization = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = isForm ? body : JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    if (!res.ok) {
      const msg = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(msg || `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  },

  get: (path) => window.API._fetch("GET", path),
  post: (path, body) => window.API._fetch("POST", path, body),
  patch: (path, body) => window.API._fetch("PATCH", path, body),
  put: (path, body) => window.API._fetch("PUT", path, body),
  del: (path) => window.API._fetch("DELETE", path),
  postForm: (path, formData) => window.API._fetch("POST", path, formData, true),
};

// ── Router ────────────────────────────────────────────────
const PAGES = {
  home: window.HomePage,
  login: window.LoginPage,
  register: window.RegisterPage,
  search: window.SearchPage,
  library: window.LibraryPage,
  "admin-home": window.AdminHomePage,
  "admin-users": window.AdminUsersPage,
  admin: window.AdminPage,
  import: window.ImportPage,
  studio: window.StudioPage,
  review: window.ReviewPage,
  reader: window.ReaderPage,
  summary: window.SummaryPage,
  profile: window.ProfilePage,
};

const ADMIN_ONLY = new Set([
  "admin-home",
  "admin-users",
  "admin",
  "import",
  "review",
]);

const TRANSLATOR_APPROVED = new Set([
  "studio",
  "import",
]);

window.Auth = {
  get token() {
    return localStorage.getItem("auth_token") || "";
  },
  get role() {
    return localStorage.getItem("auth_role") || "guest";
  },
  get username() {
    return localStorage.getItem("auth_user") || "";
  },
  isAdmin() {
    return this.role === "admin";
  },
  isAuthed() {
    return !!this.token;
  },
  login(payload) {
    localStorage.setItem("auth_token", payload.token);
    localStorage.setItem("auth_role", payload.role);
    localStorage.setItem("auth_user", payload.username);
  },
  logout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_role");
    localStorage.removeItem("auth_user");
  },
};

window.App = {
  _current: null,
  _currentId: null,
  _suppressHashChange: false,

  async init() {
    // Check health
    this._updateKeyStatus();
    this.renderNav();
    // Route from hash or default
    const hash = location.hash.replace("#/", "") || "home";
    const [page, ...paramParts] = hash.split("/");
    await this.navigate(page || "home");
    window.addEventListener("hashchange", () => {
      if (this._suppressHashChange) {
        this._suppressHashChange = false;
        return;
      }
      const h = location.hash.replace("#/", "") || "home";
      const [p] = h.split("/");
      this.navigate(p);
    });
  },

  async navigate(pageId, params = {}) {
    if (pageId === "logout") {
      window.Auth.logout();
      this.renderNav();
      if (window.Toast) Toast.info("Đã đăng xuất.");
      return this.navigate("home");
    }

    if ((pageId === "login" || pageId === "register") && window.Auth.isAuthed()) {
      if (window.Toast) Toast.info("Bạn đã đăng nhập rồi.");
      return this.navigate("home");
    }

    if (ADMIN_ONLY.has(pageId) && !window.Auth.isAdmin()) {
      if (window.Toast)
        Toast.warn("Bạn cần quyền admin để truy cập trang này.");
      return this.navigate("login");
    }

    if (TRANSLATOR_APPROVED.has(pageId) && !["admin", "translator"].includes(window.Auth.role)) {
      if (window.Toast)
        Toast.warn("Bạn cần được phê duyệt để truy cập trang này.");
      return this.navigate("login");
    }

    const Page = PAGES[pageId] || PAGES.home;

    // Unmount current
    if (this._current?.unmount) this._current.unmount();

    this._currentId = pageId;
    this.renderNav();

    // Render page
    document.body.dataset.page = pageId;
    const main = document.getElementById("main");
    main.innerHTML =
      '<div style="padding:48px;text-align:center;color:var(--text-3)">Loading…</div>';

    try {
      const html = await Page.render(params);
      main.innerHTML = html;
      this._current = Page;
      if (Page.mount) await Page.mount();
    } catch (e) {
      main.innerHTML = `<div style="padding:48px;text-align:center;color:var(--red)">❌ Page error: ${e.message}</div>`;
    }

    const nextHash = `#/${pageId}`;
    if (location.hash !== nextHash) {
      this._suppressHashChange = true;
      location.hash = nextHash;
    }
  },

  renderNav() {
    const nav = document.getElementById("nav-container");
    if (!nav) return;
    nav.innerHTML = Nav.render(this._currentId || "home");
    Nav.bind(nav, (page) => this.navigate(page));
  },

  async _updateKeyStatus() {
    try {
      const health = await API.get("/health/dependencies");
      const ks = health.key_status || {};
      const dot = document.querySelector(".key-dot");
      if (dot) {
        dot.classList.toggle("ok", !!ks.gemini_api_key);
      }
      const text = document.getElementById("key-status-text");
      if (text) {
        text.textContent = ks.gemini_api_key ? "Gemini ready" : "Key missing";
      }
    } catch (e) {
      /* ignore */
    }
  },
};

// ── Boot ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Bind sidebar nav
  Nav.bind(document.getElementById("sidebar"), (page) => App.navigate(page));
  App.init();
});
