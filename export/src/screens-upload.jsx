// Upload + Batch + History screens

const UploadScreen = ({ state = "idle" }) => {
  // state: idle, dragging, uploading, processing, done, error
  return (
    <div className="paper-grain" style={{ minHeight: 900, padding: "40px 56px" }}>
      <SectionHeader kanji="入" label="Upload · Tải lên" title="Tải trang manga để dịch" subtitle="Hỗ trợ JPG, PNG, WEBP. Tối đa 20MB / ảnh. Xử lý qua YOLOv8 (bubble detection) + Manga-OCR (text extraction)." stamp="入稿"/>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24, marginTop: 28 }}>
        {/* Dropzone */}
        <div className="stroke-ink-thick panel-shadow" style={{ background: "var(--panel)", minHeight: 520, position: "relative", overflow: "hidden" }}>
          {state === "idle" && (
            <div style={{ padding: 56, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 520, position: "relative" }}>
              <div className="halftone" style={{ position: "absolute", inset: 20, border: "2px dashed var(--border)", pointerEvents: "none" }}/>
              <div style={{ position: "relative" }}>
                <div style={{ width: 96, height: 96, background: "var(--accent)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: "3px solid var(--border)", boxShadow: "4px 4px 0 var(--border)" }}>
                  <Icon name="upload" size={42} stroke={2.5}/>
                </div>
                <div className="display" style={{ fontSize: 28 }}>Kéo thả trang manga vào đây</div>
                <div style={{ color: "var(--fg-soft)", marginTop: 8, marginBottom: 24 }}>hoặc</div>
                <button className="btn btn-primary"><Icon name="folder" size={14}/> Chọn file từ máy</button>
                <div style={{ marginTop: 24, fontSize: 12, color: "var(--muted)" }}>JPG · PNG · WEBP — tối đa 20MB mỗi file</div>
              </div>
            </div>
          )}
          {state === "processing" && (
            <div style={{ padding: 40, minHeight: 520 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <div className="caps-sm" style={{ color: "var(--accent)" }}>Đang xử lý · Processing</div>
                  <div className="display" style={{ fontSize: 22, marginTop: 4 }}>page_04_chapter12.jpg</div>
                </div>
                <div className="chip chip-accent">3.2 MB</div>
              </div>
              {/* Preview with overlaid bubble detection */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>Ảnh gốc</div>
                  <div className="stroke-ink" style={{ background: "#fff" }}>
                    <MangaPage w={280} h={300} panels="default" showBubbles={true} showOverlay={false}/>
                  </div>
                </div>
                <div>
                  <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>◯ YOLOv8 · phát hiện bubble</div>
                  <div className="stroke-ink" style={{ background: "#fff", position: "relative" }}>
                    <MangaPage w={280} h={300} panels="default" showBubbles={true} showOverlay={false}/>
                    <svg viewBox="0 0 280 300" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                      <rect x="18" y="18" width="90" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                      <rect x="18" y="135" width="90" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                      <rect x="148" y="135" width="80" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                    </svg>
                  </div>
                </div>
              </div>
              {/* Pipeline progress */}
              <div style={{ marginTop: 28 }}>
                {[
                  { step: "Bubble detection (YOLOv8)", done: true, time: "0.8s" },
                  { step: "Text extraction (Manga-OCR)", done: true, time: "1.4s" },
                  { step: "Context retrieval (ChromaDB)", done: false, active: true, time: "…" },
                  { step: "Translation (Gemini)", done: false, time: "—" },
                  { step: "Index to vector DB", done: false, time: "—" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < 4 ? "1px dashed var(--border-soft)" : "none" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--border)", background: s.done ? "var(--accent)" : s.active ? "var(--bg-2)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {s.done && <Icon name="check" size={12} stroke={3}/>}
                      {s.active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s infinite" }}/>}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: s.active ? 700 : 500, color: s.done ? "var(--muted)" : "var(--fg)" }}>{s.step}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{s.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {state === "error" && (
            <div style={{ padding: 56, textAlign: "center", minHeight: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 80, height: 80, background: "var(--accent)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid var(--border)", marginBottom: 20 }}>
                <Icon name="alert" size={38}/>
              </div>
              <div className="display" style={{ fontSize: 24, color: "var(--accent)" }}>Không thể xử lý file</div>
              <div style={{ color: "var(--fg-soft)", marginTop: 8, maxWidth: 400 }}>Manga-OCR không nhận diện được text trong ảnh. Có thể do độ phân giải thấp hoặc chất lượng scan không rõ.</div>
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button className="btn"><Icon name="refresh" size={14}/> Thử lại</button>
                <button className="btn btn-primary">Tải ảnh khác</button>
              </div>
            </div>
          )}
        </div>

        {/* Right column — series info & settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20 }}>
            <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>Gắn vào bộ truyện</div>
            <div style={{ position: "relative" }}>
              <input placeholder="Chọn hoặc tạo bộ truyện mới…" style={{ width: "100%", padding: "10px 12px", border: "2px solid var(--border)", background: "var(--bg)", fontSize: 13, fontFamily: "inherit" }}/>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["月影の剣", "春の足音", "+ Tạo mới"].map((t,i) => (
                <div key={t} className={`chip ${i === 0 ? "chip-accent" : ""}`} style={{ cursor: "pointer" }}>{t}</div>
              ))}
            </div>
          </div>

          <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20 }}>
            <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>Tùy chọn dịch</div>
            {[
              { label: "Dùng glossary đã lưu", on: true },
              { label: "Giữ âm danh từ riêng (onyomi)", on: true },
              { label: "Index vào vector DB", on: true },
              { label: "Phát hiện SFX/onomatopoeia", on: false },
            ].map(o => (
              <div key={o.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px dashed var(--border-soft)" }}>
                <span style={{ fontSize: 13 }}>{o.label}</span>
                <div style={{ width: 36, height: 20, background: o.on ? "var(--accent)" : "var(--bg-3)", border: "2px solid var(--border)", borderRadius: 999, position: "relative" }}>
                  <div style={{ position: "absolute", top: 1, left: o.on ? 17 : 1, width: 14, height: 14, background: "var(--paper)", border: "1.5px solid var(--border)", borderRadius: "50%" }}/>
                </div>
              </div>
            ))}
          </div>

          <div className="stroke-ink" style={{ background: "var(--bg-2)", padding: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Icon name="sparkle" size={16}/>
              <div style={{ fontSize: 12, color: "var(--fg-soft)", lineHeight: 1.5 }}>
                <strong>Mẹo:</strong> Với chương nhiều trang, dùng <a onClick={() => window.__nav?.("batch")} style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 700 }}>Batch Upload</a> để xử lý tuần tự và tiết kiệm quota Gemini.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BatchScreen = () => {
  const files = [
    { name: "ch12_p01.jpg", size: "2.8 MB", status: "done", bubbles: 12, time: "3.2s" },
    { name: "ch12_p02.jpg", size: "3.1 MB", status: "done", bubbles: 8, time: "2.8s" },
    { name: "ch12_p03.jpg", size: "2.9 MB", status: "processing", bubbles: 10, time: "…" },
    { name: "ch12_p04.jpg", size: "3.4 MB", status: "queued", bubbles: null, time: "—" },
    { name: "ch12_p05.jpg", size: "2.7 MB", status: "queued", bubbles: null, time: "—" },
    { name: "ch12_p06.jpg", size: "3.0 MB", status: "queued", bubbles: null, time: "—" },
    { name: "ch12_p07.jpg", size: "2.5 MB", status: "error", bubbles: null, time: "—" },
    { name: "ch12_p08.jpg", size: "2.9 MB", status: "queued", bubbles: null, time: "—" },
  ];
  const done = files.filter(f => f.status === "done").length;
  return (
    <div className="paper-grain" style={{ minHeight: 900, padding: "40px 56px" }}>
      <SectionHeader kanji="束" label="Batch Upload · Content Creator" title="Tải nguyên chương truyện"
                     subtitle="Xử lý tuần tự nhiều trang để tiết kiệm quota Gemini (500 RPD/key × 4 keys)."
                     stamp="一括"/>

      {/* Progress header */}
      <div className="stroke-ink-thick panel-shadow" style={{ background: "var(--panel)", padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div className="caps-sm" style={{ color: "var(--accent)" }}>月影の剣 · Chapter 12</div>
            <div className="display" style={{ fontSize: 24, marginTop: 4 }}>{done} / {files.length} trang đã xử lý</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-sm"><Icon name="x" size={12}/> Hủy tất cả</button>
            <button className="btn btn-sm btn-primary">Tiếp tục</button>
          </div>
        </div>
        {/* Progress bar manga-style */}
        <div style={{ height: 18, border: "2px solid var(--border)", background: "var(--bg-2)", position: "relative" }}>
          <div className="halftone" style={{ width: `${(done/files.length)*100}%`, height: "100%", background: "var(--accent)", color: "var(--paper)", borderRight: "2px solid var(--border)" }}/>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{Math.round(done/files.length*100)}%</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          <span>ETA · 28 giây</span>
          <span>Quota: 1,842 / 2,000 RPD</span>
        </div>
      </div>

      {/* File list */}
      <div className="stroke-ink" style={{ background: "var(--panel)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 120px 100px 80px 40px", padding: "10px 16px", background: "var(--bg-2)", borderBottom: "2px solid var(--border)" }} className="caps-xs">
          <span>#</span><span>File</span><span>Kích thước</span><span>Bubbles</span><span>Thời gian</span><span>Trạng thái</span><span/>
        </div>
        {files.map((f, i) => {
          const statusMap = {
            done: { label: "✓ Xong", color: "var(--jade)", bg: "transparent" },
            processing: { label: "● Đang xử lý", color: "var(--accent)", bg: "var(--bg-2)" },
            queued: { label: "○ Chờ", color: "var(--muted)", bg: "transparent" },
            error: { label: "✕ Lỗi", color: "var(--beni-deep)", bg: "rgba(200,16,46,0.08)" },
          };
          const s = statusMap[f.status];
          return (
            <div key={f.name} style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 120px 100px 80px 40px", padding: "12px 16px", borderBottom: i < files.length - 1 ? "1px dashed var(--border-soft)" : "none", fontSize: 13, alignItems: "center", background: s.bg }}>
              <span className="mono" style={{ color: "var(--muted)" }}>{String(i+1).padStart(2, "0")}</span>
              <span style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="image" size={14}/> {f.name}
              </span>
              <span className="mono" style={{ color: "var(--muted)" }}>{f.size}</span>
              <span>{f.bubbles ?? "—"}</span>
              <span className="mono" style={{ color: "var(--muted)" }}>{f.time}</span>
              <span style={{ color: s.color, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>{s.label}</span>
              <Icon name="dots" size={14}/>
            </div>
          );
        })}
      </div>

      {/* Console log */}
      <div className="stroke-ink" style={{ background: "var(--ink)", color: "var(--paper)", padding: 16, marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.7, maxHeight: 160, overflow: "auto" }}>
        <div style={{ color: "#b58a3b" }}>[12:04:18] Starting batch — 8 files queued</div>
        <div style={{ color: "#9fbfa8" }}>[12:04:19] ✓ ch12_p01.jpg — 12 bubbles detected, 12 translated (3.2s)</div>
        <div style={{ color: "#9fbfa8" }}>[12:04:22] ✓ ch12_p02.jpg — 8 bubbles detected, 8 translated (2.8s)</div>
        <div style={{ color: "#e5dbc4" }}>[12:04:25] ● ch12_p03.jpg — bubble detection done, awaiting Gemini response…</div>
        <div style={{ color: "#e04156" }}>[12:04:27] ✕ ch12_p07.jpg — OCR confidence &lt; 0.6, skipped (manual review needed)</div>
      </div>
    </div>
  );
};

const HistoryScreen = () => {
  const series = [
    { kanji: "月", title: "Kiếm Nguyệt Ảnh", jp: "月影の剣", chapters: 12, pages: 124, progress: 0.78, last: "2 giờ trước" },
    { kanji: "春", title: "Bước Chân Mùa Xuân", jp: "春の足音", chapters: 4, pages: 78, progress: 0.42, last: "hôm qua" },
    { kanji: "紅", title: "Lời Thề Son Đỏ", jp: "紅の誓い", chapters: 21, pages: 210, progress: 1.0, last: "3 ngày trước" },
    { kanji: "海", title: "Biển Lặng", jp: "静かな海", chapters: 7, pages: 56, progress: 0.28, last: "1 tuần trước" },
    { kanji: "風", title: "Ký Ức Của Gió", jp: "風の記憶", chapters: 9, pages: 92, progress: 0.64, last: "1 tuần trước" },
    { kanji: "影", title: "Bóng Của Người", jp: "影法師", chapters: 15, pages: 150, progress: 0.12, last: "2 tuần trước" },
  ];
  return (
    <div className="paper-grain" style={{ minHeight: 900, padding: "40px 56px" }}>
      <SectionHeader kanji="歴" label="Lịch Sử · History" title="Bộ truyện đã đọc" subtitle="Tất cả manga bạn đã upload, dịch, và thảo luận với AI. Dữ liệu lưu trong session hoặc tài khoản." stamp="歴"/>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "2px solid var(--border)", background: "var(--panel)", flex: 1, maxWidth: 360 }}>
          <Icon name="search" size={14}/>
          <input placeholder="Tìm theo tên bộ truyện hoặc nhân vật…" style={{ border: "none", background: "transparent", flex: 1, fontSize: 13, outline: "none", color: "var(--fg)" }}/>
        </div>
        <button className="btn btn-sm">Tất cả <span className="mono" style={{ color: "var(--muted)", marginLeft: 4 }}>{series.length}</span></button>
        <button className="btn btn-sm btn-ghost">Đang đọc</button>
        <button className="btn btn-sm btn-ghost">Đã xong</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn btn-sm btn-ghost"><Icon name="grid" size={14}/></button>
          <button className="btn btn-sm btn-ghost"><Icon name="menu" size={14}/></button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {series.map((s, i) => (
          <div key={s.title} className="stroke-ink panel-shadow" style={{ background: "var(--panel)", overflow: "hidden", cursor: "pointer" }}>
            <div style={{ display: "flex" }}>
              <div className="halftone-coarse" style={{ width: 120, height: 160, background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "2px solid var(--border)", color: "var(--ink)" }}>
                <span className="serif" style={{ fontSize: 80, color: "var(--accent)", fontWeight: 800 }}>{s.kanji}</span>
              </div>
              <div style={{ flex: 1, padding: 14 }}>
                <div className="serif" style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.jp}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 10, fontSize: 11, color: "var(--fg-soft)" }}>
                  <span>📖 {s.chapters} chương</span>
                  <span>{s.pages} trang</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>
                    <span>Đã đọc</span><span className="mono">{Math.round(s.progress * 100)}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                    <div style={{ width: `${s.progress*100}%`, height: "100%", background: s.progress === 1 ? "var(--jade)" : "var(--accent)" }}/>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: "8px 14px", borderTop: "1px dashed var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--muted)" }}>
              <span><Icon name="clock" size={10}/> {s.last}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <span className="chip" style={{ padding: "2px 8px", fontSize: 10 }}>Q&A ready</span>
                {s.progress === 1 && <span className="chip chip-accent" style={{ padding: "2px 8px", fontSize: 10 }}>✓ Xong</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.UploadScreen = UploadScreen;
window.BatchScreen = BatchScreen;
window.HistoryScreen = HistoryScreen;
