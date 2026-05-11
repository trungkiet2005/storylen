"use client";
import React, { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { SectionHeader } from '@/components/SectionHeader';
import { Icon } from '@/components/Icons';
import { MangaPage } from '@/components/MangaPage';
import Link from 'next/link';

export default function UploadPage() {
  const [state, setState] = useState("idle");

  return (
    <div className="paper-grain" style={{ minHeight: "100vh" }}>
      <TopBar active="upload" />
      <div style={{ padding: "40px 56px" }}>
        <SectionHeader kanji="入" label="Upload · Tải lên" title="Tải trang manga để dịch" subtitle="Hỗ trợ JPG, PNG, WEBP. Tối đa 20MB / ảnh. Xử lý qua YOLOv8 (bubble detection) + Manga-OCR (text extraction)." stamp="入稿"/>

        {/* Demo toggles */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button className="btn btn-sm" onClick={() => setState("idle")}>Idle State</button>
          <button className="btn btn-sm" onClick={() => setState("processing")}>Processing State</button>
          <button className="btn btn-sm" onClick={() => setState("error")}>Error State</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
          {/* Dropzone */}
          <div className="stroke-ink-thick panel-shadow" style={{ background: "var(--panel)", minHeight: 520, position: "relative", overflow: "hidden" }}>
            {state === "idle" && (
              <div style={{ padding: 56, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 520, position: "relative" }}>
                <div className="halftone" style={{ position: "absolute", inset: 20, border: "2px dashed var(--border)", pointerEvents: "none" }}/>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 96, height: 96, background: "var(--accent)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: "3px solid var(--border)", boxShadow: "4px 4px 0 var(--border)" }}>
                    <Icon name="upload" size={42} stroke={2.5}/>
                  </div>
                  <div className="display" style={{ fontSize: 28 }}>Kéo thả trang manga vào đây</div>
                  <div style={{ color: "var(--fg-soft)", marginTop: 8, marginBottom: 24 }}>hoặc</div>
                  <button className="btn btn-primary" onClick={() => setState("processing")}><Icon name="folder" size={14}/> Chọn file từ máy</button>
                  <div style={{ marginTop: 24, fontSize: 12, color: "var(--muted)" }}>JPG · PNG · WEBP — tối đa 20MB mỗi file</div>
                </div>
              </div>
            )}
            {state === "processing" && (
              <div style={{ padding: 40, minHeight: 520 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div>
                    <div className="caps-sm" style={{ color: "var(--accent)" }}>Đang xử lý · Processing</div>
                    <div className="display" style={{ fontSize: 22, marginTop: 4 }}>page_04_chapter12.jpg</div>
                  </div>
                  <div className="chip chip-accent">3.2 MB</div>
                </div>
                {/* Preview with overlaid bubble detection */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>Ảnh gốc</div>
                    <div className="stroke-ink" style={{ background: "#fff" }}>
                      <MangaPage w={280} h={300} panels="default" showBubbles={true} showOverlay={false}/>
                    </div>
                  </div>
                  <div>
                    <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>◯ YOLOv8 · phát hiện bubble</div>
                    <div className="stroke-ink" style={{ background: "#fff", position: "relative" }}>
                      <MangaPage w={280} h={300} panels="default" showBubbles={true} showOverlay={false}/>
                      <svg viewBox="0 0 280 300" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                        <rect x="18" y="18" width="90" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                        <rect x="18" y="135" width="90" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                        <rect x="148" y="135" width="80" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Pipeline progress */}
                <div style={{ marginTop: 28 }}>
                  {[
                    { step: "Bubble detection (YOLOv8)", done: true, time: "0.8s" },
                    { step: "Text extraction (Manga-OCR)", done: true, time: "1.4s" },
                    { step: "Context retrieval (ChromaDB)", done: false, active: true, time: "…" },
                    { step: "Translation (Gemini)", done: false, time: "—" },
                    { step: "Index to vector DB", done: false, time: "—" },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < 4 ? "1px dashed var(--border-soft)" : "none" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--border)", background: s.done ? "var(--accent)" : s.active ? "var(--bg-2)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {s.done && <Icon name="check" size={12} stroke={3}/>}
                        {s.active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s infinite" }}/>}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: s.active ? 700 : 500, color: s.done ? "var(--muted)" : "var(--fg)" }}>{s.step}</span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {state === "error" && (
              <div style={{ padding: 56, textAlign: "center", minHeight: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 80, height: 80, background: "var(--accent)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid var(--border)", marginBottom: 20 }}>
                  <Icon name="alert" size={38}/>
                </div>
                <div className="display" style={{ fontSize: 24, color: "var(--accent)" }}>Không thể xử lý file</div>
                <div style={{ color: "var(--fg-soft)", marginTop: 8, maxWidth: 400 }}>Manga-OCR không nhận diện được text trong ảnh. Có thể do độ phân giải thấp hoặc chất lượng scan không rõ.</div>
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <button className="btn" onClick={() => setState("processing")}><Icon name="refresh" size={14}/> Thử lại</button>
                  <button className="btn btn-primary" onClick={() => setState("idle")}>Tải ảnh khác</button>
                </div>
              </div>
            )}
          </div>

          {/* Right column — series info & settings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20 }}>
              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>Gắn vào bộ truyện</div>
              <div style={{ position: "relative" }}>
                <input placeholder="Chọn hoặc tạo bộ truyện mới…" style={{ width: "100%", padding: "10px 12px", border: "2px solid var(--border)", background: "var(--bg)", fontSize: 13, fontFamily: "inherit" }}/>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["月影の剣", "春の足音", "+ Tạo mới"].map((t,i) => (
                  <div key={t} className={`chip ${i === 0 ? "chip-accent" : ""}`} style={{ cursor: "pointer" }}>{t}</div>
                ))}
              </div>
            </div>

            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20 }}>
              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>Tùy chọn dịch</div>
              {[
                { label: "Dùng glossary đã lưu", on: true },
                { label: "Giữ âm danh từ riêng (onyomi)", on: true },
                { label: "Index vào vector DB", on: true },
                { label: "Phát hiện SFX/onomatopoeia", on: false },
              ].map(o => (
                <div key={o.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px dashed var(--border-soft)" }}>
                  <span style={{ fontSize: 13 }}>{o.label}</span>
                  <div style={{ width: 36, height: 20, background: o.on ? "var(--accent)" : "var(--bg-3)", border: "2px solid var(--border)", borderRadius: 999, position: "relative" }}>
                    <div style={{ position: "absolute", top: 1, left: o.on ? 17 : 1, width: 14, height: 14, background: "var(--paper)", border: "1.5px solid var(--border)", borderRadius: "50%" }}/>
                  </div>
                </div>
              ))}
            </div>

            <div className="stroke-ink" style={{ background: "var(--bg-2)", padding: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Icon name="sparkle" size={16}/>
                <div style={{ fontSize: 12, color: "var(--fg-soft)", lineHeight: 1.5 }}>
                  <strong>Mẹo:</strong> Với chương nhiều trang, dùng <Link href="/batch" style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 700 }}>Batch Upload</Link> để xử lý tuần tự và tiết kiệm quota Gemini.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
