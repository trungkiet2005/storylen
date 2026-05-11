import React from 'react';

export const SectionHeader = ({ kanji, label, title, subtitle, stamp }: { kanji?: string, label?: string, title: string, subtitle?: string, stamp?: string }) => (
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
