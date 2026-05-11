"use client";
import React from 'react';
import Image from 'next/image';
import { TopBar } from '@/components/TopBar';
import { FujiArt } from '@/components/FujiArt';
import { Icon } from '@/components/Icons';
import { KanjiDivider } from '@/components/KanjiDivider';

export default function Home() {
  return (
    <div className="paper-grain" style={{ minHeight: "100vh" }}>
      <TopBar active="home" />
      
      {/* Hero Section - V2 Poster Inspired */}
      <div style={{ padding: 40 }}>
        <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "var(--bg-2)", position: "relative", overflow: "hidden", padding: "80px 56px", minHeight: 620 }}>
          {/* Giant kanji bg */}
          <div style={{ position: "absolute", right: -40, top: -60, fontFamily: "var(--font-serif)", fontSize: 520, fontWeight: 800, color: "var(--accent)", opacity: 0.14, lineHeight: 0.8, pointerEvents: "none" }}>物</div>
          {/* Halftone corner */}
          <div className="halftone-coarse" style={{ position: "absolute", left: 0, bottom: 0, width: 300, height: 300, color: "var(--ink)", opacity: 0.6 }}/>

          <div style={{ position: "relative", maxWidth: 700 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--ink)", color: "var(--paper)", fontSize: 11, letterSpacing: "0.2em", fontWeight: 700 }}>
              ストーリーレンズ · STORYLENS VOL. 1
            </div>
            <h1 className="display" style={{ fontSize: 110, margin: "18px 0 0", lineHeight: 0.92 }}>
              MANGA,<br/>
              ĐỌC NHƯ<br/>
              <span style={{ color: "var(--accent)", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>người Nhật.</span>
            </h1>
            <p className="serif" style={{ fontSize: 20, marginTop: 24, maxWidth: 540, lineHeight: 1.5 }}>
              Bản dịch giữ nguyên nhịp điệu, ngữ khí nhân vật, và giọng văn gốc — nhờ ngữ cảnh được AI học từ toàn bộ chương truyện.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <button className="btn btn-primary" style={{ padding: "16px 28px", fontSize: 15 }}>Bắt đầu ngay <Icon name="arrow-right" size={16}/></button>
              <button className="btn" style={{ padding: "16px 28px", fontSize: 15 }}><Icon name="sparkle" size={16}/> Trải nghiệm Q&A</button>
            </div>
          </div>

          {/* Poster tags bottom */}
          <div style={{ position: "absolute", left: 56, right: 56, bottom: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>
            <div>
              <div style={{ color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>ISSUE №01</div>
              <div>THE BEGINNING OF CONTEXTUAL READING</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ marginBottom: 4 }}>￥ FREE · ZERO-BUDGET BUILD</div>
              <div>PRINTED WITH AI · MAY 2026</div>
            </div>
          </div>

          {/* Fuji floating */}
          <div style={{ position: "absolute", right: 60, top: 140, width: 320, color: "var(--ink)" }}>
            <FujiArt variant="compact"/>
          </div>

          {/* Barcode-ish strip */}
          <div style={{ position: "absolute", right: 56, bottom: 40 }}>
            <svg width="100" height="40">
              {Array.from({length: 20}).map((_, i) => (
                <rect key={i} x={i * 5} y="0" width={i % 3 === 0 ? 2 : 3} height="32" fill="var(--ink)"/>
              ))}
              <text x="50" y="40" textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink)">4 901234 567894</text>
            </svg>
          </div>
        </div>

        {/* Feature trio under poster */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 28 }}>
          {[
            { icon: "eye", kanji: "視", title: "OCR phát hiện bubble", desc: "YOLOv8 fine-tuned, mAP ≥ 90%" },
            { icon: "translate", kanji: "訳", title: "Dịch có ngữ cảnh", desc: "Vector context + Gemini LLM" },
            { icon: "chat", kanji: "問", title: "Q&A grounded RAG", desc: "Top-k=5 chunks, BM25 + semantic" },
          ].map(f => (
            <div key={f.title} className="stroke-ink panel-shadow-soft" style={{ background: "var(--panel)", padding: 20, display: "flex", gap: 16, alignItems: "flex-start", transition: "transform 0.2s" }}>
              <div style={{ width: 48, height: 48, background: "var(--accent)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontFamily: "var(--font-serif)", fontWeight: 800, border: "2px solid var(--border)" }}>{f.kanji}</div>
              <div>
                <div className="display" style={{ fontSize: 18 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 4 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editorial Section / Info */}
      <div style={{ padding: "20px 56px 40px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "center" }}>
        <div>
          <KanjiDivider kanji="流" label="Quy trình · Process"/>
          <h2 className="display" style={{ fontSize: 54, margin: "0 0 16px" }}>
            Trải nghiệm dịch thuật <span style={{ color: "var(--accent)" }}>tức thì.</span>
          </h2>
          <p className="serif" style={{ fontSize: 18, lineHeight: 1.6, color: "var(--fg-soft)", marginBottom: 32 }}>
            Sử dụng công nghệ AI tiên tiến, StoryLens giữ nguyên ý nghĩa sâu xa đằng sau mỗi câu thoại. Bạn không chỉ đọc manga, bạn đang giao tiếp với tác phẩm.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { n: "01", title: "Tải trang manga gốc", desc: "Hệ thống tự động phát hiện văn bản tiếng Nhật với độ chính xác cao." },
              { n: "02", title: "Phân tích ngữ cảnh", desc: "Dựa vào các chương trước và từ điển nhân vật để đưa ra lựa chọn từ ngữ phù hợp nhất." },
            ].map(s => (
              <div key={s.n} style={{ display: "flex", gap: 16 }}>
                <div className="mono" style={{ fontSize: 14, color: "var(--accent)", fontWeight: 700, paddingTop: 4 }}>{s.n}</div>
                <div>
                  <div className="display" style={{ fontSize: 20 }}>{s.title}</div>
                  <div style={{ fontSize: 14, color: "var(--fg-soft)", marginTop: 4 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Dynamic Image Placement */}
        <div style={{ position: "relative" }}>
          <div className="stroke-ink panel-shadow-lg" style={{ padding: 12, background: "var(--panel)" }}>
            <div style={{ border: "2px solid var(--border)", position: "relative", width: "100%", aspectRatio: "3/4", overflow: "hidden" }}>
              <Image 
                src="/manga_panel_samurai.png" 
                alt="Manga Panel" 
                fill 
                style={{ objectFit: "cover" }} 
              />
            </div>
            {/* Bubble over image */}
            <div style={{ position: "absolute", bottom: 40, left: -20, maxWidth: 220 }}>
              <div className="bubble" style={{ background: "#fff" }}>
                <div style={{ fontSize: 13, color: "var(--ink)" }}>「雨の中の孤独、お前には分かるか？」</div>
                <div style={{ fontSize: 12, color: "var(--beni-deep)", marginTop: 4, fontFamily: "var(--font-serif)" }}>— Sự cô độc trong màn mưa, ngươi có hiểu được không?</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
