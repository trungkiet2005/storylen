/* ── Job Card component ──────────────────────────────────── */
window.JobCard = {
  statusBadge(status) {
    const map = {
      queued:   ['badge-blue',   '🕐 Queued'],
      running:  ['badge-yellow', '⚡ Running'],
      done:     ['badge-green',  '✅ Done'],
      failed:   ['badge-red',    '❌ Failed'],
      cancelled:['badge-default','🚫 Cancelled'],
    };
    const [cls, label] = map[status] || ['badge-default', status];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  render(job) {
    const created = job.created_at ? new Date(job.created_at).toLocaleString('vi-VN') : '—';
    const metrics = job.metrics || {};
    return `<div class="card" style="margin-bottom:12px">
      <div class="card-header">
        <div>
          <div class="card-title font-mono" style="font-size:12px">${job.id}</div>
          <div style="font-size:11px;color:var(--text-3);margin-top:2px">${created}</div>
        </div>
        ${this.statusBadge(job.status)}
      </div>
      <div class="card-body" style="padding:14px 20px">
        <div class="progress-bar mb-16" style="margin-bottom:12px">
          <div class="progress-fill" style="width:${job.progress||0}%"></div>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--text-2)">
          <span>📦 Manga: <b style="color:var(--text)">${job.manga_id?.slice(0,8)}…</b></span>
          ${metrics.boxes_detected !== undefined ? `<span>🔍 Boxes: <b style="color:var(--text)">${metrics.boxes_detected}</b></span>` : ''}
          ${metrics.latency_ms !== undefined ? `<span>⏱ ${(metrics.latency_ms/1000).toFixed(1)}s</span>` : ''}
        </div>
        ${job.error ? `<div style="color:var(--red);font-size:12px;margin-top:8px">Error: ${job.error}</div>` : ''}
      </div>
    </div>`;
  },
};
