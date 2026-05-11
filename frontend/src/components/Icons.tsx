export const Icon = ({ name, size = 18, stroke = 2, className = "" }: { name: string, size?: number, stroke?: number, className?: string }) => {
  const P = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };
  switch (name) {
    case "upload": return <svg {...P}><path d="M12 3v13"/><path d="m6 9 6-6 6 6"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>;
    case "book": return <svg {...P}><path d="M4 4h7a3 3 0 0 1 3 3v14"/><path d="M20 4h-7a3 3 0 0 0-3 3v14"/><path d="M4 4v16h7"/><path d="M20 4v16h-7"/></svg>;
    case "chat": return <svg {...P}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z"/></svg>;
    case "stack": return <svg {...P}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>;
    case "history": return <svg {...P}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>;
    case "home": return <svg {...P}><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2Z"/></svg>;
    case "search": return <svg {...P}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "sparkle": return <svg {...P}><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="m5 5 3 3M16 16l3 3M5 19l3-3M16 8l3-3"/></svg>;
    case "arrow-right": return <svg {...P}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>;
    case "eye": return <svg {...P}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "translate": return <svg {...P}><path d="M3 5h12"/><path d="M9 3v2c0 5-4 8-6 9"/><path d="M5 9c0 4 5 7 9 7"/><path d="M12 20h8"/><path d="m11 20 4-9 4 9"/><path d="M13 17h4"/></svg>;
    case "moon": return <svg {...P}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>;
    case "sun": return <svg {...P}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    default: return null;
  }
};
