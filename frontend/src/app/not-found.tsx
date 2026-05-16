"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Icon } from '@/components/Icons';

export default function NotFound() {
  // Fallback page head since it's a client component
  React.useEffect(() => {
    document.title = "404 — Trang không tồn tại | StoryLens";
  }, []);

  return (
    <div
      className="paper-grain"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 40,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background elements */}
      <motion.div 
        initial={{ opacity: 0, rotate: -10 }}
        animate={{ opacity: 0.05, rotate: 10 }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
        style={{ position: "absolute", top: -100, left: -100, fontSize: 300, fontFamily: "var(--font-serif)", fontWeight: 900, color: "var(--accent)", pointerEvents: "none", userSelect: "none" }}
      >
        零
      </motion.div>

      {/* Giant 404 with manga-style overlay */}
      <div style={{ position: "relative", marginBottom: 32 }}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="display"
          style={{
            fontSize: 180,
            lineHeight: 0.9,
            color: "var(--border-soft)",
            userSelect: "none",
            letterSpacing: "-0.06em",
          }}
        >
          404
        </motion.div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <motion.div
            animate={{ 
              y: [0, -12, 0],
              rotate: [0, -5, 5, 0]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="serif"
            style={{
              fontSize: 72,
              color: "var(--accent)",
              fontWeight: 800,
              textShadow: "4px 4px 0 var(--border)",
              transformOrigin: "center"
            }}
          >
            ?
          </motion.div>
        </div>
      </div>

      {/* Title */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="caps-sm" style={{ color: "var(--accent)", marginBottom: 10 }}
      >
        LỖI KHÔNG TÌM THẤY
      </motion.div>

      <motion.h1 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="display" style={{ fontSize: 40, margin: "0 0 16px" }}
      >
        Trang không tồn tại
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ color: "var(--fg-soft)", maxWidth: 440, lineHeight: 1.6, marginBottom: 36 }}
      >
        Trang bạn đang tìm kiếm đã bị di chuyển, xóa, hoặc chưa bao giờ tồn tại — giống như những trang truyện chưa được dịch.
      </motion.p>

      {/* Bubble with error message */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", delay: 0.5, stiffness: 120, damping: 12 }}
        className="bubble" style={{ maxWidth: 320, marginBottom: 36, background: "#fff" }}
      >
        <span className="serif" style={{ fontSize: 14 }}>
          &ldquo;Lost in translation...&rdquo;
        </span>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, fontFamily: "var(--font-serif)" }}>
          — Lạc lối giữa những dòng dịch…
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{ display: "flex", gap: 12 }}
      >
        <Link href="/">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary" style={{ padding: "14px 28px" }}
          >
            Về trang chủ
          </motion.button>
        </Link>
        <Link href="/upload">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn" style={{ padding: "14px 28px" }}
          >
            <Icon name="upload" size={14}/> Tải truyện lên
          </motion.button>
        </Link>
      </motion.div>

      {/* Decorative barcode */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.8 }}
        style={{ marginTop: 48 }}
      >
        <svg width="120" height="40">
          {Array.from({ length: 24 }).map((_, i) => (
            <rect key={i} x={i * 5} y="0" width={i % 3 === 0 ? 2 : 3} height="32" fill="var(--ink)"/>
          ))}
          <text x="60" y="40" textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--muted)">
            SL-ERR-404
          </text>
        </svg>
      </motion.div>
    </div>
  );
}
