// StoryLens shared primitives — icons, Fuji illustration, chrome, utilities

// ---------- Icons (stroke-based, monoline) ----------
const Icon = ({ name, size = 18, stroke = 2, className = "" }) => {
  const P = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", className };
  switch (name) {
    case "upload": return <svg {...P}><path d="M12 3v13"/><path d="m6 9 6-6 6 6"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>;
    case "book": return <svg {...P}><path d="M4 4h7a3 3 0 0 1 3 3v14"/><path d="M20 4h-7a3 3 0 0 0-3 3v14"/><path d="M4 4v16h7"/><path d="M20 4v16h-7"/></svg>;
    case "chat": return <svg {...P}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z"/></svg>;
    case "stack": return <svg {...P}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>;
    case "history": return <svg {...P}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>;
    case "home": return <svg {...P}><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2Z"/></svg>;
    case "search": return <svg {...P}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "sparkle": return <svg {...P}><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="m5 5 3 3M16 16l3 3M5 19l3-3M16 8l3-3"/></svg>;
    case "check": return <svg {...P}><path d="m5 12 5 5 9-11"/></svg>;
    case "x": return <svg {...P}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case "plus": return <svg {...P}><path d="M12 5v14M5 12h14"/></svg>;
    case "arrow-right": return <svg {...P}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>;
    case "arrow-left": return <svg {...P}><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>;
    case "eye": return <svg {...P}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "eye-off": return <svg {...P}><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 22 12s-1 2.2-3.2 4.3"/><path d="M6.6 6.6C3.6 8.3 2 12 2 12s3 7 10 7c1.8 0 3.4-.4 4.8-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>;
    case "moon": return <svg {...P}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>;
    case "sun": return <svg {...P}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case "zoom-in": return <svg {...P}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v6M8 11h6"/></svg>;
    case "zoom-out": return <svg {...P}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6"/></svg>;
    case "layers": return <svg {...P}><path d="m12 3 10 6-10 6-10-6 10-6Z"/><path d="m2 15 10 6 10-6"/></svg>;
    case "translate": return <svg {...P}><path d="M3 5h12"/><path d="M9 3v2c0 5-4 8-6 9"/><path d="M5 9c0 4 5 7 9 7"/><path d="M12 20h8"/><path d="m11 20 4-9 4 9"/><path d="M13 17h4"/></svg>;
    case "settings": return <svg {...P}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>;
    case "send": return <svg {...P}><path d="m22 2-7 20-4-9-9-4 20-7Z"/></svg>;
    case "menu": return <svg {...P}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case "grid": return <svg {...P}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case "trash": return <svg {...P}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/></svg>;
    case "download": return <svg {...P}><path d="M12 3v13"/><path d="m6 11 6 6 6-6"/><path d="M4 21h16"/></svg>;
    case "image": return <svg {...P}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>;
    case "spark": return <svg {...P}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>;
    case "folder": return <svg {...P}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>;
    case "bookmark": return <svg {...P}><path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/></svg>;
    case "lock": return <svg {...P}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "alert": return <svg {...P}><path d="m10.3 3.86 1.82-3.01a1 1 0 0 1 1.76 0L21.71 16.3A1 1 0 0 1 20.83 18H3.17a1 1 0 0 1-.88-1.7Z" transform="translate(0 2)"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
    case "clock": return <svg {...P}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "dots": return <svg {...P}><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>;
    case "refresh": return <svg {...P}><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></svg>;
    case "star": return <svg {...P}><path d="m12 2 3 7 7 .8-5.3 4.8 1.6 7-6.3-3.8L5.7 21.6l1.6-7L2 9.8 9 9Z"/></svg>;
    default: return null;
  }
};

