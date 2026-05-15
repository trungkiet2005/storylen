/* ── Bubble Editor component ─────────────────────────────── */
window.BubbleEditor = {
  render(boxes, jobId) {
    if (!boxes.length) return '<div class="empty-state"><div class="empty-state-icon">💬</div><div class="empty-state-text">No text boxes found</div></div>';
    return `<div class="bubble-list">` +
      boxes.map(b => this.renderBox(b, jobId)).join('') +
      `</div>`;
  },

  renderBox(box, jobId) {
    const status = box.review_status || 'pending';
    const badgeClass = { approved: 'badge-green', rejected: 'badge-red', pending: 'badge-default' }[status] || 'badge-default';
    return `<div class="bubble-card ${status}" data-box-id="${box.id}" data-job-id="${jobId}">
      <div class="bubble-header">
        <div>
          <span class="bubble-id">${box.id?.slice(0,8)}…</span>
          ${box.speaker ? `<span class="bubble-speaker ml-8">👤 ${box.speaker}</span>` : ''}
        </div>
        <span class="badge ${badgeClass}">${status}</span>
      </div>
      <div class="bubble-texts">
        <div>
          <div class="bubble-source-label">📖 Original</div>
          <div class="bubble-source">${box.raw_text || '—'}</div>
        </div>
        <div>
          <div class="bubble-source-label">🇻🇳 Translation</div>
          <textarea class="bubble-edit" rows="3" data-field="translated_text">${box.translated_text || ''}</textarea>
        </div>
      </div>
      <div class="bubble-actions">
        <button class="btn btn-success btn-sm" onclick="BubbleEditor.approve(this)">✅ Approve</button>
        <button class="btn btn-danger btn-sm" onclick="BubbleEditor.reject(this)">❌ Reject</button>
        <button class="btn btn-secondary btn-sm" onclick="BubbleEditor.save(this)">💾 Save</button>
      </div>
    </div>`;
  },

  async _patch(el, data) {
    const card = el.closest('.bubble-card');
    const boxId = card.dataset.boxId;
    const jobId = card.dataset.jobId;
    try {
      const res = await window.API.patch(`/api/v1/jobs/${jobId}/boxes/${boxId}`, data);
      card.className = `bubble-card ${res.review_status}`;
      card.querySelector('.badge').className = `badge ${{ approved:'badge-green',rejected:'badge-red',pending:'badge-default' }[res.review_status]}`;
      card.querySelector('.badge').textContent = res.review_status;
      Toast.success('Saved');
    } catch(e) { Toast.error('Save failed: ' + e.message); }
  },

  approve(el) {
    const card = el.closest('.bubble-card');
    const text = card.querySelector('[data-field="translated_text"]').value;
    this._patch(el, { translated_text: text, review_status: 'approved' });
  },
  reject(el) {
    this._patch(el, { review_status: 'rejected' });
  },
  save(el) {
    const card = el.closest('.bubble-card');
    const text = card.querySelector('[data-field="translated_text"]').value;
    this._patch(el, { translated_text: text });
  },
};
