// Reader + Q&A screens

const ReaderScreen = ({ mode = "overlay" }) => {
  // mode: overlay, sidebyside, tap
  const [selected, setSelected] = React.useState(null);
  return (
    <div style={{ minHeight: 900, background: "var(--bg)", display: "grid", gridTemplateColumns: "72px 1fr 320px", gap: 0 }}>
      {/* Thumb rail */}
      <div style={{ background: "var(--bg-2)", borderRight: "2px solid var(--border)", padding: "16px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="caps-xs" style={{ color: "var(--muted)", textAlign: "center", marginBottom: 4 }}>頁</div>
        {Array.from({length: 8}).map((_, i) => (
          <div key={i} className="stroke-ink" style={{ width: 52, height: 70, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderWidth: i === 2 ? 3 : 2, borderColor: i === 2 ? "var(--accent)" : "var(--border)" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{String(i+1).padStart(2,"0")}</span>
          </div>
        ))}
      </div>

      {/* Reader canvas */}
      <div style={{ padding: "20px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {/* Toolbar */}
        <div className="stroke-ink" style={{ background: "var(--panel)", padding: "8px 14px", display: "flex", gap: 6, alignItems: "center", width: "100%", maxWidth: 800 }}>
          <span className="caps-xs" style={{ color: "var(--accent)", marginRight: 10 }}>月影の剣 · Ch. 12 · P. 03</span>
          <div style={{ flex: 1 }}/>
          <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 2 }}>
            {[
              { id: "overlay", label: "Overlay", icon: "layers" },
              { id: "sidebyside", label: "Song ngữ", icon: "grid" },
              { id: "tap", label: "Tap", icon: "plus" },
            ].map((m, i) => (
              <button key={m.id} onClick={() => window.__setReaderMode?.(m.id)}
                      style={{ padding: "6px 10px", background: mode === m.id ? "var(--accent)" : "transparent", color: mode === m.id ? "#fff" : "var(--fg)", border: "none", borderRight: i < 2 ? "1.5px solid var(--border)" : "none", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name={m.icon} size={12}/> {m.label}
              </button>
            ))}
          </div>
          <button className="btn btn-sm btn-ghost"><Icon name="zoom-out" size={14}/></button>
          <button className="btn btn-sm btn-ghost"><Icon name="zoom-in" size={14}/></button>
          <button className="btn btn-sm btn-ghost"><Icon name="bookmark" size={14}/></button>
        </div>

        {/* Pages */}
        {mode === "sidebyside" ? (
          <div style={{ display: "flex", gap: 20, maxWidth: 900 }}>
            <div>
              <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>原文 · Gốc</div>
              <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff" }}>
                <MangaPage w={360} h={520} panels="default" showBubbles={true} showOverlay={false}/>
              </div>
            </div>
            <div>
              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>訳 · Dịch tiếng Việt</div>
              <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff" }}>
                <MangaPage w={360} h={520} panels="default" showBubbles={true} showOverlay={true} overlayLang="vn"/>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff" }}>
              <MangaPage w={500} h={700} panels="default" showBubbles={true}
                         showOverlay={mode === "overlay"} overlayLang="vn"/>
            </div>
            {/* In tap mode, show hotspots */}
            {mode === "tap" && (
              <>
                <div onClick={() => setSelected(0)} style={{ position: "absolute", top: 22, left: 20, width: 100, height: 36, border: "2px dashed var(--accent)", cursor: "pointer", background: "rgba(200,16,46,0.08)" }}/>
                <div onClick={() => setSelected(1)} style={{ position: "absolute", top: 240, left: 20, width: 100, height: 36, border: "2px dashed var(--accent)", cursor: "pointer", background: "rgba(200,16,46,0.08)" }}/>
                {selected !== null && (
                  <div className="bubble" style={{ position: "absolute", top: selected === 0 ? 70 : 290, left: 130, maxWidth: 220, background: "#fffde8" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>JA → VI · dịch có ngữ cảnh</div>
                    <div className="serif" style={{ fontSize: 14 }}>
                      {selected === 0 ? "Khoan đã… không lẽ đây là định mệnh?" : "Mình… không thể quay lại nữa đâu."}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: glossary + context panel */}
      <div style={{ background: "var(--bg-2)", borderLeft: "2px solid var(--border)", padding: 20, overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span className="caps-sm" style={{ color: "var(--accent)" }}>Ngữ cảnh · Context</span>
          <button className="btn btn-sm btn-ghost" style={{ padding: 4 }}><Icon name="x" size={12}/></button>
        </div>

        {/* Characters */}
        <div style={{ marginBottom: 20 }}>
          <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 8 }}>Nhân vật trên trang</div>
          {[
            { jp: "剣心", vn: "Kenshin", role: "Nhân vật chính", color: "var(--accent)" },
            { jp: "薫", vn: "Kaoru", role: "Đồng minh", color: "var(--jade)" },
          ].map(c => (
            <div key={c.jp} className="stroke-ink" style={{ background: "var(--panel)", padding: 10, display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, background: c.color, color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 18, border: "2px solid var(--border)" }}>{c.jp.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.vn} <span style={{ fontWeight: 400, color: "var(--muted)" }}>· {c.jp}</span></div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.role}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Glossary */}
        <div style={{ marginBottom: 20 }}>
          <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 8 }}>Thuật ngữ</div>
          {[
            { jp: "運命", vn: "Định mệnh", note: "Dùng trong ngữ cảnh số phận không thể tránh" },
            { jp: "誓い", vn: "Lời thề", note: "Thường gắn với danh dự samurai" },
          ].map(g => (
            <div key={g.jp} style={{ padding: "10px 0", borderBottom: "1px dashed var(--border-soft)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="serif" style={{ fontSize: 14, fontWeight: 700 }}>{g.jp}</span>
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{g.vn}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{g.note}</div>
            </div>
          ))}
        </div>

        {/* Quick Q&A chip */}
        <button onClick={() => window.__nav?.("qa")} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
          <Icon name="sparkle" size={14}/> Hỏi AI về trang này
        </button>
      </div>
    </div>
  );
};

const QAScreen = ({ state = "active" }) => {
  return (
    <div className="paper-grain" style={{ minHeight: 900, display: "grid", gridTemplateColumns: "260px 1fr", gap: 0 }}>
      {/* Sessions sidebar */}
      <div style={{ background: "var(--bg-2)", borderRight: "2px solid var(--border)", padding: "20px 16px", minHeight: "100%" }}>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: 18 }}>
          <Icon name="plus" size={14}/> Cuộc trò chuyện mới
        </button>
        <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 10 }}>Gần đây</div>
        {[
          { title: "Tại sao Kenshin không giết ai?", series: "月影の剣", active: true },
          { title: "Ý nghĩa của hoa sakura trong ch.3", series: "春の足音" },
          { title: "Quan hệ Kaoru và Yahiko", series: "月影の剣" },
          { title: "Timeline của cuộc chiến", series: "紅の誓い" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "10px 12px", background: s.active ? "var(--panel)" : "transparent", border: s.active ? "2px solid var(--border)" : "2px solid transparent", marginBottom: 6, cursor: "pointer" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{s.title}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-serif)" }}>{s.series}</div>
          </div>
        ))}
      </div>

      {/* Chat main */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 900 }}>
        {/* Header */}
        <div style={{ padding: "16px 32px", borderBottom: "2px solid var(--border)", background: "var(--panel)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="caps-xs" style={{ color: "var(--accent)" }}>RAG Q&A · 月影の剣</div>
            <div className="display" style={{ fontSize: 20, marginTop: 2 }}>Tại sao Kenshin không giết ai?</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            <span>🟢 Grounded in 124 pages</span>
            <button className="btn btn-sm btn-ghost"><Icon name="download" size={12}/></button>
          </div>
        </div>

        {/* Messages */}
        <div className="scroll" style={{ flex: 1, padding: "28px 32px", overflowY: "auto", maxHeight: 640 }}>
          {state === "empty" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: 40 }}>
              <div style={{ width: 80, height: 80, background: "var(--accent)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid var(--border)", marginBottom: 20, fontFamily: "var(--font-serif)", fontSize: 42, fontWeight: 800 }}>問</div>
              <div className="display" style={{ fontSize: 28 }}>Hãy hỏi bất kỳ điều gì về truyện</div>
              <div style={{ color: "var(--fg-soft)", marginTop: 8, maxWidth: 480 }}>AI sẽ chỉ trả lời dựa trên nội dung đã được index vào vector DB. Không bịa.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 28, maxWidth: 560 }}>
                {[
                  "Tóm tắt chương này trong 3 câu",
                  "Kenshin là ai? Tính cách thế nào?",
                  "Vì sao Kaoru tin Kenshin?",
                  "Thuật ngữ 逆刃刀 nghĩa là gì?",
                ].map(q => (
                  <div key={q} className="stroke-ink" style={{ background: "var(--panel)", padding: "10px 14px", fontSize: 13, textAlign: "left", cursor: "pointer" }}>{q}</div>
                ))}
              </div>
            </div>
          )}
          {state !== "empty" && (
            <>
              {/* User msg */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <div className="bubble" style={{ maxWidth: 500, background: "var(--accent)", color: "#fff", border: "2.5px solid var(--border)", boxShadow: "3px 3px 0 var(--border)" }}>
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>Tại sao Kenshin trong chương 12 từ chối giết đối thủ mặc dù đã có cơ hội?</div>
                </div>
              </div>

              {/* Assistant msg */}
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <div style={{ width: 36, height: 36, background: "var(--ink)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 800, border: "2px solid var(--border)", flexShrink: 0 }}>問</div>
                <div style={{ flex: 1, maxWidth: 620 }}>
                  <div className="stroke-ink" style={{ background: "#fff", padding: "14px 18px", borderRadius: 2 }}>
                    <div style={{ fontSize: 14, lineHeight: 1.65 }}>
                      Trong chương 12, Kenshin từ chối giết đối thủ vì <strong>lời thề không sát sinh</strong> mà anh đã lập sau kết thúc thời kỳ Bakumatsu. Điều này được thể hiện qua:
                      <ol style={{ paddingLeft: 20, marginTop: 10 }}>
                        <li>Thanh <span className="serif" style={{ fontWeight: 700 }}>逆刃刀 (sakabatou)</span> — lưỡi kiếm quay ngược, vật chứng vật lý cho lời thề</li>
                        <li>Hồi tưởng trong panel 3 về Tomoe (vợ cũ)</li>
                        <li>Đối thoại với Kaoru ở trang 08: "Mình đã giết đủ rồi"</li>
                      </ol>
                    </div>
                  </div>
                  {/* Sources */}
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="caps-xs" style={{ color: "var(--muted)" }}>Nguồn · 5 chunks:</span>
                    {[
                      { ch: 12, p: 8, score: 0.94 },
                      { ch: 3, p: 22, score: 0.88 },
                      { ch: 12, p: 11, score: 0.82 },
                      { ch: 7, p: 14, score: 0.76 },
                      { ch: 1, p: 4, score: 0.71 },
                    ].map(src => (
                      <div key={`${src.ch}-${src.p}`} className="chip" style={{ fontSize: 10, padding: "3px 8px", cursor: "pointer" }}>
                        <span>Ch.{src.ch} · P.{src.p}</span>
                        <span className="mono" style={{ color: "var(--muted)" }}>{src.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {state === "loading" && (
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 36, height: 36, background: "var(--ink)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 800, border: "2px solid var(--border)" }}>問</div>
                  <div className="stroke-ink" style={{ background: "#fff", padding: "14px 18px", display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s infinite" }}/>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s infinite 0.2s" }}/>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s infinite 0.4s" }}/>
                    <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8, fontFamily: "var(--font-mono)" }}>Retrieving 5 chunks · synthesizing…</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Composer */}
        <div style={{ padding: "16px 32px", borderTop: "2px solid var(--border)", background: "var(--panel)" }}>
          <div className="stroke-ink-thick" style={{ background: "#fff", padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea placeholder="Hỏi về cốt truyện, nhân vật, thuật ngữ…" rows={1}
                      style={{ flex: 1, border: "none", outline: "none", resize: "none", fontSize: 14, fontFamily: "inherit", background: "transparent", color: "var(--fg)" }}/>
            <button className="btn btn-primary btn-sm"><Icon name="send" size={14}/> Gửi</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            <span>Scope: 月影の剣 · 124 trang · 1,842 chunks</span>
            <span>Gemini 1.5 Flash · free tier · 158 / 500 RPD</span>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ReaderScreen = ReaderScreen;
window.QAScreen = QAScreen;
