/* ── Progress Bar component ──────────────────────────────── */
window.ProgressBar = {
  create(id) {
    return `<div class="progress-bar" id="${id}">
      <div class="progress-fill" style="width:0%"></div>
    </div>`;
  },
  set(id, pct) {
    const el = document.querySelector(`#${id} .progress-fill`);
    if (el) el.style.width = `${Math.min(100, pct)}%`;
  },
};
