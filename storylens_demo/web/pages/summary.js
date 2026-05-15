/* ── Summary page ────────────────────────────────────────── */
window.SummaryPage = {
  _mode: "summary",

  async render(params = {}) {
    return `
    <div class="page-header">
      <div>
        <div class="page-title">💬 Trợ lý tóm tắt</div>
        <div class="page-subtitle">Bóng chat hướng dẫn dùng app và tóm tắt chương truyện</div>
      </div>
    </div>
    <div class="page-body">
      <div class="chat-shell">
        <div class="chat-row assistant">
          <div class="chat-avatar">🤖</div>
          <div class="chat-bubble">
            <div class="chat-title">Bạn muốn làm gì?</div>
            <div class="chat-actions">
              <button class="btn btn-secondary btn-sm" data-sum-mode="guide" id="sum-mode-guide">Cách sử dụng app</button>
              <button class="btn btn-primary btn-sm" data-sum-mode="summary" id="sum-mode-summary">Tóm tắt chương truyện</button>
            </div>
          </div>
        </div>

        <div class="chat-row assistant chat-section" id="sum-guide">
          <div class="chat-avatar">📘</div>
          <div class="chat-bubble">
            <div class="chat-title">Cách sử dụng app</div>
            <ol class="chat-list">
              <li>Vào mục Dịch truyện để tải ảnh trang cần OCR.</li>
              <li>Theo dõi tiến trình, chờ render hoàn tất.</li>
              <li>Mở OCR truyện để xem các trang và kết quả.</li>
              <li>Dùng Tóm tắt để tạo mô tả chương nhanh gọn.</li>
            </ol>
          </div>
        </div>

        <div class="chat-row assistant chat-section" id="sum-summary">
          <div class="chat-avatar">🧠</div>
          <div class="chat-bubble">
            <div class="chat-title">Tóm tắt chương truyện</div>
            <div class="form-group">
              <label class="form-label">Dán nội dung OCR / bản dịch</label>
              <textarea class="form-textarea" id="sum-text" rows="6" placeholder="Dán nội dung chương vào đây..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Kiểu tóm tắt</label>
              <select class="form-select" id="sum-style">
                <option value="concise">Ngắn gọn (200 từ)</option>
                <option value="detailed">Chi tiết</option>
                <option value="bullet">Gạch đầu dòng</option>
              </select>
            </div>
            <div class="chat-actions">
              <button class="btn btn-primary" id="sum-btn">✨ Tạo tóm tắt</button>
            </div>
          </div>
        </div>

        <div class="chat-row assistant" id="sum-result" style="display:none">
          <div class="chat-avatar">📝</div>
          <div class="chat-bubble">
            <div class="chat-title">Kết quả tóm tắt</div>
            <div id="sum-text-out" class="chat-output"></div>
          </div>
        </div>
      </div>
    </div>`;
  },

  mount() {
    document.querySelectorAll("[data-sum-mode]")?.forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this._setMode(e.currentTarget.dataset.sumMode),
      );
    });
    this._setMode(this._mode);
    document
      .getElementById("sum-btn")
      ?.addEventListener("click", () => this._generate());
  },

  _setMode(mode) {
    this._mode = mode;
    const guide = document.getElementById("sum-guide");
    const summary = document.getElementById("sum-summary");
    if (guide) guide.style.display = mode === "guide" ? "flex" : "none";
    if (summary) summary.style.display = mode === "summary" ? "flex" : "none";
    const btnGuide = document.getElementById("sum-mode-guide");
    const btnSummary = document.getElementById("sum-mode-summary");
    if (btnGuide)
      btnGuide.className =
        mode === "guide"
          ? "btn btn-primary btn-sm"
          : "btn btn-secondary btn-sm";
    if (btnSummary)
      btnSummary.className =
        mode === "summary"
          ? "btn btn-primary btn-sm"
          : "btn btn-secondary btn-sm";
  },

  async _generate() {
    const text = document.getElementById("sum-text")?.value.trim();
    const style = document.getElementById("sum-style")?.value || "concise";
    if (!text) {
      Toast.warn("Hãy dán nội dung để tóm tắt");
      return;
    }

    const btn = document.getElementById("sum-btn");
    btn.disabled = true;
    btn.textContent = "⏳ Đang tạo…";

    try {
      // Call Gemini via a simple API endpoint (summarize is done client-side via API)
      const res = await API.post("/api/v1/summarize", { text, style });
      document.getElementById("sum-result").style.display = "flex";
      document.getElementById("sum-text-out").textContent =
        res.summary || "No summary generated.";
      Toast.success("Đã tạo tóm tắt!");
    } catch (e) {
      // Fallback: show that summary endpoint needs to be added
      document.getElementById("sum-result").style.display = "flex";
      document.getElementById("sum-text-out").textContent =
        "⚠️ API tóm tắt chưa sẵn sàng. Sẽ cập nhật ở giai đoạn tiếp theo.";
    } finally {
      btn.disabled = false;
      btn.textContent = "✨ Tạo tóm tắt";
    }
  },
};
