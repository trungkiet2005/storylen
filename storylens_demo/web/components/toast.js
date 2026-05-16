/* ── Toast component ─────────────────────────────────────── */
(function() {
  let container;
  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  window.Toast = {
    show(msg, type = 'info', duration = 3500) {
      const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.innerHTML = `<span>${icons[type] || '•'}</span> <span>${msg}</span>`;
      getContainer().appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(120%)';
        el.style.transition = 'all .3s ease';
        setTimeout(() => el.remove(), 300);
      }, duration);
    },
    success: (m) => window.Toast.show(m, 'success'),
    error:   (m) => window.Toast.show(m, 'error'),
    info:    (m) => window.Toast.show(m, 'info'),
    warn:    (m) => window.Toast.show(m, 'warning'),
  };
})();