// ---------- Fuji illustration ----------
// Used as hero element. Manga-style line art with halftone sky.
const FujiArt = ({ className = "", variant = "hero" }) => {
  // hero = full scene, compact = simplified
  if (variant === "compact") {
    return (
      <svg viewBox="0 0 240 120" className={className} preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="ht-c" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="0.9" fill="currentColor" opacity="0.18"/>
          </pattern>
        </defs>
        <rect width="240" height="120" fill="url(#ht-c)"/>
        {/* Mountain */}
        <path d="M0 100 L70 45 L90 58 L120 20 L150 58 L170 45 L240 100 Z" fill="currentColor" opacity="0.88"/>
        {/* Snow cap */}
        <path d="M108 32 L120 20 L132 32 L128 38 L124 34 L120 40 L116 34 L112 38 Z" fill="var(--paper)"/>
        <path d="M100 42 L108 32 L112 38 L116 34 L120 40 L124 34 L128 38 L132 32 L140 42 L135 46 L130 42 L125 48 L120 44 L115 48 L110 42 L105 46 Z" fill="var(--paper)" opacity="0.7"/>
        {/* Sun */}
        <circle cx="195" cy="35" r="14" fill="var(--beni)" opacity="0.95"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 800 500" className={className} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="halftone-sky" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.2" fill="currentColor" opacity="0.22"/>
        </pattern>
        <pattern id="halftone-dense" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.5" fill="currentColor" opacity="0.35"/>
        </pattern>
        <linearGradient id="sun-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--beni)"/>
          <stop offset="100%" stopColor="var(--beni-deep)"/>
        </linearGradient>
      </defs>

      {/* Sky halftone */}
      <rect width="800" height="320" fill="url(#halftone-sky)"/>

      {/* Rising sun */}
      <circle cx="600" cy="180" r="90" fill="url(#sun-grad)"/>
      {/* Sun rays (hinomaru radiating) */}
      <g stroke="var(--beni)" strokeWidth="3" opacity="0.7" strokeLinecap="round">
        {Array.from({length: 12}).map((_, i) => {
          const angle = (i * 30 - 90) * Math.PI/180;
          const x1 = 600 + Math.cos(angle) * 110;
          const y1 = 180 + Math.sin(angle) * 110;
          const x2 = 600 + Math.cos(angle) * 150;
          const y2 = 180 + Math.sin(angle) * 150;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}/>;
        })}
      </g>

      {/* Clouds (stylized manga lines) */}
      <g stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.55" strokeLinecap="round">
        <path d="M40 80 Q80 60 130 80 Q180 65 220 85 Q260 72 300 88"/>
        <path d="M480 60 Q520 45 570 65"/>
        <path d="M70 130 Q120 115 170 135 Q220 122 270 138"/>
        <path d="M520 130 Q560 115 600 130"/>
      </g>

      {/* Distant mountain ridge */}
      <path d="M0 340 L80 280 L140 310 L200 270 L260 295 L320 265 L380 290 L440 275 L500 300 L560 280 L620 310 L680 285 L740 305 L800 290 L800 340 Z"
            fill="currentColor" opacity="0.18"/>

      {/* Main Mount Fuji */}
      <g>
        {/* Shadow side (right) */}
        <path d="M400 110 L260 340 L540 340 Z" fill="currentColor" opacity="0.92"/>
        {/* Light side (subtle overlay for facet) */}
        <path d="M400 110 L260 340 L400 340 Z" fill="currentColor" opacity="0.82"/>
        {/* Snow cap — jagged manga edges */}
        <path d="M350 195 L360 180 L375 195 L383 180 L395 198 L400 185 L405 198 L417 180 L425 195 L440 180 L450 195
                 L455 210 L448 215 L440 208 L430 218 L420 210 L410 220 L400 212 L390 220 L380 210 L370 218 L360 208 L352 215 L345 210 Z"
              fill="var(--paper)"/>
        {/* Snow stripes flowing down */}
        <path d="M365 210 L360 250 M380 215 L375 270 M395 218 L392 290 M410 218 L415 290 M425 215 L430 270 M440 210 L445 250"
              stroke="var(--paper)" strokeWidth="2.5" fill="none" opacity="0.85" strokeLinecap="round"/>
        {/* Outline */}
        <path d="M400 110 L260 340 L540 340 Z" fill="none" stroke="var(--paper)" strokeWidth="1.5" opacity="0.4"/>
      </g>

      {/* Cherry blossom branch (top left) */}
      <g opacity="0.95">
        <path d="M0 40 Q30 55 70 45 Q100 38 140 60" stroke="var(--ink)" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M50 48 Q55 40 65 43" stroke="var(--ink)" strokeWidth="2" fill="none"/>
        <path d="M95 42 Q100 32 110 38" stroke="var(--ink)" strokeWidth="2" fill="none"/>
        {[[25,55],[60,40],[90,48],[125,55],[45,58],[80,35],[115,45]].map(([x,y],i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="6" fill="var(--beni)" opacity="0.9"/>
            <circle r="2.5" fill="var(--paper)"/>
          </g>
        ))}
      </g>

      {/* Water / ground halftone */}
      <rect y="340" width="800" height="160" fill="url(#halftone-dense)" opacity="0.7"/>
      {/* Wave lines */}
      <g stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round">
        <path d="M0 380 Q80 368 160 380 T320 380 T480 380 T640 380 T800 380"/>
        <path d="M0 410 Q80 398 160 410 T320 410 T480 410 T640 410 T800 410"/>
        <path d="M0 440 Q80 428 160 440 T320 440 T480 440 T640 440 T800 440"/>
        <path d="M0 470 Q80 458 160 470 T320 470 T480 470 T640 470 T800 470"/>
      </g>

      {/* Kanji stamp overlay (富) */}
      <g transform="translate(680 400)">
        <rect x="-28" y="-28" width="56" height="56" fill="var(--beni)" transform="rotate(-6)"/>
        <text x="0" y="8" fontSize="36" fontFamily="'Shippori Mincho', serif" fontWeight="800"
              fill="var(--paper)" textAnchor="middle" transform="rotate(-6)">富</text>
      </g>
    </svg>
  );
};

