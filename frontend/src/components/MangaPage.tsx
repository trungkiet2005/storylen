import React from 'react';

export const MangaPage = ({ w = 360, h = 520, panels = "default", showBubbles = true, showOverlay = false, overlayLang = "vn" }: { w?: number, h?: number, panels?: string, showBubbles?: boolean, showOverlay?: boolean, overlayLang?: string }) => {
  const layouts: any = {
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
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", maxWidth: '100%', height: 'auto' }}>
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
      {ls.map((p: any, i: number) => {
        const fills = [`url(#mp-ht-${panels})`, `url(#mp-ht2-${panels})`, "#fff", `url(#mp-speed-${panels})`];
        return (
          <g key={i}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={fills[i % fills.length]} stroke="#111" strokeWidth="2.5"/>
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
      {showBubbles && ls.map((p: any, i: number) => {
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
