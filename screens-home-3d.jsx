// Home hero V4 — 3D Fuji parallax diorama (the main polished hero)

const HomeV4Hero3D = () => {
  const [scrollP, setScrollP] = React.useState(0);
  const heroRef = React.useRef();
  React.useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -rect.top / (rect.height * 0.8)));
      setScrollP(p);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isDark = document.documentElement.dataset.theme === "dark";

  // Very soft edge-only vignette — keeps center (Fuji) fully visible
  const vignetteBg = isDark
    ? "radial-gradient(ellipse 90% 70% at center, rgba(14,12,10,0) 55%, rgba(14,12,10,0.35) 95%)"
    : "radial-gradient(ellipse 90% 70% at center, rgba(245,239,227,0) 55%, rgba(245,239,227,0.35) 95%)";

  // Text glow halo only directly behind title (no card)
  const textHalo = isDark
    ? "radial-gradient(ellipse 70% 55% at center, rgba(14,12,10,0.45) 0%, rgba(14,12,10,0) 70%)"
    : "radial-gradient(ellipse 70% 55% at center, rgba(245,239,227,0.55) 0%, rgba(245,239,227,0) 70%)";

  const strongShadow = isDark
    ? "0 2px 10px rgba(0,0,0,0.85), 0 0 30px rgba(0,0,0,0.6)"
    : "0 2px 10px rgba(245,239,227,0.95), 0 0 30px rgba(245,239,227,0.8), 0 1px 0 rgba(245,239,227,1)";

  return (
    <div className="paper-grain">
      {/* HERO — full viewport 3D */}
      <div ref={heroRef} style={{ height: "100vh", minHeight: 720, position: "relative", overflow: "hidden", borderBottom: "2px solid var(--border)" }}>
        {/* 3D Canvas */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          {window.THREE ? (
            <FujiScene3D dark={isDark} interactive={true}/>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)" }}>Loading 3D…</div>
          )}
        </div>

        {/* Center vignette — fades 3D around the text so copy is always legible */}
        <div style={{ position: "absolute", inset: 0, zIndex: 2, background: vignetteBg, pointerEvents: "none" }}/>

        {/* Halftone corner accents */}
        <div className="halftone-coarse" style={{ position: "absolute", left: 0, bottom: 0, width: 240, height: 240, zIndex: 2, opacity: 0.4, pointerEvents: "none" }}/>
        <div className="halftone" style={{ position: "absolute", right: 0, top: 0, width: 260, height: 260, zIndex: 2, opacity: 0.3, pointerEvents: "none" }}/>

        {/* Vertical tategaki on left */}
        <div style={{ position: "absolute", left: 32, top: "50%", transform: "translateY(-50%)", zIndex: 3, pointerEvents: "none" }}>
          <div className="serif" style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: 13, color: "var(--fg-soft)", letterSpacing: "0.3em", opacity: 0.7 }}>
            第一章 · 物語を読む新しい方法
          </div>
        </div>

        {/* Vertical tategaki on right */}
        <div style={{ position: "absolute", right: 32, top: "50%", transform: "translateY(-50%)", zIndex: 3, pointerEvents: "none" }}>
          <div className="serif" style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: 12, color: "var(--accent)", letterSpacing: "0.4em", opacity: 0.75 }}>
            真実を翻訳する · TRANSLATE · 2026
          </div>
        </div>

        {/* Soft halo directly behind title — lets Fuji breathe through */}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 920, height: 460, zIndex: 2, background: textHalo, pointerEvents: "none", filter: "blur(2px)" }}/>

        {/* Hero copy — NO card, just text with strong shadow over the 3D */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", zIndex: 3, padding: "0 24px", display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ maxWidth: 880, width: "100%", textAlign: "center" }}>
            <div className="caps-sm" style={{ color: "var(--accent)", marginBottom: 14, letterSpacing: "0.32em", textShadow: strongShadow }}>物語レンズ · ISSUE 01 · SPRING 2026</div>
            <h1 className="display" style={{
              fontSize: "clamp(42px, 5.5vw, 78px)",
              margin: 0,
              lineHeight: 1.02,
              color: "var(--fg)",
              letterSpacing: "-0.02em",
              textShadow: strongShadow,
            }}>
              Đọc manga <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--accent)", fontWeight: 700 }}>không</span><br/>
              rào cản <span style={{ position: "relative", display: "inline-block" }}>
                ngôn ngữ
                <span style={{ position: "absolute", left: 0, right: 0, bottom: "-6px", height: 4, background: "var(--accent)", opacity: 0.55 }}/>
              </span>.
            </h1>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, pointerEvents: "auto", flexWrap: "wrap" }}>
              <button className="btn btn-primary" data-nav="upload" style={{ padding: "14px 24px", fontSize: 14 }}>
                <Icon name="upload" size={16}/> Thử ngay
              </button>
              <button className="btn" data-nav="reader" style={{ padding: "14px 24px", fontSize: 14 }}>
                Xem demo <Icon name="arrow-right" size={14}/>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom cinema bars */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 3, padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.15em", pointerEvents: "none" }}>
          <span>◉ REC · REAL-TIME 3D · HOVER TO PARALLAX</span>
          <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span>⌘K · COMMAND PALETTE</span>
            <span>↓ SCROLL FOR MORE</span>
          </span>
        </div>

        {/* Hanko seal top right */}
        <div style={{ position: "absolute", top: 88, right: 64, zIndex: 3, pointerEvents: "none" }}>
          <div className="seal seal-circle" style={{ width: 76, height: 76, fontSize: 22 }}>新刊</div>
        </div>
      </div>

      {/* Second section — process */}
      <div style={{ padding: "80px 56px" }}>
        <KanjiDivider kanji="流" label="Quy trình · Process"/>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { n: "01", kanji: "読", en: "Read", title: "Tải trang manga gốc", desc: "YOLOv8 phát hiện bong bóng thoại, Manga-OCR trích xuất text tiếng Nhật với độ chính xác ≥ 95%." },
            { n: "02", kanji: "訳", en: "Translate", title: "Dịch có ngữ cảnh", desc: "Vector DB cung cấp ngữ cảnh nhân vật và thuật ngữ. Gemini tổng hợp bản dịch tự nhiên." },
            { n: "03", kanji: "問", en: "Ask", title: "Hỏi AI bất kỳ điều gì", desc: "Chat RAG grounded strictly trong nội dung đã index. Không bịa, có cite nguồn." },
          ].map(s => (
            <div key={s.n} className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>STEP / {s.n}</span>
                <span className="serif" style={{ fontSize: 64, color: "var(--accent)", fontWeight: 800, lineHeight: 1, opacity: 0.95 }}>{s.kanji}</span>
              </div>
              <div className="caps-xs" style={{ marginTop: 20, color: "var(--accent)" }}>{s.en}</div>
              <div className="display" style={{ fontSize: 24, marginTop: 8, marginBottom: 12 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "var(--fg-soft)", lineHeight: 1.55 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats ribbon */}
      <div style={{ background: "var(--ink)", color: "var(--paper)", padding: "40px 56px", borderTop: "2px solid var(--border)", borderBottom: "2px solid var(--border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40 }}>
          {[
            { num: "95%", label: "OCR accuracy", sub: "Manga-OCR fine-tuned" },
            { num: "0.85+", label: "BLEU score", sub: "Gemini contextual" },
            { num: "< 3s", label: "Response time", sub: "End-to-end pipeline" },
            { num: "1.2K", label: "Trang đã index", sub: "Sprint 2 · ChromaDB" },
          ].map(s => (
            <div key={s.label}>
              <div className="display" style={{ fontSize: 48, color: "var(--accent)", lineHeight: 1 }}>{s.num}</div>
              <div className="caps-xs" style={{ marginTop: 10, color: "var(--paper)" }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "#d9cfb7", marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured series */}
      <div style={{ padding: "60px 56px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div className="caps-sm" style={{ color: "var(--accent)" }}>人気 · Phổ biến tuần này</div>
            <div className="display" style={{ fontSize: 36, marginTop: 6 }}>Được đọc nhiều</div>
          </div>
          <button className="btn btn-sm btn-ghost" data-nav="history">Xem tất cả <Icon name="arrow-right" size={12}/></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {[
            { jp: "月影の剣", vn: "Kiếm Nguyệt Ảnh", pages: 124, kanji: "月" },
            { jp: "春の足音", vn: "Bước Chân Mùa Xuân", pages: 78, kanji: "春" },
            { jp: "紅の誓い", vn: "Lời Thề Son Đỏ", pages: 210, kanji: "紅" },
            { jp: "静かな海", vn: "Biển Lặng", pages: 56, kanji: "海" },
            { jp: "風の記憶", vn: "Ký Ức Của Gió", pages: 92, kanji: "風" },
          ].map((s, i) => (
            <div key={s.jp} className="stroke-ink" style={{ background: "var(--panel)", overflow: "hidden", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
                 onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 var(--border)"; }}
                 onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
              <div className="halftone-coarse" style={{ height: 200, background: i % 2 ? "var(--bg-3)" : "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderBottom: "2px solid var(--border)" }}>
                <span className="serif" style={{ fontSize: 120, color: "var(--accent)", fontWeight: 800, opacity: 0.9 }}>{s.kanji}</span>
                <div style={{ position: "absolute", top: 8, left: 8 }} className="chip">#{i+1}</div>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div className="serif" style={{ fontWeight: 700, fontSize: 15 }}>{s.vn}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.jp} · {s.pages} trang</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

window.HomeV4Hero3D = HomeV4Hero3D;
