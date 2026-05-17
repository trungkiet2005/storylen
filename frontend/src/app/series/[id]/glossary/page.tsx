"use client";
import React, { use, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { SectionHeader } from "@/components/SectionHeader";
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from "@/components/Animations";
import { useWibu } from "@/contexts/WibuContext";
import { type GlossaryEntry } from "@/lib/localStore";
import { useToast } from "@/components/Toast";
import { APIError, getGlossarySuggestions, type GlossarySuggestion } from "@/lib/api";

function GlossaryRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: GlossaryEntry;
  onEdit: (e: GlossaryEntry) => void;
  onDelete: (key: string) => void;
}) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      style={{ borderBottom: "1px solid var(--border-soft)" }}
    >
      <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13 }}>
        {entry.key}
      </td>
      <td style={{ padding: "10px 16px", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
        {entry.value}
      </td>
      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
        {entry.note || "—"}
      </td>
      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => onEdit(entry)}
            style={{ padding: "3px 8px" }}
            title="Sửa"
          >
            <Icon name="settings" size={12} />
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => onDelete(entry.key)}
            style={{ padding: "3px 8px", color: "var(--accent)" }}
            title="Xoá"
          >
            <Icon name="trash" size={12} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

const PRESET_KEYS = [
  "主人公", "ヒロイン", "悪役", "魔法", "剣", "盾", "勇者", "魔王",
  "Main character", "Villain", "Magic", "Sword", "Hero", "Demon King",
];

