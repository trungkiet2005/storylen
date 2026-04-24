// Command Palette, Custom Cursor, Grain, Scroll Progress, Audio, Intro

// ---- Command Palette (⌘K) ----
function CommandPalette({ open, onClose, onNav, onSetTweak, values, screen }) {
  const [q, setQ] = React.useState("");
  const inputRef = React.useRef();
  React.useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const commands = [
    { group: "Điều hướng", icon: "home", label: "Trang chủ", kbd: "G H", run: () => onNav("home") },
    { group: "Điều hướng", icon: "upload", label: "Tải trang manga", kbd: "G U", run: () => onNav("upload") },
    { group: "Điều hướng", icon: "book", label: "Đọc truyện (Reader)", kbd: "G R", run: () => onNav("reader") },
    { group: "Điều hướng", icon: "chat", label: "Hỏi AI (Q&A)", kbd: "G Q", run: () => onNav("qa") },
    { group: "Điều hướng", icon: "stack", label: "Batch Upload", kbd: "G B", run: () => onNav("batch") },
    { group: "Điều hướng", icon: "history", label: "Lịch sử", kbd: "G L", run: () => onNav("history") },
    { group: "Giao diện", icon: values.theme === "dark" ? "sun" : "moon", label: `Chuyển sang ${values.theme === "dark" ? "light" : "dark"} mode`, run: () => onSetTweak("theme", values.theme === "dark" ? "light" : "dark") },
    { group: "Giao diện", icon: "layers", label: "Home · Editorial", run: () => { onSetTweak("homeVariant", "editorial"); onNav("home"); } },
    { group: "Giao diện", icon: "layers", label: "Home · Poster", run: () => { onSetTweak("homeVariant", "poster"); onNav("home"); } },
    { group: "Giao diện", icon: "layers", label: "Home · Library", run: () => { onSetTweak("homeVariant", "library"); onNav("home"); } },
    ...(screen === "reader" ? [
      { group: "Reader", icon: "layers", label: "Mode · Overlay", run: () => onSetTweak("readerMode", "overlay") },
      { group: "Reader", icon: "grid", label: "Mode · Song ngữ", run: () => onSetTweak("readerMode", "sidebyside") },
      { group: "Reader", icon: "plus", label: "Mode · Tap to reveal", run: () => onSetTweak("readerMode", "tap") },
    ] : []),
    ...(screen === "qa" ? [
      { group: "Q&A", icon: "sparkle", label: "State · Có câu trả lời", run: () => onSetTweak("qaState", "active") },
      { group: "Q&A", icon: "clock", label: "State · Đang retrieve", run: () => onSetTweak("qaState", "loading") },
      { group: "Q&A", icon: "plus", label: "State · Empty (mới vào)", run: () => onSetTweak("qaState", "empty") },
    ] : []),
    ...(screen === "upload" ? [
      { group: "Upload", icon: "upload", label: "State · Idle", run: () => onSetTweak("uploadState", "idle") },
      { group: "Upload", icon: "refresh", label: "State · Processing", run: () => onSetTweak("uploadState", "processing") },
      { group: "Upload", icon: "alert", label: "State · Error", run: () => onSetTweak("uploadState", "error") },
    ] : []),
    { group: "Audio", icon: values.audio ? "eye-off" : "eye", label: `${values.audio ? "Tắt" : "Bật"} âm thanh (giấy/stamp)`, run: () => onSetTweak("audio", !values.audio) },
    { group: "Audio", icon: values.grain ? "eye-off" : "eye", label: `${values.grain ? "Tắt" : "Bật"} film grain`, run: () => onSetTweak("grain", !values.grain) },
  ];
  const filtered = q ? commands.filter(c => (c.label + c.group).toLowerCase().includes(q.toLowerCase())) : commands;
  const groups = {};
  filtered.forEach(c => { (groups[c.group] = groups[c.group] || []).push(c); });

  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,17,17,0.55)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "14vh" }}>
      <div onClick={(e) => e.stopPropagation()} className="stroke-ink-thick panel-shadow-lg" style={{ background: "var(--panel)", width: 620, maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden", animation: "cmd-in 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "2px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="search" size={16}/>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                 placeholder="Tìm lệnh · screen · settings…"
                 style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 15, fontFamily: "inherit", color: "var(--fg)" }}/>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)", padding: "3px 7px", border: "1px solid var(--border-soft)" }}>ESC</span>
        </div>
        <div className="scroll" style={{ overflowY: "auto", padding: "8px 8px 14px" }}>
          {Object.entries(groups).map(([g, items]) => (
            <div key={g} style={{ marginTop: 10 }}>
              <div className="caps-xs" style={{ color: "var(--muted)", padding: "4px 12px" }}>{g}</div>
              {items.map((c, i) => (
                <div key={i} onClick={() => { c.run(); onClose(); }}
                     style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", fontSize: 13, borderRadius: 2 }}
                     onMouseEnter={e => e.currentTarget.style.background = "var(--bg-2)"}
                     onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <Icon name={c.icon} size={14}/>
                  <span style={{ flex: 1 }}>{c.label}</span>
                  {c.kbd && <span className="mono" style={{ fontSize: 10, color: "var(--muted)", padding: "2px 6px", border: "1px solid var(--border-soft)" }}>{c.kbd}</span>}
                </div>
              ))}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Không tìm thấy lệnh</div>}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          <span>↑↓ điều hướng · ↵ chạy</span>
          <span>⌘K để mở lại</span>
        </div>
      </div>
    </div>
  );
}

