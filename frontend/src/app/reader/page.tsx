"use client";
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Icon } from '@/components/Icons';
import { MangaPage } from '@/components/MangaPage';
import { useToast } from '@/components/Toast';
import {
  getPage,
  getBatchStatus,
  getTranslationHistory,
  updateBubbleTranslation,
  getHistory,
  listSeries,
  PageData,
  PageStatus,
  BubbleData,
  APIError,
  TranslationHistoryItem,
  HistoryItem,
  SeriesListItem,
} from '@/lib/api';
import { AddToSeriesModal } from '@/components/AddToSeriesModal';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPage } from '@/components/Animations';

type ViewMode = "overlay" | "sidebyside" | "tap";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: { ch: number; p: number; score: number }[];
  isError?: boolean;
}

// ── Empty state when no page is selected ────────────────────────────────────
function EmptyReaderState() {
  const [recentItems, setRecentItems] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [seriesItems, setSeriesItems] = useState<SeriesListItem[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);

  useEffect(() => {
    getHistory({ type: "page", limit: 4 })
      .then(res => setRecentItems(res.items.filter(i => i.status === "completed" || i.status === "translated")))
      .catch(() => setRecentItems([]))
      .finally(() => setLoadingHistory(false));
    listSeries({ limit: 6 })
      .then(res => setSeriesItems(res.items))
      .catch(() => setSeriesItems([]))
      .finally(() => setLoadingSeries(false));
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  } as const;
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 24 } },
  } as const;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "flex-start", padding: "40px 20px 60px",
        maxWidth: 640, margin: "0 auto", width: "100%",
      }}
    >
      {/* Hero */}
      <motion.div variants={itemVariants} style={{ textAlign: "center", marginBottom: 36 }}>
        {/* Decorative comic panels */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
          {[
            { w: 52, h: 72, rotate: -4, delay: 0 },
            { w: 64, h: 88, rotate: 0, delay: 0.05 },
            { w: 52, h: 72, rotate: 4, delay: 0.1 },
          ].map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, rotate: p.rotate }}
              animate={{ opacity: 1, y: 0, rotate: p.rotate }}
              transition={{ delay: p.delay, type: "spring", stiffness: 200, damping: 18 }}
              style={{
                width: p.w, height: p.h,
                background: i === 1 ? "var(--accent)" : "var(--panel)",
                border: "2.5px solid var(--border)",
                boxShadow: "3px 3px 0 var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 6, overflow: "hidden",
              }}
            >
              {i === 1 ? (
                <>
                  <div style={{ width: "60%", height: 3, background: "rgba(255,255,255,0.6)", borderRadius: 2 }}/>
                  <div style={{ width: "80%", height: 3, background: "rgba(255,255,255,0.4)", borderRadius: 2 }}/>
                  <div style={{ width: "50%", height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2 }}/>
                </>
              ) : (
                <>
                  <div style={{ width: "70%", height: 2, background: "var(--border-soft)", borderRadius: 2 }}/>
                  <div style={{ width: "50%", height: 2, background: "var(--border-soft)", borderRadius: 2 }}/>
                </>
              )}
            </motion.div>
          ))}
        </div>

        <h2 style={{
          fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800,
          color: "var(--fg)", marginBottom: 8, letterSpacing: "-0.02em",
        }}>
          Chọn trang truyện để đọc
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
          Tải lên ảnh mới, duyệt bộ truyện hoặc xem lịch sử đã dịch của bạn.
        </p>
      </motion.div>

      {/* CTA Cards */}
      <motion.div
        variants={itemVariants}
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%", marginBottom: 32 }}
      >
        <Link href="/upload" style={{ textDecoration: "none" }}>
          <motion.div
            whileHover={{ y: -3, boxShadow: "6px 6px 0 var(--accent)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: "var(--accent)", color: "#fff",
              border: "2.5px solid var(--border)",
              boxShadow: "4px 4px 0 var(--border)",
              padding: "18px 14px", cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.15s",
            }}
          >
            <div style={{
              width: 36, height: 36, background: "rgba(255,255,255,0.2)",
              border: "2px solid rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 10,
            }}>
              <Icon name="upload" size={18}/>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, fontFamily: "var(--font-serif)" }}>
              Tải lên ảnh mới
            </div>
            <div style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.5 }}>
              Upload manga, manhwa hoặc manhua để dịch tự động bằng AI
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 10, fontWeight: 700, opacity: 0.9 }}>
              Bắt đầu ngay <Icon name="arrow-right" size={11}/>
            </div>
          </motion.div>
        </Link>

        <Link href="/series" style={{ textDecoration: "none" }}>
          <motion.div
            whileHover={{ y: -3, boxShadow: "6px 6px 0 var(--border)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: "var(--panel)", color: "var(--fg)",
              border: "2.5px solid var(--border)",
              boxShadow: "4px 4px 0 var(--border)",
              padding: "18px 14px", cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.15s",
            }}
          >
            <div style={{
              width: 36, height: 36, background: "var(--bg)",
              border: "2px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 10,
            }}>
              <Icon name="book" size={18}/>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, fontFamily: "var(--font-serif)", color: "var(--fg)" }}>
              Bộ truyện
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.5 }}>
              Quản lý và đọc toàn bộ series đã được tổ chức theo chương
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 10, fontWeight: 700, color: "var(--accent)" }}>
              Xem tất cả <Icon name="arrow-right" size={11}/>
            </div>
          </motion.div>
        </Link>

        <Link href="/history" style={{ textDecoration: "none" }}>
          <motion.div
            whileHover={{ y: -3, boxShadow: "6px 6px 0 var(--border)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: "var(--panel)", color: "var(--fg)",
              border: "2.5px solid var(--border)",
              boxShadow: "4px 4px 0 var(--border)",
              padding: "18px 14px", cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.15s",
            }}
          >
            <div style={{
              width: 36, height: 36, background: "var(--bg)",
              border: "2px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 10,
            }}>
              <Icon name="history" size={18}/>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, fontFamily: "var(--font-serif)", color: "var(--fg)" }}>
              Lịch sử đọc
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.5 }}>
              Xem lại các trang đã dịch trước đó, tiếp tục từ nơi đã dừng
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 10, fontWeight: 700, color: "var(--accent)" }}>
              Xem tất cả <Icon name="arrow-right" size={11}/>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* Series picker */}
      <motion.div variants={itemVariants} style={{ width: "100%", marginBottom: 32 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 12,
        }}>
          <span className="caps-xs" style={{ color: "var(--muted)" }}>Bộ truyện</span>
          <Link href="/series" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
            Xem tất cả →
          </Link>
        </div>

        {loadingSeries ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 130, background: "var(--panel)", border: "2px solid var(--border-soft)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}/>
            ))}
          </div>
        ) : seriesItems.length === 0 ? (
          <div style={{
            background: "var(--panel)", border: "2px dashed var(--border-soft)",
            padding: "20px 16px", textAlign: "center",
          }}>
            <Icon name="book" size={26} stroke={1.5}/>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
              Chưa có bộ truyện nào.{" "}
              <Link href="/series" style={{ color: "var(--accent)", fontWeight: 600 }}>Tạo ngay</Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {seriesItems.map((s, idx) => (
              <motion.div
                key={s.series_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + idx * 0.05, type: "spring", stiffness: 300, damping: 24 }}
              >
                <Link
                  href={s.chapter_count > 0 ? `/series/${s.series_id}/read` : `/series/${s.series_id}`}
                  style={{ textDecoration: "none" }}
                >
                  <motion.div
                    whileHover={{ y: -3, boxShadow: "4px 4px 0 var(--accent)" }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      background: "#fff", border: "2px solid var(--border)",
                      boxShadow: "3px 3px 0 var(--border)",
                      overflow: "hidden", cursor: "pointer",
                      transition: "box-shadow 0.15s",
                    }}
                  >
                    <div style={{ height: 90, background: "var(--panel)", position: "relative", overflow: "hidden" }}>
                      {s.cover_image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={s.cover_image_url}
                          alt={s.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{
                          width: "100%", height: "100%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--border-soft)",
                        }}>
                          <Icon name="book" size={24} stroke={1.5}/>
                        </div>
                      )}
                      {s.chapter_count > 0 && (
                        <div style={{
                          position: "absolute", bottom: 4, right: 4,
                          background: "var(--accent)", color: "#fff",
                          fontSize: 9, fontWeight: 800, padding: "2px 5px",
                          fontFamily: "var(--font-mono)",
                        }}>
                          {s.chapter_count} CH
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "7px 8px" }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: "var(--fg)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontFamily: "var(--font-serif)",
                      }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                        {s.page_count} trang
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent history */}
      <motion.div variants={itemVariants} style={{ width: "100%" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 12,
        }}>
          <span className="caps-xs" style={{ color: "var(--muted)" }}>Gần đây</span>
          <Link href="/history" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
            Xem tất cả →
          </Link>
        </div>

        {loadingHistory ? (
          <div style={{ display: "flex", gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                flex: 1, height: 100,
                background: "var(--panel)", border: "2px solid var(--border-soft)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}/>
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <div style={{
            background: "var(--panel)", border: "2px dashed var(--border-soft)",
            padding: "24px 16px", textAlign: "center",
          }}>
            <Icon name="image" size={28} stroke={1.5}/>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
              Chưa có trang nào được dịch.{" "}
              <Link href="/upload" style={{ color: "var(--accent)", fontWeight: 600 }}>Tải lên ngay</Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${recentItems.length}, 1fr)`, gap: 10 }}>
            {recentItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.06, type: "spring", stiffness: 300, damping: 24 }}
              >
                <Link href={`/reader?page=${item.id}`} style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ y: -3, boxShadow: "4px 4px 0 var(--accent)" }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      background: "#fff", border: "2px solid var(--border)",
                      boxShadow: "3px 3px 0 var(--border)",
                      overflow: "hidden", cursor: "pointer",
                      transition: "box-shadow 0.15s",
                    }}
                  >
                    <div style={{ height: 90, background: "var(--panel)", position: "relative", overflow: "hidden" }}>
                      {item.thumbnail_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{
                          width: "100%", height: "100%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--border-soft)",
                        }}>
                          <Icon name="image" size={24} stroke={1.5}/>
                        </div>
                      )}
                      <div style={{
                        position: "absolute", bottom: 4, right: 4,
                        background: "var(--accent)", color: "#fff",
                        fontSize: 9, fontWeight: 800, padding: "2px 5px",
                        fontFamily: "var(--font-mono)",
                      }}>
                        DONE
                      </div>
                    </div>
                    <div style={{ padding: "7px 8px" }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: "var(--fg)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontFamily: "var(--font-serif)",
                      }}>
                        {item.title || `Trang ${item.id.slice(0, 6)}`}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                        {new Date(item.last_accessed).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Keyboard hint */}
      <motion.div
        variants={itemVariants}
        style={{ marginTop: 32, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", textAlign: "center", lineHeight: 1.7 }}
      >
        <div>Sau khi chọn trang: <kbd style={{ background: "var(--panel)", border: "1px solid var(--border)", padding: "1px 5px", borderRadius: 2 }}>O</kbd> toggle overlay · <kbd style={{ background: "var(--panel)", border: "1px solid var(--border)", padding: "1px 5px", borderRadius: 2 }}>+/-</kbd> zoom</div>
      </motion.div>
    </motion.div>
  );
}

// ── Overlay bubble renderer using real bbox data ────────────────────────────
function BubbleOverlays({
  bubbles,
  containerW,
  containerH,
  imageW,
  imageH,
  selected,
  onSelect,
  mode,
}: {
  bubbles: BubbleData[];
  containerW: number;
  containerH: number;
  imageW: number;
  imageH: number;
  selected: number | null;
  onSelect: (i: number | null) => void;
  mode: ViewMode;
}) {
  const scaleX = containerW / imageW;
  const scaleY = containerH / imageH;

  return (
    <svg
      viewBox={`0 0 ${containerW} ${containerH}`}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
    >
      <AnimatePresence mode="popLayout">
        {bubbles.map((b, i) => {
          const [x, y, w, h] = b.bbox;
          const rx = x * scaleX;
          const ry = y * scaleY;
          const rwScaled = w * scaleX;
          const rhScaled = h * scaleY;

          const isGiant = (w * h) >= (imageW * imageH * 0.8);

          if (mode === "overlay") {
            return (
              <motion.g
                key={`${i}-overlay`}
                style={{ pointerEvents: "auto", transformOrigin: `${rx + rwScaled/2}px ${ry + rhScaled/2}px` }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: i * 0.05
                }}
              >
                {!isGiant ? (
                  <rect x={rx} y={ry} width={rwScaled} height={rhScaled} fill="white" stroke="#111" strokeWidth="1.5" rx="4" />
                ) : (
                  <rect x={rx} y={ry} width={rwScaled} height={rhScaled} fill="rgba(255,255,255,0.2)" stroke="rgba(255,0,0,0.5)" strokeWidth="2" strokeDasharray="5 5" rx="4" />
                )}

                <foreignObject
                  x={isGiant ? rx + 20 : rx + 2}
                  y={isGiant ? ry + 20 : ry + 2}
                  width={isGiant ? rwScaled - 40 : rwScaled - 4}
                  height={isGiant ? rhScaled - 40 : rhScaled - 4}
                >
                  <div
                    style={{
                      width: "100%", height: "100%",
                      fontSize: isGiant ? 18 : Math.min(32, Math.max(10, rhScaled * 0.35)),
                      fontFamily: "var(--font-serif)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: isGiant ? "flex-start" : "center",
                      justifyContent: isGiant ? "center" : "center",
                      textAlign: "center",
                      color: isGiant ? "#d00" : "#111",
                      overflow: "hidden",
                      lineHeight: 1.3,
                      padding: isGiant ? "10px" : "2px",
                      textShadow: isGiant ? "0 0 4px #fff, 0 0 4px #fff" : "none",
                    }}
                  >
                    {b.translated_text}
                  </div>
                </foreignObject>
              </motion.g>
            );
          }

          if (mode === "tap") {
            return (
              <motion.rect
                key={`${i}-tap`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                x={rx} y={ry} width={rwScaled} height={rhScaled}
                fill={selected === i ? "rgba(200,16,46,0.12)" : "transparent"}
                stroke={selected === i ? "var(--beni)" : "rgba(200,16,46,0.4)"}
                strokeWidth="2"
                strokeDasharray="4 3"
                style={{ cursor: "pointer", pointerEvents: "auto" }}
                onClick={() => onSelect(selected === i ? null : i)}
                whileHover={{ fill: "rgba(200,16,46,0.05)" }}
              />
            );
          }

          return null;
        })}

        {mode === "tap" && selected !== null && bubbles[selected] && (() => {
          const b = bubbles[selected];
          const [x, y, , h] = b.bbox;
          const rx = x * scaleX;
          const ry = (y + h) * scaleY + 4;
          return (
            <motion.foreignObject
              key="tooltip"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              x={rx} y={ry} width={240} height={80}
            >
              <div style={{
                background: "#fffde8",
                border: "2px solid #111",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                boxShadow: "3px 3px 0 #111",
              }}>
                <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>GỐC → VIỆT</div>
                <div style={{ fontFamily: "var(--font-serif)", lineHeight: 1.4 }}>{b.translated_text}</div>
              </div>
            </motion.foreignObject>
          );
        })()}
      </AnimatePresence>
    </svg>
  );
}

// ── Actual reader content, needs search params ─────────────────────────────
function ReaderContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pageIdParam = searchParams.get("page");

  const [mode, setMode] = useState<ViewMode>("overlay");
  const [selected, setSelected] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [showContext, setShowContext] = useState(true);
  const [contextTab, setContextTab] = useState<"info" | "chat">("chat");
  const mainRef = useRef<HTMLDivElement>(null);

  // Real page data from API
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [editTexts, setEditTexts] = useState<Record<string, string>>({});
  const [savingBubbleId, setSavingBubbleId] = useState<string | null>(null);
  const [openHistoryBubbleId, setOpenHistoryBubbleId] = useState<string | null>(null);
  const [historyByBubble, setHistoryByBubble] = useState<Record<string, TranslationHistoryItem[]>>({});
  const [historyLoadingBubbleId, setHistoryLoadingBubbleId] = useState<string | null>(null);

  // Add-to-series modal
  const [showAddToSeries, setShowAddToSeries] = useState(false);

  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Batch processing support
  const [batchPages, setBatchPages] = useState<PageStatus[]>([]);
  const batchId = pageData?.metadata?.batch_id;

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!batchId) {
      setBatchPages([]);
      return;
    }
    getBatchStatus(batchId)
      .then(status => {
        setBatchPages(status.pages || []);
      })
      .catch(() => {
        setBatchPages([]);
      });
  }, [batchId]);

  const hasMultiplePages = batchPages.length > 1;
  const currentPageIdx = batchPages.findIndex(p => p.page_id === pageIdParam);
  const prevPageId = currentPageIdx > 0 ? batchPages[currentPageIdx - 1].page_id : null;
  const nextPageId = currentPageIdx >= 0 && currentPageIdx < batchPages.length - 1 ? batchPages[currentPageIdx + 1].page_id : null;

  // Load page data if page_id provided
  useEffect(() => {
    if (!pageIdParam) return;
    setIsLoadingPage(true);
    setImgNaturalSize(null);
    getPage(pageIdParam)
      .then(data => {
        setPageData(data);
        setEditTexts(
          Object.fromEntries(
            data.processed_data.map((bubble) => [bubble.bubble_id, bubble.translated_text]),
          ),
        );
        setHistoryByBubble({});
        setOpenHistoryBubbleId(null);
        toast("Đã tải dữ liệu trang", "success");
      })
      .catch(err => {
        const msg = err instanceof APIError ? err.message : "Không thể tải dữ liệu trang.";
        toast(msg, "error");
      })
      .finally(() => setIsLoadingPage(false));
  }, [pageIdParam, toast]);

  // Reset chat when navigating to a new page
  useEffect(() => {
    setChatMessages([]);
    setChatInput("");
  }, [pageIdParam]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, isChatLoading]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "o": setShowOverlay(v => !v); break;
        case "+": case "=": setZoom(z => Math.min(z + 0.1, 2.0)); break;
        case "-": setZoom(z => Math.max(z - 0.1, 0.5)); break;
        case "ArrowRight":
        case "l":
          if (nextPageId) router.push(`/reader?page=${nextPageId}`);
          break;
        case "ArrowLeft":
        case "h":
          if (prevPageId) router.push(`/reader?page=${prevPageId}`);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nextPageId, prevPageId, router]);

  useEffect(() => setSelected(null), [pageIdParam]);

  const CANVAS_W = 520;
  const computedHeight = imgNaturalSize ? CANVAS_W * (imgNaturalSize.h / imgNaturalSize.w) : 740;

  const SIDE_W = 360;
  const computedSideH = imgNaturalSize ? SIDE_W * (imgNaturalSize.h / imgNaturalSize.w) : 520;
  const translatedImageUrl = pageData?.translated_image_url || null;
  const mainImageUrl = pageData?.original_image_url
    ? mode === "overlay" && showOverlay && translatedImageUrl
      ? translatedImageUrl
      : pageData.original_image_url
    : null;

  const saveTranslation = async (bubble: BubbleData) => {
    if (!pageIdParam) return;
    const nextText = (editTexts[bubble.bubble_id] ?? "").trim();
    if (!nextText) {
      toast("Bản dịch không được để trống.", "error");
      return;
    }

    setSavingBubbleId(bubble.bubble_id);
    try {
      const saved = await updateBubbleTranslation(pageIdParam, bubble.bubble_id, nextText);
      setPageData((current) => current
        ? {
            ...current,
            processed_data: current.processed_data.map((item) =>
              item.bubble_id === bubble.bubble_id
                ? { ...item, translated_text: saved.translated_text }
                : item,
            ),
          }
        : current);
      setHistoryByBubble((current) => current[bubble.bubble_id]
        ? {
            ...current,
            [bubble.bubble_id]: [saved, ...current[bubble.bubble_id]],
          }
        : current);
      toast("Đã lưu bản sửa dịch.", "success");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không thể lưu bản sửa dịch.";
      toast(msg, "error");
    } finally {
      setSavingBubbleId(null);
    }
  };

  const toggleTranslationHistory = async (bubble: BubbleData) => {
    if (!pageIdParam) return;
    if (openHistoryBubbleId === bubble.bubble_id) {
      setOpenHistoryBubbleId(null);
      return;
    }

    setOpenHistoryBubbleId(bubble.bubble_id);
    if (historyByBubble[bubble.bubble_id]) return;

    setHistoryLoadingBubbleId(bubble.bubble_id);
    try {
      const history = await getTranslationHistory(pageIdParam, bubble.bubble_id);
      setHistoryByBubble((current) => ({
        ...current,
        [bubble.bubble_id]: history.items,
      }));
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không thể tải lịch sử sửa dịch.";
      toast(msg, "error");
    } finally {
      setHistoryLoadingBubbleId(null);
    }
  };

  const sendChat = useCallback(async (text?: string) => {
    const q = (text ?? chatInput).trim();
    if (!q || isChatLoading) return;

    setChatInput("");
    setIsChatLoading(true);
    setChatMessages(prev => [...prev, { id: Date.now(), role: "user", content: q }]);

    try {
      const context = (pageData?.processed_data ?? [])
        .map((b, i) =>
          `[${i + 1}] Gốc: ${b.original_text || "(không có)"}\n[${i + 1}] Dịch: ${b.translated_text || "(không có)"}`,
        )
        .join("\n\n");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.answer ?? errData?.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();

      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: data.answer ?? "Không có câu trả lời.",
      }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi trả lời.";
      setChatMessages(prev => [...prev, {
        id: Date.now() + 2,
        role: "assistant",
        content: msg,
        isError: true,
      }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, pageData]);

  return (
    <AnimatedPage>
    <div style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar active="reader" compact />

      <div style={{ display: "grid", gridTemplateColumns: `${hasMultiplePages ? "72px" : ""} 1fr ${showContext ? "320px" : "0px"}`, flex: 1, overflow: "hidden", transition: "grid-template-columns 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>

        {/* ── Left Rail: Dynamic Thumbnails ── */}
        {hasMultiplePages && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="scroll"
            style={{
              width: 72, background: "var(--panel)",
              borderRight: "2.5px solid var(--border)",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 12, padding: "20px 0",
              overflowY: "auto"
            }}
          >
            {batchPages.map((p, idx) => {
              const isCurrent = p.page_id === pageIdParam;
              return (
                <Link key={p.page_id} href={`/reader?page=${p.page_id}`}>
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: isCurrent ? 0 : -1 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      position: "relative", width: 48, height: 68,
                      border: isCurrent ? "3px solid var(--accent)" : "2px solid var(--border)",
                      background: "#fff", cursor: "pointer", overflow: "hidden",
                      boxShadow: isCurrent ? "4px 4px 0 var(--accent)" : "2px 2px 0 var(--border)",
                      transformOrigin: "center",
                      transition: "border-color 0.15s, box-shadow 0.15s"
                    }}
                  >
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={`Trang ${idx+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : p.original_image_url ? (
                      <img src={p.original_image_url} alt={`Trang ${idx+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold", color: "var(--muted)" }}>
                        {idx+1}
                      </div>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </motion.div>
        )}

        {/* ── Reader Canvas ── */}
        <div
          ref={mainRef}
          className="scroll"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto", padding: "20px 32px", gap: 16 }}
        >
          {/* Series breadcrumb (when page belongs to a series) */}
          {pageData?.metadata?.series_id && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                width: "100%",
                maxWidth: 840,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
              }}
            >
              <Link
                href={`/series/${pageData.metadata.series_id}`}
                style={{ textDecoration: "none", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <Icon name="stack" size={11} /> Bộ truyện
              </Link>
              {pageData.metadata.page_number != null && (
                <>
                  <span style={{ color: "var(--muted)" }}>/</span>
                  <span className="mono" style={{ color: "var(--fg-soft)" }}>Trang {pageData.metadata.page_number}</span>
                </>
              )}
              <div style={{ flex: 1 }} />
              <Link
                href={`/series/${pageData.metadata.series_id}/read?page=${pageData.page_id}`}
                style={{ textDecoration: "none" }}
              >
                <button className="btn btn-sm">
                  <Icon name="book" size={11} /> Đọc liền mạch
                </button>
              </Link>
            </motion.div>
          )}

          {/* Toolbar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stroke-ink"
            style={{ background: "var(--panel)", padding: "8px 14px", display: "flex", gap: 6, alignItems: "center", width: "100%", maxWidth: 840, flexWrap: "wrap" }}
          >
            <span className="caps-xs" style={{ color: "var(--accent)", marginRight: 6 }}>
              {pageData ? `Trang đã dịch · ${pageData.page_id.slice(0, 8)}…` : `Reader · Trang truyện`}
            </span>

            {/* Add to series — only when page exists and is NOT already in a series */}
            {pageData && !pageData.metadata?.series_id && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="btn btn-sm btn-ghost"
                onClick={() => setShowAddToSeries(true)}
                title="Thêm trang này vào một bộ truyện"
                style={{ fontSize: 11, padding: "4px 8px" }}
              >
                <Icon name="stack" size={11} /> Thêm vào bộ truyện
              </motion.button>
            )}

            <div style={{ flex: 1 }}/>

            {/* View mode tabs */}
            <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 2, position: "relative", background: "var(--panel)" }}>
              {([
                { id: "overlay", label: "Overlay", icon: "layers" },
                { id: "sidebyside", label: "Song ngữ", icon: "grid" },
                { id: "tap", label: "Tap", icon: "eye" },
              ] as { id: ViewMode; label: string; icon: string }[]).map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  style={{
                    padding: "6px 10px",
                    background: mode === m.id ? "var(--accent)" : "transparent",
                    color: mode === m.id ? "#fff" : "var(--fg)",
                    border: "none",
                    borderRight: i < 2 ? "1.5px solid var(--border)" : "none",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                    position: "relative",
                    zIndex: 2,
                    transition: "background-color 0.2s, color 0.2s",
                  }}
                >
                  <Icon name={m.icon} size={12}/> {m.label}
                </button>
              ))}
            </div>

            {/* Overlay toggle */}
            {mode !== "sidebyside" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-sm btn-ghost"
                onClick={() => setShowOverlay(v => !v)}
                aria-label="Bật/tắt bản dịch overlay"
                title="Toggle overlay (O)"
              >
                <Icon name={showOverlay ? "eye" : "eye-off"} size={14}/>
              </motion.button>
            )}

            {/* Zoom */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-sm btn-ghost" onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} aria-label="Thu nhỏ" title="Zoom out (-)">
              <Icon name="zoom-out" size={14}/>
            </motion.button>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)", minWidth: 36, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-sm btn-ghost" onClick={() => setZoom(z => Math.min(z + 0.1, 2.0))} aria-label="Phóng to" title="Zoom in (+)">
              <Icon name="zoom-in" size={14}/>
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-sm btn-ghost" aria-label="Bookmark trang này">
              <Icon name="bookmark" size={14}/>
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-sm btn-ghost" onClick={() => setShowContext(v => !v)} aria-label="Bật/tắt panel ngữ cảnh">
              <Icon name="info" size={14}/>
            </motion.button>
          </motion.div>

          {/* Empty state when no page selected */}
          <AnimatePresence mode="wait">
            {!pageIdParam && !isLoadingPage && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: "100%" }}>
                <EmptyReaderState />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading state */}
          <AnimatePresence mode="wait">
            {pageIdParam && isLoadingPage ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40 }}
              >
                <div style={{ width: 40, height: 40, border: "3px solid var(--border-soft)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Đang tải dữ liệu trang…</span>
              </motion.div>
            ) : pageIdParam ? (
              <motion.div
                key={pageIdParam || "no-page"}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                style={{ transformOrigin: "top center" }}
              >
                <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.15s" }}>
                  {mode === "sidebyside" ? (
                    <div style={{ display: "flex", gap: 20 }}>
                      <div>
                        <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>BẢN GỐC</div>
                        <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff", width: SIDE_W, height: computedSideH, position: "relative" }}>
                          {pageData?.original_image_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={pageData.original_image_url}
                              alt="Ảnh gốc"
                              style={{ width: "100%", height: "100%", display: "block" }}
                              onLoad={(e) => {
                                if (!imgNaturalSize) {
                                  setImgNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
                                }
                              }}
                            />
                          ) : (
                            <MangaPage w={SIDE_W} h={computedSideH} panels="default" showBubbles showOverlay={false}/>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>BẢN DỊCH</div>
                        <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff", position: "relative", width: SIDE_W, height: computedSideH }}>
                          {pageData?.original_image_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={translatedImageUrl || pageData.original_image_url} alt="Ảnh đã dịch" style={{ width: "100%", height: "100%", display: "block" }}/>
                          ) : (
                            <MangaPage w={SIDE_W} h={computedSideH} panels="default" showBubbles showOverlay overlayLang="vn"/>
                          )}
                          {pageData && showOverlay && !translatedImageUrl && imgNaturalSize && (
                            <BubbleOverlays
                              bubbles={pageData.processed_data}
                              containerW={SIDE_W} containerH={computedSideH}
                              imageW={imgNaturalSize.w} imageH={imgNaturalSize.h}
                              selected={selected} onSelect={setSelected} mode="overlay"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff", width: CANVAS_W, height: computedHeight, position: "relative" }}>
                        {mainImageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={mainImageUrl}
                            alt="Trang truyện"
                            style={{ width: "100%", height: "100%", display: "block" }}
                            onLoad={(e) => {
                              if (!imgNaturalSize) {
                                setImgNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
                              }
                            }}
                          />
                        ) : (
                          <MangaPage w={CANVAS_W} h={computedHeight} panels="default" showBubbles showOverlay={mode === "overlay" && showOverlay} overlayLang="vn"/>
                        )}

                        {pageData && imgNaturalSize && (mode === "tap" || (mode === "overlay" && showOverlay && !translatedImageUrl)) && (
                          <BubbleOverlays
                            bubbles={pageData.processed_data}
                            containerW={CANVAS_W} containerH={computedHeight}
                            imageW={imgNaturalSize.w} imageH={imgNaturalSize.h}
                            selected={selected} onSelect={setSelected} mode={mode}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* ── Bottom Navigation (conditional) ── */}
          {hasMultiplePages && currentPageIdx !== -1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, padding: "8px 16px", background: "var(--panel)", border: "1.5px solid var(--border)", borderRadius: 2 }}
            >
              {prevPageId ? (
                <Link href={`/reader?page=${prevPageId}`} style={{ color: "inherit" }}>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="btn btn-sm btn-ghost" style={{ minWidth: 32, padding: 4 }} aria-label="Trang trước">
                    <Icon name="arrow-left" size={14}/>
                  </motion.button>
                </Link>
              ) : (
                <button className="btn btn-sm btn-ghost" style={{ minWidth: 32, padding: 4, opacity: 0.3, cursor: "not-allowed" }} disabled>
                  <Icon name="arrow-left" size={14}/>
                </button>
              )}

              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, padding: "0 8px" }}>
                {currentPageIdx + 1} / {batchPages.length}
              </span>

              {nextPageId ? (
                <Link href={`/reader?page=${nextPageId}`} style={{ color: "inherit" }}>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="btn btn-sm btn-ghost" style={{ minWidth: 32, padding: 4 }} aria-label="Trang sau">
                    <Icon name="arrow-right" size={14}/>
                  </motion.button>
                </Link>
              ) : (
                <button className="btn btn-sm btn-ghost" style={{ minWidth: 32, padding: 4, opacity: 0.3, cursor: "not-allowed" }} disabled>
                  <Icon name="arrow-right" size={14}/>
                </button>
              )}
            </motion.div>
          )}

          {/* Keyboard hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", display: "flex", gap: 16, marginTop: 8 }}
          >
            {hasMultiplePages && <span>← → : chuyển trang</span>}
            <span>O : toggle overlay</span>
            <span>+/- : zoom</span>
          </motion.div>
        </div>

        {/* ── Context Panel ── */}
        <AnimatePresence>
          {showContext && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                background: "var(--bg-2)",
                borderLeft: "2px solid var(--border)",
                minWidth: 320,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Panel header + tabs */}
              <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span className="caps-sm" style={{ color: "var(--accent)" }}>Ngữ cảnh · Context</span>
                  <button className="btn btn-sm btn-ghost" style={{ padding: 4 }} onClick={() => setShowContext(false)} aria-label="Đóng panel ngữ cảnh">
                    <Icon name="x" size={13}/>
                  </button>
                </div>

                {/* Tab switcher */}
                <div style={{ display: "flex", border: "1.5px solid var(--border)", marginBottom: 14 }}>
                  {([
                    { id: "info", label: "Ngữ cảnh", icon: null },
                    { id: "chat", label: "Hỏi AI", icon: "sparkle" },
                  ] as { id: "info" | "chat"; label: string; icon: string | null }[]).map((tab, i) => (
                    <button
                      key={tab.id}
                      onClick={() => setContextTab(tab.id)}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        background: contextTab === tab.id ? "var(--accent)" : "transparent",
                        color: contextTab === tab.id ? "#fff" : "var(--fg)",
                        border: "none",
                        borderLeft: i > 0 ? "1.5px solid var(--border)" : "none",
                        fontSize: 11, fontWeight: 700, cursor: "pointer",
                        transition: "background 0.15s, color 0.15s",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      }}
                    >
                      {tab.icon && <Icon name={tab.icon} size={11}/>}
                      {tab.label}
                      {tab.id === "chat" && chatMessages.length > 0 && (
                        <span style={{
                          background: contextTab === "chat" ? "rgba(255,255,255,0.3)" : "var(--accent)",
                          color: contextTab === "chat" ? "#fff" : "#fff",
                          borderRadius: 999, fontSize: 9, fontWeight: 800,
                          padding: "1px 5px", lineHeight: 1.4,
                        }}>
                          {chatMessages.filter(m => m.role === "assistant").length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info tab */}
              {contextTab === "info" ? (
                <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
                  {/* Bubble stats */}
                  <div className="stroke-ink" style={{ background: "var(--panel)", padding: 12, marginBottom: 16 }}>
                    <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>Thống kê trang</div>
                    {[
                      ["Bubbles detected", pageData ? String(pageData.processed_data.length) : "—"],
                      ["OCR confidence", pageData ? `${Math.round((pageData.processed_data.reduce((a, b) => a + b.confidence, 0) / Math.max(1, pageData.processed_data.length)) * 100)}%` : "—"],
                      ["Translation", pageData ? "ai_module" : "—"],
                      ["Chunks indexed", pageData ? String(pageData.processed_data.length) : "—"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0" }}>
                        <span style={{ color: "var(--muted)" }}>{k}</span>
                        <span className="mono" style={{ fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Translation edits */}
                  <div>
                    <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 8 }}>Sửa bản dịch</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {(pageData?.processed_data || []).map((bubble, index) => {
                        const history = historyByBubble[bubble.bubble_id] || [];
                        const isHistoryOpen = openHistoryBubbleId === bubble.bubble_id;
                        const isSaving = savingBubbleId === bubble.bubble_id;
                        const isHistoryLoading = historyLoadingBubbleId === bubble.bubble_id;

                        return (
                          <div key={bubble.bubble_id} className="stroke-ink" style={{ background: "var(--panel)", padding: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                              <span className="mono" style={{ fontSize: 11, fontWeight: 800 }}>#{index + 1}</span>
                              <button
                                className="btn btn-sm btn-ghost"
                                style={{ padding: "3px 6px", fontSize: 11 }}
                                onClick={() => toggleTranslationHistory(bubble)}
                                aria-label="Xem lịch sử sửa dịch"
                              >
                                <Icon name="history" size={12}/> {isHistoryOpen ? "Ẩn" : "Lịch sử"}
                              </button>
                            </div>

                            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4, marginBottom: 8 }}>
                              {bubble.original_text || "Không có OCR gốc"}
                            </div>

                            <textarea
                              value={editTexts[bubble.bubble_id] ?? bubble.translated_text}
                              onChange={(event) => setEditTexts((current) => ({
                                ...current,
                                [bubble.bubble_id]: event.target.value,
                              }))}
                              rows={3}
                              style={{
                                width: "100%",
                                resize: "vertical",
                                border: "1.5px solid var(--border)",
                                background: "#fff",
                                color: "var(--fg)",
                                padding: 8,
                                fontSize: 12,
                                lineHeight: 1.4,
                                fontFamily: "var(--font-serif)",
                                boxSizing: "border-box",
                              }}
                            />

                            <button
                              className="btn btn-sm btn-primary"
                              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                              disabled={isSaving}
                              onClick={() => saveTranslation(bubble)}
                            >
                              <Icon name="check" size={13}/> {isSaving ? "Đang lưu..." : "Lưu bản sửa"}
                            </button>

                            {isHistoryOpen && (
                              <div style={{ borderTop: "1px solid var(--border-soft)", marginTop: 10, paddingTop: 8 }}>
                                {isHistoryLoading ? (
                                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Đang tải lịch sử...</div>
                                ) : history.length ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {history.map((item) => (
                                      <div key={item.translation_id} style={{ fontSize: 11, lineHeight: 1.45 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "var(--muted)", marginBottom: 2 }}>
                                          <span>{item.username || (item.llm_model_used === "user_edit" ? "User" : "AI")}</span>
                                          <span className="mono">{new Date(item.translated_at).toLocaleString("vi-VN")}</span>
                                        </div>
                                        <div style={{ background: "var(--bg)", border: "1px solid var(--border-soft)", padding: 6 }}>
                                          {item.translated_text}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Chưa có lịch sử sửa dịch.</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Chat tab ── */
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "0 20px 16px" }}>
                  {/* Messages */}
                  <div className="scroll" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
                    {chatMessages.length === 0 && !isChatLoading && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", padding: "28px 12px", color: "var(--muted)" }}>
                        <div style={{ width: 48, height: 48, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "2.5px solid var(--border)", boxShadow: "3px 3px 0 var(--border)", fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 800, marginBottom: 12 }}>
                          Q
                        </div>
                        <div style={{ fontSize: 13, fontFamily: "var(--font-serif)", color: "var(--fg)", marginBottom: 6 }}>Hỏi AI về trang này</div>
                        <div style={{ fontSize: 11 }}>AI trả lời dựa trên nội dung đã index</div>
                      </div>
                    )}

                    {/* Suggestion chips (empty state) */}
                    {chatMessages.length === 0 && !isChatLoading && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                        {["Tóm tắt nội dung trang này", "Nhân vật nào xuất hiện trong trang?", "Ý nghĩa đoạn hội thoại này?"].map(q => (
                          <motion.button
                            key={q}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => sendChat(q)}
                            style={{
                              background: "var(--panel)", border: "1.5px solid var(--border-soft)",
                              padding: "7px 10px", fontSize: 11, textAlign: "left",
                              cursor: "pointer", color: "var(--fg)", lineHeight: 1.4,
                              transition: "background 0.1s",
                            }}
                          >
                            {q}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    <AnimatePresence initial={false}>
                      {chatMessages.map(msg => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 4 }}
                        >
                          <div style={{
                            background: msg.role === "user" ? "var(--accent)" : msg.isError ? "rgba(200,16,46,0.06)" : "#fff",
                            color: msg.role === "user" ? "#fff" : "var(--fg)",
                            border: "2px solid var(--border)",
                            padding: "8px 12px",
                            fontSize: 12, lineHeight: 1.6,
                            maxWidth: "92%",
                            boxShadow: "2px 2px 0 var(--border)",
                          }}>
                            {msg.content}
                          </div>
                          {msg.sources && msg.sources.length > 0 && (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {msg.sources.map(src => (
                                <div key={`${src.ch}-${src.p}`} className="chip" style={{ fontSize: 9, padding: "2px 6px" }}>
                                  Ch.{src.ch} · P.{src.p}
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {isChatLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ display: "flex", gap: 5, padding: "8px 12px", background: "#fff", border: "2px solid var(--border)", width: "fit-content", boxShadow: "2px 2px 0 var(--border)" }}
                      >
                        {[0, 0.2, 0.4].map(d => (
                          <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", animation: `pulse 1.2s ease-in-out ${d}s infinite` }}/>
                        ))}
                      </motion.div>
                    )}
                    <div ref={chatEndRef}/>
                  </div>

                  {/* Input composer */}
                  <div style={{ flexShrink: 0, marginTop: 10 }}>
                    <div className="stroke-ink-thick" style={{ background: "#fff", padding: "8px 10px", display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <textarea
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => {
                          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                            e.preventDefault();
                            sendChat();
                          }
                        }}
                        placeholder="Hỏi về cốt truyện, nhân vật…"
                        rows={2}
                        style={{
                          flex: 1, border: "none", outline: "none",
                          resize: "none", fontSize: 12,
                          fontFamily: "inherit", background: "transparent",
                          color: "var(--fg)", lineHeight: 1.5,
                        }}
                        disabled={isChatLoading}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => sendChat()}
                        disabled={!chatInput.trim() || isChatLoading}
                        aria-label="Gửi câu hỏi"
                        style={{ opacity: (!chatInput.trim() || isChatLoading) ? 0.5 : 1, flexShrink: 0 }}
                      >
                        <Icon name="send" size={12}/>
                      </button>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "right", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                      Ctrl+Enter · {pageIdParam ? "Gemini 2.5 Flash" : "Demo"}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    {pageData && (
      <AddToSeriesModal
        open={showAddToSeries}
        pageIds={[pageData.page_id]}
        onClose={() => setShowAddToSeries(false)}
        onSuccess={() => {
          // Re-fetch page metadata so the breadcrumb appears
          if (pageIdParam) {
            getPage(pageIdParam).then(setPageData).catch(() => {});
          }
        }}
      />
    )}
    </AnimatedPage>
  );
}

// Wrap with Suspense for useSearchParams
export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid var(--border-soft)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}/>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Đang tải reader…</div>
        </div>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
