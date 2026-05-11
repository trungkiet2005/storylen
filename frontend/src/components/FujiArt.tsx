export const FujiArt = ({ className = "", variant = "hero" }: { className?: string, variant?: "hero" | "compact" }) => {
  if (variant === "compact") {
    return (
      <svg viewBox="0 0 240 120" className={className} preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="ht-c" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="0.9" fill="currentColor" opacity="0.18"/>
          </pattern>
        </defs>
        <rect width="240" height="120" fill="url(#ht-c)"/>
        <path d="M0 100 L70 45 L90 58 L120 20 L150 58 L170 45 L240 100 Z" fill="currentColor" opacity="0.88"/>
        <path d="M108 32 L120 20 L132 32 L128 38 L124 34 L120 40 L116 34 L112 38 Z" fill="var(--paper)"/>
        <path d="M100 42 L108 32 L112 38 L116 34 L120 40 L124 34 L128 38 L132 32 L140 42 L135 46 L130 42 L125 48 L120 44 L115 48 L110 42 L105 46 Z" fill="var(--paper)" opacity="0.7"/>
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

      <rect width="800" height="320" fill="url(#halftone-sky)"/>
      <circle cx="600" cy="180" r="90" fill="url(#sun-grad)"/>
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

      <g stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.55" strokeLinecap="round">
        <path d="M40 80 Q80 60 130 80 Q180 65 220 85 Q260 72 300 88"/>
        <path d="M480 60 Q520 45 570 65"/>
        <path d="M70 130 Q120 115 170 135 Q220 122 270 138"/>
        <path d="M520 130 Q560 115 600 130"/>
      </g>

      <path d="M0 340 L80 280 L140 310 L200 270 L260 295 L320 265 L380 290 L440 275 L500 300 L560 280 L620 310 L680 285 L740 305 L800 290 L800 340 Z" fill="currentColor" opacity="0.18"/>

      <g>
        <path d="M400 110 L260 340 L540 340 Z" fill="currentColor" opacity="0.92"/>
        <path d="M400 110 L260 340 L400 340 Z" fill="currentColor" opacity="0.82"/>
        <path d="M350 195 L360 180 L375 195 L383 180 L395 198 L400 185 L405 198 L417 180 L425 195 L440 180 L450 195 L455 210 L448 215 L440 208 L430 218 L420 210 L410 220 L400 212 L390 220 L380 210 L370 218 L360 208 L352 215 L345 210 Z" fill="var(--paper)"/>
        <path d="M365 210 L360 250 M380 215 L375 270 M395 218 L392 290 M410 218 L415 290 M425 215 L430 270 M440 210 L445 250" stroke="var(--paper)" strokeWidth="2.5" fill="none" opacity="0.85" strokeLinecap="round"/>
        <path d="M400 110 L260 340 L540 340 Z" fill="none" stroke="var(--paper)" strokeWidth="1.5" opacity="0.4"/>
      </g>

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

      <rect y="340" width="800" height="160" fill="url(#halftone-dense)" opacity="0.7"/>
      <g stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round">
        <path d="M0 380 Q80 368 160 380 T320 380 T480 380 T640 380 T800 380"/>
        <path d="M0 410 Q80 398 160 410 T320 410 T480 410 T640 410 T800 410"/>
        <path d="M0 440 Q80 428 160 440 T320 440 T480 440 T640 440 T800 440"/>
        <path d="M0 470 Q80 458 160 470 T320 470 T480 470 T640 470 T800 470"/>
      </g>

      <g transform="translate(680 400)">
        <rect x="-28" y="-28" width="56" height="56" fill="var(--beni)" transform="rotate(-6)"/>
        <text x="0" y="8" fontSize="36" fontFamily="'Shippori Mincho', serif" fontWeight="800" fill="var(--paper)" textAnchor="middle" transform="rotate(-6)">富</text>
      </g>
    </svg>
  );
};
