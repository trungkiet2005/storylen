/* ── Nav component ──────────────────────────────────────── */
const NAV_ITEMS = [
  {
    id: "home",
    icon: "🏠",
    label: "Trang chủ",
    section: "MAIN",
    roles: ["guest", "user", "translator", "admin"],
  },
  {
    id: "search",
    icon: "🔎",
    label: "Tìm truyện",
    section: "MAIN",
    roles: ["guest", "user", "translator", "admin"],
  },
  {
    id: "login",
    icon: "🔐",
    label: "Đăng nhập",
    section: "ACCOUNT",
    roles: ["guest"],
  },
  {
    id: "register",
    icon: "📝",
    label: "Đăng ký dịch",
    section: "ACCOUNT",
    roles: ["guest"],
  },
  {
    id: "admin-users",
    icon: "👥",
    label: "Quản lý Users",
    section: "ADMIN",
    roles: ["admin"],
  },
  {
    id: "admin",
    icon: "🛡️",
    label: "Quản trị duyệt dịch",
    section: "ADMIN",
    roles: ["admin"],
  },
  {
    id: "admin-home",
    icon: "🧭",
    label: "Admin Home",
    section: "ADMIN",
    roles: ["admin"],
  },
  {
    id: "import",
    icon: "📥",
    label: "Nhập truyện",
    section: "ADMIN",
    roles: ["admin", "translator"],
  },
  {
    id: "studio",
    icon: "🎬",
    label: "Dịch truyện",
    section: "ADMIN",
    roles: ["admin", "translator"],
  },
  {
    id: "review",
    icon: "🧾",
    label: "OCR truyện",
    section: "ADMIN",
    roles: ["admin"],
  },
  {
    id: "library",
    icon: "📚",
    label: "Kho Truyện",
    section: "ĐỌC TRUYỆN",
    roles: ["guest", "user", "translator", "admin"],
  },
  {
    id: "reader",
    icon: "👁️",
    label: "Đọc truyện",
    section: "ĐỌC TRUYỆN",
    roles: ["guest", "user", "translator", "admin"],
  },
  {
    id: "summary",
    icon: "💬",
    label: "Tóm tắt",
    section: "READER",
    roles: ["guest", "user", "translator"],
  },
  {
    id: "profile",
    icon: "👤",
    label: "Tài khoản của tôi",
    section: "ACCOUNT",
    roles: ["translator", "admin"],
  },
  {
    id: "logout",
    icon: "🚪",
    label: "Đăng xuất",
    section: "ACCOUNT",
    roles: ["user", "translator", "admin"],
  },
];

window.Nav = {
  render(activeId, onNavigate) {
    const role = window.Auth?.role || "guest";
    const items = NAV_ITEMS.filter((item) => item.roles?.includes(role));
    let sections = {};
    items.forEach((item) => {
      if (!sections[item.section]) sections[item.section] = [];
      sections[item.section].push(item);
    });

    let html = "";
    for (const [section, items] of Object.entries(sections)) {
      html += `<div class="nav-section">
        <div class="nav-label">${section}</div>`;
      items.forEach((item) => {
        const active = item.id === activeId ? "active" : "";
        html += `<div class="nav-item ${active}" data-page="${item.id}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </div>`;
      });
      html += "</div>";
    }
    return html;
  },

  bind(container, onNavigate) {
    container.querySelectorAll(".nav-item").forEach((el) => {
      el.addEventListener("click", () => onNavigate(el.dataset.page));
    });
  },
};
