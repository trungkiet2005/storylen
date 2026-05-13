"use client";
import React, { useEffect, useState } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense } from 'react';



const STEPS = [
  {
    n: "01",
    title: "Tải truyện tranh gốc",
    desc: "Hệ thống tự động phát hiện văn bản đa ngôn ngữ với độ chính xác cao.",
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
      toast('Đăng nhập demo thành công! Chào mừng đến StoryLens ✨', 'success');
      // Clean up URL without reload
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, toast]);

  return null;
}
function MangaPipelineShowcase() {
  const [step, setStep] = useState(0); // 0: Original, 1: Detection, 2: Translation

  // Auto rotate steps for the showcase effect
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    { id: 0, name: "1. Ảnh Gốc", label: "INPUT SOURCE", desc: "Manga tiếng Nhật" },
    { id: 1, name: "2. Nhận Diện", label: "DETECTION", desc: "YOLOv8 quét bubble" },
    { id: 2, name: "3. Đã Dịch", label: "TRANSLATION", desc: "Gemini AI chuyển ngữ" }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div className="stroke-ink-thick panel-shadow-lg" style={{ padding: 12, background: "var(--panel)", position: "relative" }}>
        {/* AI Pipeline status decoration */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border-soft)', marginBottom: 10, fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--fg-soft)', letterSpacing: '0.05em' }}>
          <div>[ ENGINE_PIPELINE_V2 ]</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ 
                width: 7, height: 7, borderRadius: '50%', 
                background: step === 1 ? 'var(--accent)' : 'var(--jade)' 
              }}
            />
            STATUS: {step === 0 ? 'WAITING' : step === 1 ? 'PROCESSING' : 'RENDERED'}
          </div>
        </div>

        {/* Main Canvas Container */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", border: "2.5px solid var(--border)", background: "#000", overflow: "hidden" }}>
          <Image
            src="/images/manga_hero_clean.png"
            alt="Manga AI Process"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            style={{ objectFit: "cover", opacity: 0.95 }}
          />

          {/* Scanning Grid Halftone Screen on Analyzing state */}
          <AnimatePresence>
            {step === 1 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                exit={{ opacity: 0 }}
                className="halftone-dense"
                style={{ position: 'absolute', inset: 0, background: 'rgba(200,16,46,0.05)', pointerEvents: 'none', zIndex: 4 }}
              />
            )}
          </AnimatePresence>

          {/* BUBBLE 1: Top Right Jagged Bubble */}
          <div style={{ position: 'absolute', top: '3%', left: '60%', width: '36%', height: '27%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Detection Bounding Box */}
            <AnimatePresence>
              {step === 1 && (
                <motion.div 
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  style={{ position: 'absolute', inset: '5%', border: '2.5px solid var(--accent)', background: 'rgba(200,16,46,0.15)', zIndex: 5, borderRadius: '2px' }}
                >
                  <div style={{ position: 'absolute', top: -17, right: -2, background: 'var(--accent)', color: '#fff', fontSize: 8, fontFamily: 'var(--font-mono)', padding: '2px 5px', fontWeight: 700, letterSpacing: '0.05em' }}>
                    bubble: 99.1%
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Text Content Layer */}
            <div style={{ position: 'relative', zIndex: 10, width: '75%', height: '75%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div 
                    key="orig-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="tategaki"
                    style={{ fontFamily: 'var(--font-serif)', fontWeight: 900, fontSize: '1.4rem', color: '#000', letterSpacing: '0.1em', transform: 'translateY(-8%) translateX(8%)' }}
                  >
                    我々の勝利だ！<br/>死守せよ！
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div 
                    key="trans-1"
                    initial={{ opacity: 0, y: 4, rotate: -1 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ fontFamily: 'var(--font-serif)', fontWeight: 900, fontSize: '0.95rem', color: 'var(--beni-deep)', textTransform: 'uppercase', lineHeight: 1.2, transform: 'rotate(-2deg)' }}
                  >
                    CHIẾN THẮNG THUỘC VỀ CHÚNG TA!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* BUBBLE 2: Middle Left Oval Bubble */}
          <div style={{ position: 'absolute', top: '32.5%', left: '9.5%', width: '22.5%', height: '15.5%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Detection Bounding Box */}
            <AnimatePresence>
              {step === 1 && (
                <motion.div 
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  style={{ position: 'absolute', inset: '2%', border: '2.5px solid var(--accent)', background: 'rgba(200,16,46,0.15)', zIndex: 5, borderRadius: '2px' }}
                >
                  <div style={{ position: 'absolute', top: -17, left: -2, background: 'var(--accent)', color: '#fff', fontSize: 8, fontFamily: 'var(--font-mono)', padding: '2px 5px', fontWeight: 700, letterSpacing: '0.05em' }}>
                    bubble: 98.4%
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Text Content Layer */}
            <div style={{ position: 'relative', zIndex: 10, width: '85%', height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div 
                    key="orig-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: '1.1rem', color: '#000', lineHeight: 1.2 }}
                  >
                    よし！<br/>行くぞ！
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div 
                    key="trans-2"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '0.9rem', color: '#000', lineHeight: 1.2 }}
                  >
                    Được rồi,<br/>tiến lên!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Cyber Scanning Bar Line */}
          <AnimatePresence>
            {step === 1 && (
              <motion.div 
                initial={{ top: '-2%' }}
                animate={{ top: '102%' }}
                exit={{ opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                style={{ position: 'absolute', left: 0, right: 0, height: '3px', background: 'var(--accent)', boxShadow: '0 0 15px 2px var(--accent)', zIndex: 9, pointerEvents: 'none' }}
              />
            )}
          </AnimatePresence>

          {/* Overlay label strip */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(17,17,17,0.8)', backdropFilter: 'blur(4px)', color: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '4px 10px', borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 12, display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase' }}>
            <div>STAGE::{steps[step].label}</div>
            <div>{steps[step].desc}</div>
          </div>
        </div>
      </div>

      {/* Navigation tabs controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {steps.map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className="stroke-ink"
            style={{
              background: step === s.id ? 'var(--ink)' : 'transparent',
              color: step === s.id ? 'var(--paper)' : 'var(--fg)',
              border: '2px solid var(--border)',
              padding: '10px 4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              transition: 'all 0.15s ease',
              boxShadow: step === s.id ? 'none' : '3px 3px 0 0 var(--border)',
              transform: step === s.id ? 'translate(1px, 1px)' : 'none'
            }}
          >
            <span className="display" style={{ fontSize: 13, letterSpacing: 0 }}>{s.name}</span>
            <span className="mono" style={{ fontSize: 9, opacity: 0.75 }}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FloatingMangaStack() {
  return (
    <motion.div 
      className="hero-mockup-wrapper"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
    >
      <motion.div
        animate={{ 
          y: [0, -12, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Decorative Circle Seal Behind */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          style={{
            position: "absolute",
            width: 200, height: 200,
            border: "1.5px dashed var(--border-soft)",
            borderRadius: "50%",
            opacity: 0.4,
            top: 30, right: 30,
            zIndex: 1
          }}
        />

        {/* Back Page (Raw Manga) */}
        <motion.div
          initial={{ opacity: 0, rotate: -12 }}
          animate={{ opacity: 0.75, rotate: -8 }}
          whileHover={{ rotate: -12, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute',
            width: 300, height: 410,
            top: 100,
            left: 20,
            background: 'var(--bg-2)',
            border: '2.5px solid var(--border)',
            boxShadow: '6px 6px 0 0 rgba(0,0,0,0.12)',
            transformOrigin: 'center bottom',
            overflow: 'hidden',
            padding: 6,
            zIndex: 2,
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%', border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
            <Image 
              src="/images/manga_hero_clean.png" 
              alt="Background Manga" 
              fill 
              style={{ objectFit: 'cover', filter: 'grayscale(100%) contrast(1.1)', opacity: 0.85 }} 
            />
            <div style={{ position: 'absolute', top: 24, left: -40, background: 'var(--border)', color: 'var(--paper)', padding: '4px 48px', fontSize: 9, fontFamily: 'var(--font-mono)', transform: 'rotate(-45deg)', letterSpacing: '0.2em', fontWeight: 700 }}>
              RAW_SCAN
            </div>
          </div>
        </motion.div>

        {/* Front Page (Translated Cover) */}
        <motion.div
          initial={{ opacity: 0, rotate: 12 }}
          animate={{ opacity: 1, rotate: 5 }}
          whileHover={{ rotate: 2, scale: 1.03, y: -5 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="panel-shadow-lg"
          style={{
            position: 'absolute',
            width: 330, height: 450,
            top: 50,
            right: 20,
            background: 'var(--panel)',
            border: '3px solid var(--border)',
            transformOrigin: 'center center',
            overflow: 'hidden',
            padding: 10,
            zIndex: 3,
          }}
        >
          {/* Cover Artwork Container */}
          <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
            <Image 
              src="/images/manga_hero_ja.png" 
              alt="Translated Manga Cover" 
              fill 
              style={{ objectFit: 'cover', objectPosition: 'center 20%', filter: 'grayscale(100%) contrast(1.2)', opacity: 0.95 }} 
            />
            <div className="halftone" style={{ position: 'absolute', inset: 0, opacity: 0.15, zIndex: 1 }} />
            
            {/* Magazine Title Deco */}
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', zIndex: 5 }}>
              <span className="display" style={{ fontSize: 38, color: 'var(--paper)', textShadow: '2px 2px 0 var(--border)', lineHeight: 0.95 }}>
                STORY
              </span>
              <span className="display" style={{ fontSize: 38, color: 'var(--accent)', textShadow: '2px 2px 0 var(--paper)', lineHeight: 0.9 }}>
                LENS
              </span>
            </div>

            {/* Volume Stamp */}
            <div className="seal seal-circle" style={{ position: 'absolute', top: 14, right: 14, width: 52, height: 52, fontSize: 13, zIndex: 5, transform: 'rotate(8deg)' }}>
              VOL.1
            </div>

            {/* Translated Overlay Text */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, var(--border) 0%, rgba(0,0,0,0) 100%)', padding: '50px 12px 12px', zIndex: 5, color: 'var(--paper)', textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 9, opacity: 0.8, letterSpacing: '0.15em', marginBottom: 6 }}>
                AI TRANSLATED VERSION
              </div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                KỶ NGUYÊN MỚI
              </div>
            </div>

            {/* AI Badge */}
            <div style={{ position: 'absolute', bottom: '35%', right: 8, writingMode: 'vertical-rl', background: 'var(--panel)', color: 'var(--fg)', border: '1.5px solid var(--border)', padding: '8px 5px', fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', zIndex: 5 }}>
              POWERED BY GEMINI
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
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
            
            {/* Giant letter bg */}
            <motion.div 
              initial={{ opacity: 0, scale: 1.1 }} 
              animate={{ opacity: 0.14, scale: 1 }} 
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ position: "absolute", right: -40, top: -60, fontFamily: "var(--font-serif)", fontSize: 520, fontWeight: 800, color: "var(--accent)", lineHeight: 0.8, pointerEvents: "none" }}
            >
              S
            </motion.div>
            
            {/* Halftone corner */}
            <div className="halftone-coarse" style={{ position: "absolute", left: 0, bottom: 0, width: 300, height: 300, color: "var(--ink)", opacity: 0.6 }}/>

            {/* Floating Manga Stack Design Mockup */}
            <FloatingMangaStack />

            <div style={{ position: "relative", maxWidth: 700 }}>
              <FadeIn delay={0.2} direction="right">
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--ink)", color: "var(--paper)", fontSize: 11, letterSpacing: "0.2em", fontWeight: 700 }}>
                  XÓA NHÒA RÀO CẢN NGÔN NGỮ · STORYLENS VOL. 1
                </div>
              </FadeIn>
              
              <FadeIn delay={0.3} direction="up" distance={30}>
                <h1 className="display" style={{ fontSize: 84, margin: "18px 0 0", lineHeight: 0.92 }}>
                  <span style={{ whiteSpace: 'nowrap' }}>ĐỌC TRUYỆN,</span><br/>
                  <span style={{ whiteSpace: 'nowrap' }}>KHÔNG CÒN</span><br/>
                  <span style={{ color: "var(--accent)", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>rào cản.</span>
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

      </div>

      {/* ── Manga Showcase Banner ── */}
      <FadeIn duration={0.8} direction="none">
        <div style={{ margin: '16px 40px 48px', position: 'relative', height: '220px', overflow: 'hidden' }} className="stroke-ink panel-shadow">
          <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
            <Image 
              src="/images/manga_hero_ja.png" 
              alt="Manga background illustration" 
              fill
              style={{ objectFit: 'cover', objectPosition: 'center 25%', opacity: 0.35, filter: 'grayscale(100%) contrast(130%)' }} 
            />
          </div>
          <div className="halftone" style={{ position: 'absolute', inset: 0, opacity: 0.15 }} />
          
          <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', color: 'var(--paper)' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '3px 8px', border: '1px solid var(--paper)', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', color: 'var(--accent)', marginBottom: 12, fontWeight: 700 }}>
                SYSTEM_CORE::CONTEXTUAL_READING
              </div>
              <h3 className="display" style={{ fontSize: 42, color: 'var(--paper)', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Dịch có tư duy. Đọc không gián đoạn.
              </h3>
              <p className="serif" style={{ fontSize: 15, color: 'rgba(245,239,227,0.8)', margin: '8px 0 0' }}>
                Bảo tồn nguyên vẹn tinh thần bản gốc với mạng nơ-ron ngữ cảnh thông minh.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
              <div className="kanji-deco" style={{ fontSize: 24, opacity: 0.75, height: 120, writingMode: 'vertical-rl', textOrientation: 'upright', color: 'var(--paper)' }}>
                物語レンズ
              </div>
              <motion.div 
                animate={{ rotate: [-5, -8, -5] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="seal seal-circle" 
                style={{ background: 'var(--accent)', width: 68, height: 68, fontSize: 15, display: 'flex', flexDirection: 'column' }}
              >
                <span style={{ fontSize: 10, opacity: 0.9, letterSpacing: 0 }}>AI TR.</span>
                <span style={{ fontWeight: 900 }}>翻訳</span>
              </motion.div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ── Editorial Section ── */}
      <div style={{ padding: "20px 56px 40px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "center" }}>
        <div>
          <FadeIn>
            <KanjiDivider kanji="★" label="Quy trình · Process"/>
          </FadeIn>
          
          <FadeIn delay={0.1}>
            <h2 className="display" style={{ fontSize: 54, margin: "0 0 16px" }}>
              Trải nghiệm dịch thuật <span style={{ color: "var(--accent)" }}>tức thì.</span>
            </h2>
          </FadeIn>
          
          <FadeIn delay={0.2}>
            <p className="serif" style={{ fontSize: 18, lineHeight: 1.6, color: "var(--fg-soft)", marginBottom: 32 }}>
              Sử dụng công nghệ AI tiên tiến, StoryLens giúp xóa nhòa mọi rào cản ngôn ngữ. Bạn không chỉ đọc, bạn đang đắm chìm hoàn toàn vào tác phẩm.
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

        {/* Interactive Showcase Panel */}
        <ScaleIn delay={0.2} style={{ width: '100%' }}>
          <MangaPipelineShowcase />
        </ScaleIn>
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
                LET&apos;S START
              </motion.div>
              <h2 className="display" style={{ fontSize: 64, color: "var(--paper)", marginBottom: 20 }}>
                Sẵn sàng trải nghiệm<br/>
                <motion.span 
                  initial={{ color: "var(--paper)" }}
                  whileInView={{ color: "var(--d-beni)" }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  ngay chưa?
                </motion.span>
              </h2>
              <p style={{ fontSize: 16, color: "rgba(242,234,216,0.7)", marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
                Tải lên tập truyện đầu tiên và trải nghiệm dịch thuật AI ngay bây giờ — hoàn toàn miễn phí.
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
