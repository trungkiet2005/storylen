"use client";
import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { FujiArt } from '@/components/FujiArt';
import { Icon } from '@/components/Icons';
import { KanjiDivider } from '@/components/KanjiDivider';
import { Footer } from '@/components/Footer';
import { useToast } from '@/components/Toast';
import { FadeIn, StaggerContainer, StaggerItem, ScaleIn } from '@/components/Animations';
import { motion } from 'framer-motion';
import { Suspense } from 'react';

const FEATURES = [
  {
    icon: "eye",
    kanji: "視",
    title: "OCR phát hiện bubble",
    desc: "YOLOv8 fine-tuned, mAP ≥ 90%",
    href: "/upload",
  },
  {
    icon: "translate",
    kanji: "訳",
    title: "Dịch có ngữ cảnh",
    desc: "Vector context + Gemini LLM",
    href: "/reader",
  },
  {
    icon: "chat",
    kanji: "問",
    title: "Q&A grounded RAG",
    desc: "Top-k=5 chunks, BM25 + semantic",
    href: "/qa",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Tải trang manga gốc",
    desc: "Hệ thống tự động phát hiện văn bản tiếng Nhật với độ chính xác cao.",
    href: "/upload",
    icon: "upload",
  },
  {
    n: "02",
    title: "Phân tích ngữ cảnh",
    desc: "Dựa vào các chương trước và từ điển nhân vật để đưa ra lựa chọn từ ngữ phù hợp nhất.",
    href: "/reader",
    icon: "layers",
  },
  {
    n: "03",
    title: "Hỏi đáp thông minh",
    desc: "RAG Q&A dựa trên toàn bộ nội dung đã index — không bịa thông tin.",
    href: "/qa",
    icon: "sparkle",
  },
];

function SearchParamsHandler() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams?.get('demo') === '1') {
      toast('Đăng nhập demo thành công! Chào mừng đến StoryLens 🎌', 'success');
      // Clean up URL without reload
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, toast]);

  return null;
}