// ---- Custom Cursor (ink dot + trail) ----
function CustomCursor() {
  const dotRef = React.useRef();
  const ringRef = React.useRef();
  const pos = React.useRef({ x: 0, y: 0, rx: 0, ry: 0 });
  React.useEffect(() => {
    const move = (e) => { pos.current.x = e.clientX; pos.current.y = e.clientY; };
    const down = () => { if (dotRef.current) dotRef.current.style.transform = "translate(-50%,-50%) scale(0.6)"; };
    const up = () => { if (dotRef.current) dotRef.current.style.transform = "translate(-50%,-50%) scale(1)"; };
    const over = (e) => {
      const hoverable = e.target.closest("button, a, [data-nav], input, textarea, [role='button'], .chip, [onclick]");
      if (ringRef.current) ringRef.current.dataset.hover = !!hoverable;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mousemove", over);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    let raf;
    const tick = () => {
      pos.current.rx += (pos.current.x - pos.current.rx) * 0.18;
      pos.current.ry += (pos.current.y - pos.current.ry) * 0.18;
      if (dotRef.current) { dotRef.current.style.left = pos.current.x + "px"; dotRef.current.style.top = pos.current.y + "px"; }
      if (ringRef.current) { ringRef.current.style.left = pos.current.rx + "px"; ringRef.current.style.top = pos.current.ry + "px"; }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("mousemove", move); window.removeEventListener("mousemove", over); window.removeEventListener("mousedown", down); window.removeEventListener("mouseup", up); };
  }, []);
  return (
    <>
      <div ref={ringRef} className="cursor-ring"/>
      <div ref={dotRef} className="cursor-dot"/>
    </>
  );
}

// ---- Film Grain overlay (SVG animated noise) ----
function Grain() {
  return (
    <div className="grain-overlay" aria-hidden>
      <svg width="100%" height="100%">
        <filter id="noise-f">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.22 0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noise-f)"/>
      </svg>
    </div>
  );
}

// ---- Scroll progress (vertical chapter counter) ----
function ScrollProgress({ chapters = ["第一章", "第二章", "第三章", "第四章"] }) {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const activeIdx = Math.min(chapters.length - 1, Math.floor(p * chapters.length));
  return (
    <div style={{ position: "fixed", right: 20, top: "50%", transform: "translateY(-50%)", zIndex: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none" }}>
      <div style={{ writingMode: "vertical-rl", textOrientation: "upright", fontFamily: "var(--font-serif)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.2em", marginBottom: 6 }}>SCROLL</div>
      <div style={{ position: "relative", width: 2, height: 200, background: "var(--border-soft)" }}>
        <div style={{ position: "absolute", top: 0, left: -1, width: 4, background: "var(--accent)", height: `${p * 100}%`, transition: "height 0.1s linear" }}/>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
        {chapters.map((c, i) => (
          <div key={i} className="serif" style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: 11, color: i === activeIdx ? "var(--accent)" : "var(--muted)", fontWeight: i === activeIdx ? 700 : 400, letterSpacing: "0.1em" }}>{c}</div>
        ))}
      </div>
      <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>{Math.round(p * 100)}%</div>
    </div>
  );
}