// ---------- Manga page placeholder ----------
const MangaPage = ({ w = 360, h = 520, panels = "default", showBubbles = true, showOverlay = false, overlayLang = "vn" }) => {
  // Different panel layouts
  const layouts = {
    default: [
      { x: 10, y: 10, w: 340, h: 150 },
      { x: 10, y: 170, w: 160, h: 150 },
      { x: 180, y: 170, w: 170, h: 150 },
      { x: 10, y: 330, w: 340, h: 180 },
    ],
    action: [
      { x: 10, y: 10, w: 340, h: 220, skew: -3 },
      { x: 10, y: 240, w: 180, h: 120 },
      { x: 200, y: 240, w: 150, h: 120 },
      { x: 10, y: 370, w: 340, h: 140 },
    ],
    dialogue: [
      { x: 10, y: 10, w: 165, h: 250 },
      { x: 185, y: 10, w: 165, h: 120 },
      { x: 185, y: 140, w: 165, h: 120 },
      { x: 10, y: 270, w: 340, h: 240 },
    ],
  };
  const ls = layouts[panels] || layouts.default;
  const jp = [
    "待って…まさか", "これが運命なのか", "俺は…もう戻れない", "逃げるな！", "行くぞ！",
  ];
  const vn = [
    "Khoan đã… không lẽ", "Đây là định mệnh sao?", "Mình… không thể quay lại nữa", "Đừng chạy trốn!", "Tiến lên!",
  ];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block" }}>
      <defs>
        <pattern id={`mp-ht-${panels}`} x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1" fill="#111" opacity="0.25"/>
        </pattern>
        <pattern id={`mp-ht2-${panels}`} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="0.8" fill="#111" opacity="0.4"/>
        </pattern>
        <pattern id={`mp-speed-${panels}`} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="3" height="12" fill="#111" opacity="0.6"/>
        </pattern>
      </defs>
      <rect width={w} height={h} fill="#fff"/>
      {ls.map((p, i) => {
        const fills = [`url(#mp-ht-${panels})`, `url(#mp-ht2-${panels})`, "#fff", `url(#mp-speed-${panels})`];
        return (
          <g key={i}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={fills[i % fills.length]} stroke="#111" strokeWidth="2.5"/>
            {/* Simple silhouette/shape in panel */}
            {i === 0 && (
              <g>
                <path d={`M${p.x + 40} ${p.y + p.h - 20} Q${p.x + p.w/2} ${p.y + 30} ${p.x + p.w - 40} ${p.y + p.h - 20}`}
                      fill="#111" opacity="0.55"/>
                <circle cx={p.x + p.w/2} cy={p.y + 40} r="14" fill="#111" opacity="0.7"/>
              </g>
            )}
            {i === 1 && (
              <g>
                <circle cx={p.x + p.w/2} cy={p.y + p.h/2} r="32" fill="#111" opacity="0.75"/>
                <path d={`M${p.x + p.w/2 - 20} ${p.y + p.h - 20} h40`} stroke="#111" strokeWidth="3"/>
              </g>
            )}
            {i === 2 && (
              <path d={`M${p.x + 20} ${p.y + p.h - 30} L${p.x + p.w/2} ${p.y + 30} L${p.x + p.w - 20} ${p.y + p.h - 30} Z`}
                    fill="none" stroke="#111" strokeWidth="2.5"/>
            )}
            {i === 3 && (
              <g>
                <circle cx={p.x + p.w/3} cy={p.y + p.h/2} r="22" fill="#111" opacity="0.6"/>
                <path d={`M${p.x + p.w/2} ${p.y + 20} L${p.x + p.w - 30} ${p.y + p.h - 30}`} stroke="#111" strokeWidth="2.5"/>
                <path d={`M${p.x + p.w/2 + 20} ${p.y + 20} L${p.x + p.w - 10} ${p.y + p.h - 50}`} stroke="#111" strokeWidth="2"/>
              </g>
            )}
          </g>
        );
      })}
      {showBubbles && ls.map((p, i) => {
        if (i >= 4) return null;
        const text = showOverlay ? (overlayLang === "vn" ? vn[i] : jp[i]) : jp[i];
        const bw = Math.min(p.w - 30, 110 + text.length * 4);
        const bh = 34;
        const bx = p.x + 12;
        const by = p.y + 12;
        return (
          <g key={`b${i}`}>
            <rect x={bx} y={by} width={bw} height={bh} rx="14" ry="14"
                  fill={showOverlay ? "#fffde8" : "#fff"} stroke="#111" strokeWidth="2"/>
            {showOverlay && <rect x={bx} y={by} width={bw} height={bh} rx="14" ry="14"
                  fill="none" stroke="var(--beni)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8"/>}
            <path d={`M${bx + 20} ${by + bh} l4 8 l6 -8 Z`} fill={showOverlay ? "#fffde8" : "#fff"} stroke="#111" strokeWidth="2"/>
            <text x={bx + bw/2} y={by + bh/2 + 5} textAnchor="middle"
                  fontSize={text.length > 14 ? "11" : "13"}
                  fontFamily="'Shippori Mincho', serif" fill="#111">{text}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ---------- Navigation chrome ----------
const TopBar = ({ active, onNav, theme, onToggleTheme, compact = false }) => {
  const items = [
    { id: "home", label: "Trang chủ", icon: "home" },
    { id: "upload", label: "Tải lên", icon: "upload" },
    { id: "reader", label: "Đọc truyện", icon: "book" },
    { id: "qa", label: "Hỏi AI", icon: "chat" },
    { id: "batch", label: "Batch", icon: "stack" },
    { id: "history", label: "Lịch sử", icon: "history" },
  ];
  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: compact ? "10px 20px" : "14px 28px",
      borderBottom: "2px solid var(--border)",
      background: "var(--panel)",
      position: "sticky", top: 0, zIndex: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Logo />
        <nav style={{ display: "flex", gap: 2, marginLeft: 20 }}>
          {items.map(it => (
            <div key={it.id} className="tab" data-active={active === it.id} onClick={() => onNav?.(it.id)}>
              <Icon name={it.icon} size={14}/>
              <span>{it.label}</span>
            </div>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", border: "1.5px solid var(--border-soft)", borderRadius: 2, fontSize: 12, color: "var(--muted)" }}>
          <Icon name="search" size={14}/>
          <span>Tìm bộ truyện, nhân vật…</span>
          <span style={{ marginLeft: 14, padding: "1px 6px", border: "1px solid var(--border-soft)", fontFamily: "var(--font-mono)", fontSize: 10 }}>⌘K</span>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={onToggleTheme} title="Toggle theme">
          <Icon name={theme === "dark" ? "sun" : "moon"} size={14}/>
        </button>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontWeight: 800, border: "2px solid var(--border)" }}>K</div>
      </div>
    </header>
  );
};

// ---------- Logo ----------
const Logo = ({ size = 22 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <svg viewBox="0 0 40 40" width={size + 10} height={size + 10}>
      <rect x="2" y="2" width="36" height="36" fill="var(--accent)" stroke="var(--border)" strokeWidth="2.5" transform="rotate(-4 20 20)"/>
      <text x="20" y="28" textAnchor="middle" fontSize="22" fontFamily="'Shippori Mincho', serif" fontWeight="800" fill="var(--paper)" transform="rotate(-4 20 20)">物</text>
    </svg>
    <div style={{ lineHeight: 1 }}>
      <div className="display" style={{ fontSize: size, letterSpacing: "-0.02em" }}>StoryLens</div>
      <div className="caps-xs" style={{ color: "var(--muted)", marginTop: 3 }}>物語 · ストーリーレンズ</div>
    </div>
  </div>
);

// ---------- Divider with kanji ----------
const KanjiDivider = ({ kanji = "第", label = "" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "32px 0" }}>
    <div style={{ flex: 1, height: 2, background: "var(--border)" }}/>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="serif" style={{ fontSize: 24, color: "var(--accent)", fontWeight: 800 }}>{kanji}</span>
      {label && <span className="caps-sm" style={{ color: "var(--muted)" }}>{label}</span>}
    </div>
    <div style={{ flex: 1, height: 2, background: "var(--border)" }}/>
  </div>
);

// ---------- Section header ----------
const SectionHeader = ({ kanji, label, title, subtitle, stamp }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 20 }}>
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        {kanji && <span className="serif" style={{ fontSize: 28, color: "var(--accent)", fontWeight: 800, lineHeight: 1 }}>{kanji}</span>}
        {label && <span className="caps-sm" style={{ color: "var(--muted)" }}>{label}</span>}
      </div>
      <div className="display" style={{ fontSize: 32 }}>{title}</div>
      {subtitle && <div style={{ color: "var(--fg-soft)", marginTop: 6, maxWidth: 620 }}>{subtitle}</div>}
    </div>
    {stamp && <div className="seal">{stamp}</div>}
  </div>
);

Object.assign(window, { Icon, FujiArt, MangaPage, TopBar, Logo, KanjiDivider, SectionHeader });