export default function Home() {

  return (
    <div className="paper-grain" style={{ minHeight: "100vh" }}>
      <Suspense fallback={null}>
        <SearchParamsHandler />
      </Suspense>
      <TopBar active="home" />

      {/* ── Hero Section ── */}
      <div style={{ padding: 40 }}>
        <FadeIn duration={0.7} direction="none">
          <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "var(--bg-2)", position: "relative", overflow: "hidden", padding: "80px 56px", minHeight: 620 }}>
            
            {/* Giant kanji bg */}
            <motion.div 
              initial={{ opacity: 0, scale: 1.1 }} 
              animate={{ opacity: 0.14, scale: 1 }} 
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ position: "absolute", right: -40, top: -60, fontFamily: "var(--font-serif)", fontSize: 520, fontWeight: 800, color: "var(--accent)", lineHeight: 0.8, pointerEvents: "none" }}
            >
              物
            </motion.div>
            
            {/* Halftone corner */}
            <div className="halftone-coarse" style={{ position: "absolute", left: 0, bottom: 0, width: 300, height: 300, color: "var(--ink)", opacity: 0.6 }}/>

            <div style={{ position: "relative", maxWidth: 700 }}>
              <FadeIn delay={0.2} direction="right">
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--ink)", color: "var(--paper)", fontSize: 11, letterSpacing: "0.2em", fontWeight: 700 }}>
                  ストーリーレンズ · STORYLENS VOL. 1
                </div>
              </FadeIn>
              
              <FadeIn delay={0.3} direction="up" distance={30}>
                <h1 className="display" style={{ fontSize: 110, margin: "18px 0 0", lineHeight: 0.92 }}>
                  MANGA,<br/>
                  ĐỌC NHƯ<br/>
                  <span style={{ color: "var(--accent)", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>người Nhật.</span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.4} direction="up">
                <p className="serif" style={{ fontSize: 20, marginTop: 24, maxWidth: 540, lineHeight: 1.5 }}>
                  Bản dịch giữ nguyên nhịp điệu, ngữ khí nhân vật, và giọng văn gốc — nhờ ngữ cảnh được AI học từ toàn bộ chương truyện.
                </p>
              </FadeIn>

              <FadeIn delay={0.5} direction="up">
                <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                  <Link href="/upload">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-primary" style={{ padding: "16px 28px", fontSize: 15 }}>
                      Bắt đầu ngay <Icon name="arrow-right" size={16}/>
                    </motion.button>
                  </Link>
                  <Link href="/qa">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn" style={{ padding: "16px 28px", fontSize: 15 }}>
                      <Icon name="sparkle" size={16}/> Trải nghiệm Q&A
                    </motion.button>
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Poster tags bottom */}
            <FadeIn delay={0.8} direction="none" className="w-full">
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
            </FadeIn>

            {/* Fuji floating */}
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, delay: 0.4 }}
              style={{ position: "absolute", right: 60, top: 140, width: 320, color: "var(--ink)" }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              >
                <FujiArt variant="compact"/>
              </motion.div>
            </motion.div>

            {/* Barcode strip */}
            <FadeIn delay={1} direction="none">
              <div style={{ position: "absolute", right: 56, bottom: 40 }}>
                <svg width="100" height="40">
                  {Array.from({length: 20}).map((_, i) => (
                    <rect key={i} x={i * 5} y="0" width={i % 3 === 0 ? 2 : 3} height="32" fill="var(--ink)"/>
                  ))}
                  <text x="50" y="40" textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink)">4 901234 567894</text>
                </svg>
              </div>
            </FadeIn>
          </div>
        </FadeIn>

        {/* Feature trio */}
        <StaggerContainer staggerDelay={0.15} delay={0.6} className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 28 }}>
          {FEATURES.map(f => (
            <StaggerItem key={f.title}>
              <Link href={f.href} style={{ textDecoration: "none" }}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: "8px 8px 0 0 var(--border)" }}
                  className="stroke-ink panel-shadow-soft"
                  style={{
                    background: "var(--panel)", padding: 20,
                    display: "flex", gap: 16, alignItems: "flex-start",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "pointer",
                  }}
                >
                  <motion.div 
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.4 }}
                    style={{ width: 48, height: 48, background: "var(--accent)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontFamily: "var(--font-serif)", fontWeight: 800, border: "2px solid var(--border)" }}>{f.kanji}</motion.div>
                  <div>
                    <div className="display" style={{ fontSize: 18 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 4 }}>{f.desc}</div>
                  </div>
                </motion.div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* ── Editorial Section ── */}
      <div style={{ padding: "20px 56px 40px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "center" }}>
        <div>
          <FadeIn>
            <KanjiDivider kanji="流" label="Quy trình · Process"/>
          </FadeIn>
          
          <FadeIn delay={0.1}>
            <h2 className="display" style={{ fontSize: 54, margin: "0 0 16px" }}>
              Trải nghiệm dịch thuật <span style={{ color: "var(--accent)" }}>tức thì.</span>
            </h2>
          </FadeIn>
          
          <FadeIn delay={0.2}>
            <p className="serif" style={{ fontSize: 18, lineHeight: 1.6, color: "var(--fg-soft)", marginBottom: 32 }}>
              Sử dụng công nghệ AI tiên tiến, StoryLens giữ nguyên ý nghĩa sâu xa đằng sau mỗi câu thoại. Bạn không chỉ đọc manga, bạn đang giao tiếp với tác phẩm.
            </p>
          </FadeIn>

          <StaggerContainer staggerDelay={0.1} className="flex flex-col gap-5" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {STEPS.map(s => (
              <StaggerItem key={s.n}>
                <Link href={s.href} style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    style={{ display: "flex", gap: 16, cursor: "pointer" }}
                  >
                    <div className="mono" style={{ fontSize: 14, color: "var(--accent)", fontWeight: 700, paddingTop: 4 }}>{s.n}</div>
                    <div>
                      <div className="display" style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
                        {s.title} <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}><Icon name="arrow-right" size={14}/></motion.span>
                      </div>
                      <div style={{ fontSize: 14, color: "var(--fg-soft)", marginTop: 4 }}>{s.desc}</div>
                    </div>
                  </motion.div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* Image panel */}
        <ScaleIn delay={0.2}>
          <div style={{ position: "relative" }}>
            <div className="stroke-ink panel-shadow-lg" style={{ padding: 12, background: "var(--panel)" }}>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{ border: "2px solid var(--border)", position: "relative", width: "100%", aspectRatio: "3/4", overflow: "hidden" }}
              >
                <Image
                  src="/manga_panel_samurai.png"
                  alt="Manga Panel"
                  fill
                  style={{ objectFit: "cover" }}
                  onError={() => {}} 
                />
              </motion.div>
              {/* Bubble over image */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, type: "spring" }}
                style={{ position: "absolute", bottom: 40, left: -20, maxWidth: 220 }}
              >
                <div className="bubble" style={{ background: "#fff" }}>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>「雨の中の孤独、お前には分かるか？」</div>
                  <div style={{ fontSize: 12, color: "var(--beni-deep)", marginTop: 4, fontFamily: "var(--font-serif)" }}>— Sự cô độc trong màn mưa, ngươi có hiểu được không?</div>
                </div>
              </motion.div>
            </div>
          </div>
        </ScaleIn>
      </div>

      {/* ── Stats Section ── */}
      <div style={{ padding: "0 56px 60px" }}>
        <FadeIn>
          <KanjiDivider kanji="数" label="Thống kê · Stats"/>
        </FadeIn>
        
        <StaggerContainer staggerDelay={0.1} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 24 }}>
          {[
            { label: "Bubbles detected", value: "10k+", kanji: "泡", icon: "eye" },
            { label: "Trang đã dịch", value: "2,400+", kanji: "頁", icon: "book" },
            { label: "Accuracy mAP", value: "≥90%", kanji: "精", icon: "check" },
            { label: "AI Model", value: "Gemini", kanji: "知", icon: "sparkle" },
          ].map(stat => (
            <StaggerItem key={stat.label}>
              <motion.div 
                whileHover={{ y: -4, scale: 1.01 }}
                className="stroke-ink panel-shadow" 
                style={{ background: "var(--panel)", padding: 20 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div className="display" style={{ fontSize: 36 }}>{stat.value}</div>
                  <motion.div 
                    initial={{ rotate: 0 }}
                    whileInView={{ rotate: 360 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, type: "spring" }}
                    className="serif" 
                    style={{ fontSize: 32, color: "var(--accent)", opacity: 0.6, fontWeight: 800 }}
                  >
                    {stat.kanji}
                  </motion.div>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name={stat.icon} size={12}/>
                  {stat.label}
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* ── CTA Footer ── */}
      <FadeIn className="w-full" distance={40} duration={0.6}>
        <div style={{ padding: "40px 56px 80px", textAlign: "center" }}>
          <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "var(--ink)", color: "var(--paper)", padding: "60px 40px", position: "relative", overflow: "hidden" }}>
            <div className="halftone" style={{ position: "absolute", inset: 0, opacity: 0.2 }}/>
            <div style={{ position: "relative" }}>
              <motion.div 
                initial={{ letterSpacing: "0.1em" }}
                whileInView={{ letterSpacing: "0.2em" }}
                viewport={{ once: true }}
                className="caps-xs" 
                style={{ color: "var(--accent)", marginBottom: 16 }}
              >
                はじめましょう · LET&apos;S START
              </motion.div>
              <h2 className="display" style={{ fontSize: 64, color: "var(--paper)", marginBottom: 20 }}>
                Sẵn sàng đọc<br/>
                <motion.span 
                  initial={{ color: "var(--paper)" }}
                  whileInView={{ color: "var(--d-beni)" }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  manga chưa?
                </motion.span>
              </h2>
              <p style={{ fontSize: 16, color: "rgba(242,234,216,0.7)", marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
                Tải lên trang đầu tiên và trải nghiệm dịch thuật AI ngay bây giờ — hoàn toàn miễn phí.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <Link href="/upload">
                  <motion.button 
                    whileHover={{ scale: 1.05, rotate: -1 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn btn-primary" 
                    style={{ padding: "16px 32px", fontSize: 15, background: "var(--d-beni)", borderColor: "var(--paper)" }}
                  >
                    <Icon name="upload" size={16}/> Tải lên ngay
                  </motion.button>
                </Link>
                <Link href="/history">
                  <motion.button 
                    whileHover={{ scale: 1.05, rotate: 1 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn" 
                    style={{ padding: "16px 32px", fontSize: 15, background: "transparent", color: "var(--paper)", borderColor: "var(--paper)" }}
                  >
                    <Icon name="history" size={16}/> Xem lịch sử
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
      
      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}