// ---- Audio manager ----
const AudioEngine = {
  ctx: null,
  enabled: false,
  init() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
    }
  },
  click() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square"; o.frequency.value = 180;
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t + 0.08);
  },
  stamp() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    // thump
    const o1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    o1.type = "sine"; o1.frequency.setValueAtTime(120, t); o1.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g1.gain.setValueAtTime(0.25, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o1.connect(g1).connect(this.ctx.destination);
    o1.start(t); o1.stop(t + 0.25);
    // noise tail
    const bufSize = this.ctx.sampleRate * 0.1;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const gn = this.ctx.createGain();
    gn.gain.value = 0.1;
    noise.connect(gn).connect(this.ctx.destination);
    noise.start(t);
  },
  paper() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const bufSize = this.ctx.sampleRate * 0.25;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const env = Math.exp(-i / (bufSize * 0.4));
      data[i] = (Math.random() * 2 - 1) * env * 0.5;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass"; filter.frequency.value = 2000;
    const g = this.ctx.createGain(); g.gain.value = 0.15;
    src.connect(filter).connect(g).connect(this.ctx.destination);
    src.start(t);
  },
};
window.AudioEngine = AudioEngine;

function AudioHost({ enabled }) {
  React.useEffect(() => {
    AudioEngine.enabled = enabled;
    if (enabled) AudioEngine.init();
  }, [enabled]);
  React.useEffect(() => {
    const click = (e) => {
      if (!enabled) return;
      if (e.target.closest("button, [data-nav], .chip")) AudioEngine.click();
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, [enabled]);
  return null;
}

// ---- Cinematic intro ----
function Intro({ onDone }) {
  const [phase, setPhase] = React.useState(0);
  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => { setPhase(3); onDone?.(); AudioEngine.stamp(); }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "var(--ink)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: phase >= 3 ? "none" : "auto", opacity: phase >= 3 ? 0 : 1, transition: "opacity 0.6s cubic-bezier(0.2, 0.9, 0.3, 1)" }}>
      {/* Halftone bg */}
      <div className="halftone-dense" style={{ position: "absolute", inset: 0, color: "var(--paper)", opacity: 0.08 }}/>

      {/* Fuji line drawing */}
      <svg viewBox="0 0 400 220" style={{ position: "absolute", bottom: "30%", width: 500, transform: `translateY(${phase >= 1 ? 0 : 40}px)`, opacity: phase >= 1 ? 1 : 0, transition: "all 0.9s cubic-bezier(0.2, 0.9, 0.3, 1)" }}>
        <path d="M0 180 L140 70 L170 95 L200 40 L230 95 L260 70 L400 180 Z"
              fill="none" stroke="var(--paper)" strokeWidth="2.5"
              strokeDasharray="1000" strokeDashoffset={phase >= 1 ? 0 : 1000}
              style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.2, 0.9, 0.3, 1)" }}/>
        <path d="M180 58 L200 40 L220 58 L215 66 L210 60 L205 70 L200 62 L195 70 L190 60 L185 66 Z"
              fill={phase >= 2 ? "var(--paper)" : "none"}
              style={{ transition: "fill 0.5s ease 0.8s" }}/>
      </svg>

      {/* Hanko stamp */}
      <div style={{ position: "absolute", top: "32%", transform: `scale(${phase >= 2 ? 1 : 2}) rotate(${phase >= 2 ? -8 : -30}deg)`, opacity: phase >= 2 ? 1 : 0, transition: "all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)", width: 120, height: 120, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid var(--paper)", boxShadow: "0 0 0 6px var(--accent)" }}>
        <span className="serif" style={{ fontSize: 72, fontWeight: 800, color: "var(--paper)" }}>物</span>
      </div>

      {/* Text */}
      <div style={{ position: "absolute", bottom: "18%", textAlign: "center", opacity: phase >= 2 ? 1 : 0, transform: `translateY(${phase >= 2 ? 0 : 20}px)`, transition: "all 0.6s 0.2s cubic-bezier(0.2, 0.9, 0.3, 1)" }}>
        <div className="caps-sm" style={{ color: "var(--accent)", marginBottom: 8 }}>物語 · ストーリーレンズ</div>
        <div className="display" style={{ fontSize: 42, color: "var(--paper)" }}>StoryLens</div>
      </div>
    </div>
  );
}

window.CommandPalette = CommandPalette;
window.CustomCursor = CustomCursor;
window.Grain = Grain;
window.ScrollProgress = ScrollProgress;
window.AudioHost = AudioHost;
window.Intro = Intro;
