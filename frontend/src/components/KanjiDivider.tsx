export const KanjiDivider = ({ kanji = "第", label = "" }: { kanji?: string, label?: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "32px 0" }}>
    <div style={{ flex: 1, height: 2, background: "var(--border)" }}/>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="serif" style={{ fontSize: 24, color: "var(--accent)", fontWeight: 800 }}>{kanji}</span>
      {label && <span className="caps-sm" style={{ color: "var(--muted)" }}>{label}</span>}
    </div>
    <div style={{ flex: 1, height: 2, background: "var(--border)" }}/>
  </div>
);
