// StoryLens — Home screen (3 variants)

const HomeV1Editorial = () => {
  return (
    <div className="paper-grain" style={{ minHeight: 900 }}>
      <div style={{ padding: "60px 56px 40px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "center" }}>
        {/* Left */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <span style={{ width: 40, height: 2, background: "var(--accent)" }}/>
            <span className="caps-sm" style={{ color: "var(--accent)", fontWeight: 800 }}>物語 — Số 01 · Mùa Xuân 2026</span>
          </div>
          <h1 className="display" style={{ fontSize: 84, margin: 0, marginBottom: 8 }}>
            Đọc manga <br/>
            <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--accent)" }}>không</span> rào cản<br/>
            ngôn ngữ.
          </h1>
          <p className="serif" style={{ fontSize: 19, lineHeight: 1.55, maxWidth: 520, color: "var(--fg-soft)", margin: "20px 0 32px" }}>
            Nền tảng AI dịch thuật có ngữ cảnh kết hợp hỏi đáp thông minh (RAG Q&A). Tải ảnh manga — nhận bản dịch tiếng Việt giữ nguyên giọng văn, đồng thời đối thoại với AI về cốt truyện, nhân vật, thế giới quan.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn btn-primary" data-nav="upload"><Icon name="upload" size={16}/> Thử ngay — Tải trang đầu tiên</button>
            <button className="btn" data-nav="reader">Xem demo <Icon name="arrow-right" size={14}/></button>
          </div>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 40, marginTop: 44, paddingTop: 28, borderTop: "1.5px solid var(--border-soft)" }}>
            {[
              { num: "95%", label: "OCR accuracy", sub: "Manga-OCR fine-tuned" },
              { num: "0.85+", label: "BLEU score", sub: "Gemini contextual" },
              { num: "<3s", label: "Response time", sub: "End-to-end" },
              { num: "1.2K+", label: "Trang đã index", sub: "Sprint 2" },
            ].map(s => (
              <div key={s.label}>
                <div className="display" style={{ fontSize: 32, color: "var(--accent)" }}>{s.num}</div>
                <div className="caps-xs" style={{ marginTop: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Right — Fuji + frame */}
        <div style={{ position: "relative" }}>
          <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "var(--panel)", padding: 0, position: "relative", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "2px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-2)" }}>
              <span className="caps-xs">第一章 — Chương Giới Thiệu</span>
              <span className="caps-xs" style={{ color: "var(--muted)" }}>P. 01 / 04</span>
            </div>
            <div style={{ color: "var(--ink)" }}>
              <FujiArt className="" />
            </div>
            {/* Bubble overlay */}
            <div style={{ position: "absolute", top: 100, left: 30, maxWidth: 240 }}>
              <div className="bubble" style={{ background: "#fff" }}>
                <div style={{ fontSize: 13, color: "var(--ink)" }}>「あの山を越えれば、すべてが変わる」</div>
                <div style={{ fontSize: 12, color: "var(--beni-deep)", marginTop: 4, fontFamily: "var(--font-serif)" }}>— Vượt qua ngọn núi ấy, tất cả sẽ đổi thay.</div>
              </div>
            </div>
            {/* Floating Q&A chip */}
            <div style={{ position: "absolute", bottom: 20, right: 20, background: "var(--ink)", color: "var(--paper)", padding: "8px 14px", border: "2px solid var(--ink)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "3px 3px 0 var(--accent)" }}>
              <Icon name="sparkle" size={14}/> Hỏi AI về trang này
            </div>
          </div>
          {/* Vertical kanji */}
          <div style={{ position: "absolute", right: -40, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
            <div className="kanji-deco" style={{ fontSize: 38, letterSpacing: "0.3em", opacity: 0.7 }}>物語レンズ</div>
          </div>
          {/* Stamp */}
          <div style={{ position: "absolute", top: -14, left: -14 }}>
            <div className="seal seal-circle" style={{ width: 70, height: 70, fontSize: 22 }}>新刊</div>
          </div>
        </div>
      </div>

      {/* 3-step process */}
      <div style={{ padding: "40px 56px" }}>
        <KanjiDivider kanji="流" label="Quy trình · Process"/>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { n: "01", kanji: "読", en: "Read", title: "Tải trang manga gốc", desc: "YOLOv8 phát hiện bong bóng thoại, Manga-OCR trích xuất text tiếng Nhật." },
            { n: "02", kanji: "訳", en: "Translate", title: "Dịch có ngữ cảnh", desc: "Vector DB cung cấp ngữ cảnh nhân vật, thuật ngữ. Gemini tổng hợp bản dịch tự nhiên." },
            { n: "03", kanji: "問", en: "Ask", title: "Hỏi AI bất kỳ điều gì", desc: "Chat RAG về cốt truyện, nhân vật, world-building — chỉ dựa trên nội dung đã index." },
          ].map(s => (
            <div key={s.n} className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 24, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>STEP / {s.n}</span>
                <span className="serif" style={{ fontSize: 40, color: "var(--accent)", fontWeight: 800, lineHeight: 1 }}>{s.kanji}</span>
              </div>
              <div className="caps-xs" style={{ marginTop: 20, color: "var(--accent)" }}>{s.en}</div>
              <div className="display" style={{ fontSize: 22, marginTop: 6, marginBottom: 10 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "var(--fg-soft)", lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured series strip */}
      <div style={{ padding: "20px 56px 60px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div className="caps-sm" style={{ color: "var(--accent)" }}>人気 · Phổ biến tuần này</div>
            <div className="display" style={{ fontSize: 28, marginTop: 4 }}>Được đọc nhiều</div>
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>Dữ liệu mẫu từ Manga109</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {[
            { jp: "月影の剣", vn: "Kiếm Nguyệt Ảnh", pages: 124, kanji: "月" },
            { jp: "春の足音", vn: "Bước Chân Mùa Xuân", pages: 78, kanji: "春" },
            { jp: "紅の誓い", vn: "Lời Thề Son Đỏ", pages: 210, kanji: "紅" },
            { jp: "静かな海", vn: "Biển Lặng", pages: 56, kanji: "海" },
            { jp: "風の記憶", vn: "Ký Ức Của Gió", pages: 92, kanji: "風" },
          ].map((s, i) => (
            <div key={s.jp} className="stroke-ink" style={{ background: "var(--panel)", overflow: "hidden" }}>
              <div className="halftone" style={{ height: 160, background: ["var(--bg-2)", "var(--bg-3)"][i%2], display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderBottom: "2px solid var(--border)" }}>
                <span className="serif" style={{ fontSize: 80, color: "var(--accent)", fontWeight: 800, opacity: 0.9 }}>{s.kanji}</span>
                <div style={{ position: "absolute", top: 8, left: 8 }} className="chip">#{i+1}</div>
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div className="serif" style={{ fontWeight: 700, fontSize: 14 }}>{s.vn}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.jp} · {s.pages} trang</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---- Variant 2: Bold poster ----
const HomeV2Poster = () => (
  <div className="paper-grain" style={{ minHeight: 900 }}>
    <div style={{ padding: 40 }}>
      <div className="stroke-ink-thick" style={{ background: "var(--bg-2)", position: "relative", overflow: "hidden", padding: "80px 56px", minHeight: 620 }}>
        {/* Giant kanji bg */}
        <div style={{ position: "absolute", right: -40, top: -60, fontFamily: "var(--font-serif)", fontSize: 520, fontWeight: 800, color: "var(--accent)", opacity: 0.14, lineHeight: 0.8, pointerEvents: "none" }}>物</div>
        {/* Halftone corner */}
        <div className="halftone-coarse" style={{ position: "absolute", left: 0, bottom: 0, width: 300, height: 300, color: "var(--ink)", opacity: 0.6 }}/>

        <div style={{ position: "relative", maxWidth: 700 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--ink)", color: "var(--paper)", fontSize: 11, letterSpacing: "0.2em", fontWeight: 700 }}>
            ストーリーレンズ · STORYLENS VOL. 1
          </div>
          <h1 className="display" style={{ fontSize: 110, margin: "18px 0 0", lineHeight: 0.92 }}>
            MANGA,<br/>
            ĐỌC NHƯ<br/>
            <span style={{ color: "var(--accent)", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>người Nhật.</span>
          </h1>
          <p className="serif" style={{ fontSize: 20, marginTop: 24, maxWidth: 540, lineHeight: 1.5 }}>
            Bản dịch giữ nguyên nhịp điệu, ngữ khí nhân vật, và giọng văn gốc — nhờ ngữ cảnh được AI học từ toàn bộ chương truyện.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <button className="btn btn-primary" data-nav="upload" style={{ padding: "16px 28px", fontSize: 15 }}>Bắt đầu ngay <Icon name="arrow-right" size={16}/></button>
            <button className="btn" data-nav="qa" style={{ padding: "16px 28px", fontSize: 15 }}><Icon name="sparkle" size={16}/> Trải nghiệm Q&A</button>
          </div>
        </div>

        {/* Poster tags bottom */}
        <div style={{ position: "absolute", left: 56, right: 56, bottom: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>
          <div>
            <div style={{ color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>ISSUE №01</div>
            <div>THE BEGINNING OF CONTEXTUAL READING</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ marginBottom: 4 }}>￥ FREE · ZERO-BUDGET BUILD</div>
            <div>PRINTED WITH AI · APR. 2026</div>
          </div>
        </div>

        {/* Fuji floating */}
        <div style={{ position: "absolute", right: 60, top: 140, width: 320, color: "var(--ink)" }}>
          <FujiArt variant="compact"/>
        </div>

        {/* Barcode-ish strip */}
        <div style={{ position: "absolute", right: 56, bottom: 40 }}>
          <svg width="100" height="40">
            {Array.from({length: 20}).map((_, i) => (
              <rect key={i} x={i * 5} y="0" width={Math.random() > 0.5 ? 2 : 3} height="32" fill="var(--ink)"/>
            ))}
            <text x="50" y="40" textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink)">4 901234 567894</text>
          </svg>
        </div>
      </div>

      {/* Feature trio under poster */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 28 }}>
        {[
          { icon: "eye", kanji: "視", title: "OCR phát hiện bubble", desc: "YOLOv8 fine-tuned, mAP ≥ 90%" },
          { icon: "translate", kanji: "訳", title: "Dịch có ngữ cảnh", desc: "Vector context + Gemini LLM" },
          { icon: "chat", kanji: "問", title: "Q&A grounded RAG", desc: "Top-k=5 chunks, BM25 + semantic" },
        ].map(f => (
          <div key={f.title} className="stroke-ink" style={{ background: "var(--panel)", padding: 20, display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 48, height: 48, background: "var(--accent)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontFamily: "var(--font-serif)", fontWeight: 800, border: "2px solid var(--border)" }}>{f.kanji}</div>
            <div>
              <div className="display" style={{ fontSize: 18 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 4 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ---- Variant 3: Library grid ----
const HomeV3Library = () => {
  const rows = [
    { cat: "新着 · Mới cập nhật", items: [["月","Kiếm Nguyệt Ảnh","Ch. 12"],["春","Bước Chân Mùa Xuân","Ch. 04"],["紅","Lời Thề Son Đỏ","Ch. 21"],["海","Biển Lặng","Ch. 07"]] },
    { cat: "話題 · Đang thảo luận", items: [["風","Ký Ức Của Gió","Ch. 09"],["影","Bóng Của Người","Ch. 15"],["雷","Sấm Mùa Hạ","Ch. 02"],["森","Rừng Yên Lặng","Ch. 06"]] },
  ];
  return (
    <div className="paper-grain" style={{ minHeight: 900, padding: "32px 40px" }}>
      {/* Hero banner compact */}
      <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "var(--ink)", color: "var(--paper)", padding: "32px 36px", marginBottom: 36, position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 40 }}>
          <div style={{ flex: 1 }}>
            <div className="caps-sm" style={{ color: "var(--accent)" }}>Phiên bản MVP · Sprint 2</div>
            <div className="display" style={{ fontSize: 44, marginTop: 8, color: "var(--paper)" }}>
              Thư viện manga của bạn, <span style={{ color: "var(--accent)", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>được AI đọc hiểu.</span>
            </div>
            <div style={{ marginTop: 12, color: "#d9cfb7", maxWidth: 560 }}>
              Tất cả chương truyện đã upload được chunk, embed, và index vào ChromaDB — sẵn sàng cho dịch thuật và Q&A.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn-primary" data-nav="upload">Upload chương mới</button>
              <button className="btn" data-nav="history" style={{ background: "transparent", color: "var(--paper)", borderColor: "var(--paper)" }}>Xem toàn bộ lịch sử</button>
            </div>
          </div>
          <div style={{ width: 280, color: "var(--paper)" }}>
            <FujiArt variant="compact"/>
          </div>
        </div>
      </div>

      {rows.map(r => (
        <div key={r.cat} style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <div className="display" style={{ fontSize: 22 }}>{r.cat}</div>
            <button className="btn btn-ghost btn-sm">Xem tất cả <Icon name="arrow-right" size={12}/></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {r.items.map(([k,v,c],i) => (
              <div key={v} className="stroke-ink" style={{ background: "var(--panel)", overflow: "hidden", cursor: "pointer" }}>
                <div className="halftone-coarse" style={{ height: 220, background: `var(--bg-${2+(i%2)})`, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "2px solid var(--border)", color: "var(--ink)", position: "relative" }}>
                  <span className="serif" style={{ fontSize: 140, color: "var(--accent)", fontWeight: 800, opacity: 0.92 }}>{k}</span>
                  <div style={{ position: "absolute", top: 8, left: 8 }} className="chip chip-accent">{c}</div>
                  <div style={{ position: "absolute", bottom: 8, right: 8 }} className="chip">98% · dịch xong</div>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div className="serif" style={{ fontSize: 16, fontWeight: 700 }}>{v}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Cập nhật 2 giờ trước</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

window.HomeV1Editorial = HomeV1Editorial;
window.HomeV2Poster = HomeV2Poster;
window.HomeV3Library = HomeV3Library;