export default function GlossaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getGlossary, upsertGlossaryEntry, deleteGlossaryEntry } = useWibu();
  const { toast } = useToast();

  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [search, setSearch] = useState("");

  // Form state
  const [formKey, setFormKey] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formNote, setFormNote] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // Auto-suggest (Tier A #4)
  const [suggestions, setSuggestions] = useState<GlossarySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [scannedBubbles, setScannedBubbles] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const refresh = () => setEntries(getGlossary(id));

  useEffect(() => { refresh(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSuggestions = React.useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const res = await getGlossarySuggestions(id, { minCount: 3, limit: 40 });
      setSuggestions(res.candidates);
      setScannedBubbles(res.scanned_bubbles);
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không tải được đề xuất.";
      toast(msg, "error");
    } finally {
      setLoadingSuggestions(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const existingKeys = React.useMemo(() => new Set(entries.map(e => e.key)), [entries]);
  const visibleSuggestions = suggestions.filter(
    s => !existingKeys.has(s.candidate) && !dismissed.has(s.candidate),
  );

  const handleAddSuggestion = (s: GlossarySuggestion) => {
    setFormKey(s.candidate);
    setFormValue("");
    setFormNote(`Xuất hiện ${s.count} lần · ${s.kind === "katakana" ? "katakana (thường là tên)" : "kanji compound"}`);
    setEditingKey(null);
    document.getElementById("glossary-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDismissSuggestion = (candidate: string) => {
    setDismissed(prev => new Set(prev).add(candidate));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim() || !formValue.trim()) {
      toast("Vui lòng nhập cả thuật ngữ gốc và bản dịch.", "error");
      return;
    }
    upsertGlossaryEntry(id, { key: formKey.trim(), value: formValue.trim(), note: formNote.trim() });
    refresh();
    setFormKey(""); setFormValue(""); setFormNote(""); setEditingKey(null);
    toast(editingKey ? "Đã cập nhật từ điển." : "Đã thêm thuật ngữ mới.", "success");
  };

  const handleEdit = (entry: GlossaryEntry) => {
    setFormKey(entry.key);
    setFormValue(entry.value);
    setFormNote(entry.note);
    setEditingKey(entry.key);
    document.getElementById("glossary-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDelete = (key: string) => {
    if (!confirm(`Xoá thuật ngữ "${key}"?`)) return;
    deleteGlossaryEntry(id, key);
    refresh();
    toast("Đã xoá thuật ngữ.", "info");
  };

  const filtered = entries.filter(e =>
    !search.trim() ||
    e.key.toLowerCase().includes(search.toLowerCase()) ||
    e.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="series" />
        <div style={{ padding: "40px 56px" }}>
          <FadeIn direction="up" distance={20} delay={0.1}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Link href={`/series/${id}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="arrow-left" size={12} /> Bộ truyện
              </Link>
            </div>
            <SectionHeader
              kanji="辞"
              label="Từ Điển · Glossary"
              title="Thuật ngữ riêng của bộ truyện"
              subtitle="Định nghĩa tên nhân vật, kỹ năng, địa điểm để AI dịch nhất quán hơn."
              stamp="DICT"
            />
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28, alignItems: "flex-start" }}>
            {/* Left — table */}
            <div>
              {/* Auto-suggest panel (Tier A #4) */}
              {(loadingSuggestions || visibleSuggestions.length > 0) && (
                <FadeIn direction="up" distance={10} delay={0.12}>
                  <div
                    className="stroke-ink panel-shadow"
                    style={{
                      background: "var(--panel)",
                      padding: "14px 16px",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Icon name="sparkle" size={13} />
                      <span className="caps-xs" style={{ color: "var(--accent)" }}>
                        Đề xuất tự động
                      </span>
                      {scannedBubbles !== null && (
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          · đã quét {scannedBubbles} bong bóng
                        </span>
                      )}
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={loadSuggestions}
                        disabled={loadingSuggestions}
                        className="btn btn-sm btn-ghost"
                        title="Quét lại"
                        style={{ fontSize: 10, padding: "2px 6px" }}
                      >
                        <Icon name="refresh" size={10} /> Quét lại
                      </button>
                    </div>

                    {loadingSuggestions ? (
                      <div style={{ padding: "10px 0", color: "var(--muted)", fontSize: 12 }}>
                        Đang quét bong bóng để tìm danh từ riêng…
                      </div>
                    ) : visibleSuggestions.length === 0 ? (
                      <div style={{ padding: "6px 0", color: "var(--muted)", fontSize: 12 }}>
                        Không tìm thấy ứng viên mới. Hệ thống chỉ đề xuất từ lặp ≥ 3 lần.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {visibleSuggestions.slice(0, 16).map(s => (
                          <div
                            key={s.candidate}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 6px 4px 10px",
                              background: "var(--bg-2)",
                              border: "1.5px solid var(--border-soft)",
                              fontSize: 12,
                            }}
                            title={s.sample}
                          >
                            <span className="serif" style={{ fontWeight: 600 }}>{s.candidate}</span>
                            <span style={{ color: "var(--muted)", fontSize: 10 }}>×{s.count}</span>
                            <button
                              onClick={() => handleAddSuggestion(s)}
                              title="Thêm vào từ điển"
                              style={{
                                marginLeft: 4, padding: "2px 5px", fontSize: 10,
                                background: "var(--accent)", color: "#fff",
                                border: "none", cursor: "pointer",
                              }}
                            >
                              + Thêm
                            </button>
                            <button
                              onClick={() => handleDismissSuggestion(s.candidate)}
                              title="Bỏ qua"
                              style={{
                                padding: "2px 4px", fontSize: 10,
                                background: "transparent", color: "var(--muted)",
                                border: "1px solid var(--border-soft)", cursor: "pointer",
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {visibleSuggestions.length > 16 && (
                          <span style={{ alignSelf: "center", fontSize: 11, color: "var(--muted)" }}>
                            … còn {visibleSuggestions.length - 16}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </FadeIn>
              )}

              {/* Search */}
              <FadeIn direction="up" distance={10} delay={0.15}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "2px solid var(--border)", background: "var(--panel)", marginBottom: 16 }}>
                  <Icon name="search" size={13} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm thuật ngữ…"
                    style={{ border: "none", background: "transparent", flex: 1, fontSize: 13, outline: "none", color: "var(--fg)" }}
                  />
                </div>
              </FadeIn>

              {filtered.length === 0 ? (
                <FadeIn direction="up" distance={10} delay={0.2}>
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
                    <div className="serif" style={{ fontSize: 48, opacity: 0.2 }}>辞</div>
                    <div style={{ marginTop: 8 }}>
                      {entries.length === 0
                        ? "Từ điển đang trống. Thêm thuật ngữ đầu tiên bên phải."
                        : "Không tìm thấy thuật ngữ phù hợp."}
                    </div>
                  </div>
                </FadeIn>
              ) : (
                <FadeIn direction="up" distance={10} delay={0.2}>
                  <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--bg-2)" }}>
                          {["Thuật ngữ gốc", "Bản dịch", "Ghi chú", ""].map(h => (
                            <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {filtered.map(e => (
                            <GlossaryRow key={e.key} entry={e} onEdit={handleEdit} onDelete={handleDelete} />
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)" }}>
                    {filtered.length} / {entries.length} thuật ngữ
                  </div>
                </FadeIn>
              )}
            </div>

            {/* Right — add/edit form */}
            <FadeIn direction="up" distance={15} delay={0.2}>
              <div id="glossary-form" className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: "24px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: editingKey ? "var(--jade)" : "var(--accent)" }}>
                  <Icon name={editingKey ? "settings" : "plus"} size={13} />
                  {editingKey ? `Sửa: "${editingKey}"` : "Thêm thuật ngữ mới"}
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                      Thuật ngữ gốc *
                    </label>
                    <input
                      value={formKey}
                      onChange={e => setFormKey(e.target.value)}
                      placeholder="e.g. 主人公 hoặc Protagonist"
                      disabled={!!editingKey}
                      style={{
                        width: "100%", padding: "8px 10px", fontSize: 13,
                        border: "2px solid var(--border)", background: "var(--bg)",
                        color: "var(--fg)", fontFamily: "var(--font-mono)",
                        boxSizing: "border-box",
                      }}
                    />
                    {/* Preset suggestions */}
                    {!editingKey && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                        {PRESET_KEYS.slice(0, 8).map(k => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setFormKey(k)}
                            className="chip"
                            style={{ cursor: "pointer", border: "none", fontSize: 9 }}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                      Bản dịch *
                    </label>
                    <input
                      value={formValue}
                      onChange={e => setFormValue(e.target.value)}
                      placeholder="e.g. Nhân vật chính"
                      style={{
                        width: "100%", padding: "8px 10px", fontSize: 13,
                        border: "2px solid var(--border)", background: "var(--bg)",
                        color: "var(--fg)", boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                      Ghi chú (tuỳ chọn)
                    </label>
                    <input
                      value={formNote}
                      onChange={e => setFormNote(e.target.value)}
                      placeholder="e.g. Nhân vật nam chính truyện..."
                      style={{
                        width: "100%", padding: "8px 10px", fontSize: 13,
                        border: "2px solid var(--border)", background: "var(--bg)",
                        color: "var(--fg)", boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="btn btn-sm btn-primary"
                      style={{ flex: 1 }}
                    >
                      <Icon name={editingKey ? "check" : "plus"} size={13} />
                      {editingKey ? "Cập nhật" : "Thêm vào từ điển"}
                    </motion.button>
                    {editingKey && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => { setEditingKey(null); setFormKey(""); setFormValue(""); setFormNote(""); }}
                      >
                        Huỷ
                      </button>
                    )}
                  </div>
                </form>

                {entries.length > 0 && (
                  <div style={{ marginTop: 20, padding: "12px", background: "var(--bg-2)", fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
                    <Icon name="info" size={11} /> Từ điển được lưu trong trình duyệt. Tương lai có thể dùng để nhắc AI dịch nhất quán tên riêng.
                  </div>
                )}
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
