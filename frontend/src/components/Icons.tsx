export type IconName =
  | "home" | "upload" | "book" | "chat" | "stack" | "history" | "search"
  | "arrow-right" | "arrow-left"
  | "plus" | "x" | "check" | "refresh" | "send" | "folder" | "bookmark"
  | "alert" | "dots" | "dots-h" | "download" | "trash" | "copy"
  | "eye" | "eye-off" | "layers" | "grid" | "menu"
  | "zoom-in" | "zoom-out"
  | "image" | "file"
  | "translate" | "sparkle" | "clock" | "info" | "settings" | "user" | "key" | "external"
  | "moon" | "sun"
  | "star" | "star-fill" | "chart" | "leaf" | "fire" | "trophy" | "pdf" | "tag" | "close"
  | "chevron-right" | "chevron-left" | "chevron-down" | "chevron-up"
  | "link" | "magic" | "zap";

export const Icon = ({ name, size = 18, stroke = 2, className = "" }: { name: IconName | string, size?: number, stroke?: number, className?: string }) => {
  const P = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };
  switch (name) {
    // Navigation
    case "home": return <svg {...P}><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2Z"/></svg>;
    case "upload": return <svg {...P}><path d="M12 3v13"/><path d="m6 9 6-6 6 6"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>;
    case "book": return <svg {...P}><path d="M4 4h7a3 3 0 0 1 3 3v14"/><path d="M20 4h-7a3 3 0 0 0-3 3v14"/><path d="M4 4v16h7"/><path d="M20 4v16h-7"/></svg>;
    case "chat": return <svg {...P}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z"/></svg>;
    case "stack": return <svg {...P}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>;
    case "history": return <svg {...P}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>;
    case "search": return <svg {...P}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "arrow-right": return <svg {...P}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>;
    case "arrow-left": return <svg {...P}><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>;

    // Actions
    case "plus": return <svg {...P}><path d="M12 5v14"/><path d="M5 12h14"/></svg>;
    case "x": return <svg {...P}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
    case "check": return <svg {...P}><path d="M20 6 9 17l-5-5"/></svg>;
    case "refresh": return <svg {...P}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>;
    case "send": return <svg {...P}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
    case "folder": return <svg {...P}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>;
    case "bookmark": return <svg {...P}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"/></svg>;
    case "alert": return <svg {...P}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case "dots": return <svg {...P}><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>;
    case "dots-h": return <svg {...P}><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>;
    case "download": return <svg {...P}><path d="M12 3v13"/><path d="m6 15 6 6 6-6"/><path d="M4 20h16"/></svg>;
    case "trash": return <svg {...P}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
    case "copy": return <svg {...P}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;

    // View / Layout
    case "eye": return <svg {...P}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "eye-off": return <svg {...P}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>;
    case "layers": return <svg {...P}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.65-8.58 3.91a2 2 0 0 1-1.66 0L3.42 12.65"/><path d="m22 17.65-8.58 3.91a2 2 0 0 1-1.66 0L3.42 17.65"/></svg>;
    case "grid": return <svg {...P}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case "menu": return <svg {...P}><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>;
    case "zoom-in": return <svg {...P}><circle cx="11" cy="11" r="7"/><path d="m21 21-3.5-3.5"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>;
    case "zoom-out": return <svg {...P}><circle cx="11" cy="11" r="7"/><path d="m21 21-3.5-3.5"/><path d="M8 11h6"/></svg>;

    // Media / Files
    case "image": return <svg {...P}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>;
    case "file": return <svg {...P}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>;

    // Icons for themed features
    case "translate": return <svg {...P}><path d="M3 5h12"/><path d="M9 3v2c0 5-4 8-6 9"/><path d="M5 9c0 4 5 7 9 7"/><path d="M12 20h8"/><path d="m11 20 4-9 4 9"/><path d="M13 17h4"/></svg>;
    case "sparkle": return <svg {...P}><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="m5 5 3 3M16 16l3 3M5 19l3-3M16 8l3-3"/></svg>;
    case "clock": return <svg {...P}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "info": return <svg {...P}><circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>;
    case "settings": return <svg {...P}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "user": return <svg {...P}><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>;
    case "key": return <svg {...P}><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>;
    case "external": return <svg {...P}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;

    // Theme
    case "moon": return <svg {...P}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>;
    case "sun": return <svg {...P}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;

    // Wibu features
    case "star": return <svg {...P}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>;
    case "star-fill": return <svg {...P} fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>;
    case "chart": return <svg {...P}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
    case "leaf": return <svg {...P}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>;
    case "fire": return <svg {...P}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
    case "trophy": return <svg {...P}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
    case "pdf": return <svg {...P}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/><polyline points="9,9 9,13"/></svg>;
    case "tag": return <svg {...P}><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>;
    case "close": return <svg {...P}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;

    // Misc
    case "chevron-right": return <svg {...P}><path d="m9 18 6-6-6-6"/></svg>;
    case "chevron-left": return <svg {...P}><path d="m15 18-6-6 6-6"/></svg>;
    case "chevron-down": return <svg {...P}><path d="m6 9 6 6 6-6"/></svg>;
    case "chevron-up": return <svg {...P}><path d="m18 15-6-6-6 6"/></svg>;
    case "link": return <svg {...P}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
    case "magic": return <svg {...P}><path d="m15 5 4 4"/><path d="M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13"/><path d="m8 6 2-2"/><path d="m2 22 5.5-1.5L21 7a2.12 2.12 0 0 0-3-3L4.5 17.5Z"/><path d="m18 16 2-2"/><path d="m17 11 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17"/></svg>;
    case "zap": return <svg {...P}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></svg>;
    default: return <svg {...P}><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>;
  }
};
