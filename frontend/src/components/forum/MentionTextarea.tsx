"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { useI18n } from "@/contexts/I18nContext";
import { searchForumMentionUsers, type ForumMentionUser } from "@/lib/api";

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  "aria-label"?: string;
}

interface MentionState {
  /** Char offset of the `@` that started the trigger. */
  startIdx: number;
  /** Current query text (chars typed after `@`). */
  query: string;
}

const SEARCH_DEBOUNCE_MS = 180;
const MAX_QUERY_LEN = 30;

/**
 * Drop-in <textarea> replacement that opens a Facebook-style autocomplete
 * popup whenever the user types `@` followed by name characters. Selecting
 * a result replaces the in-progress `@query` with `@username` + trailing
 * space. Closing triggers: Escape, space, click-outside, empty results.
 *
 * Forwards a ref to the underlying <textarea> so callers can call .focus().
 */
export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(function MentionTextarea(
  { value, onChange, placeholder, rows = 3, maxLength, autoFocus, disabled, style, className, ...aria },
  ref,
) {
  const { t } = useI18n();
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [results, setResults] = useState<ForumMentionUser[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  // Detect / update the active mention based on caret position + text.
  const refreshMentionContext = useCallback((text: string, caret: number) => {
    if (caret <= 0) { setMention(null); return; }
    // Walk back from caret to find a `@`, stopping at whitespace.
    let i = caret - 1;
    while (i >= 0) {
      const ch = text[i];
      if (ch === "@") break;
      if (/\s/.test(ch)) { setMention(null); return; }
      if (caret - i > MAX_QUERY_LEN) { setMention(null); return; }
      i--;
    }
    if (i < 0) { setMention(null); return; }
    // `@` must be at start of string OR preceded by whitespace — avoids
    // triggering on email-like patterns ("user@example.com").
    if (i > 0 && !/\s/.test(text[i - 1])) { setMention(null); return; }
    const query = text.slice(i + 1, caret);
    // Query may be empty (just typed `@`) — still open the popup.
    setMention({ startIdx: i, query });
  }, []);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    onChange(next);
    refreshMentionContext(next, e.target.selectionStart ?? next.length);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    refreshMentionContext(ta.value, ta.selectionStart ?? ta.value.length);
  };

  // Debounced search whenever the active query changes.
  useEffect(() => {
    if (mention === null) { setResults([]); setLoading(false); return; }
    // Empty query = show recently-active heuristic? We just clear results
    // until the user types at least one letter, matching Facebook behavior.
    if (mention.query.length === 0) { setResults([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const res = await searchForumMentionUsers(mention.query, 8);
        if (cancelled) return;
        setResults(res);
        setActiveIdx(0);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [mention?.startIdx, mention?.query, mention]);

  const closeMention = () => {
    setMention(null);
    setResults([]);
  };

  const acceptUser = (user: ForumMentionUser) => {
    if (mention === null) return;
    const before = value.slice(0, mention.startIdx);
    const after = value.slice(mention.startIdx + 1 + mention.query.length);
    // Trailing space so the user can keep typing without reopening the picker.
    const insertion = `@${user.username} `;
    const next = before + insertion + after;
    onChange(next);
    closeMention();
    // Restore caret right after the inserted mention.
    const caret = before.length + insertion.length;
    requestAnimationFrame(() => {
      const ta = innerRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(caret, caret);
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention === null || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      acceptUser(results[activeIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMention();
    }
  };

  // Click outside dismiss.
  useEffect(() => {
    if (mention === null) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMention();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [mention]);

  const open = mention !== null && (loading || results.length > 0 || mention.query.length > 0);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <textarea
        ref={innerRef}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        autoFocus={autoFocus}
        disabled={disabled}
        className={className}
        style={style}
        aria-label={aria["aria-label"]}
      />

      {open && (
        <div
          role="listbox"
          className="stroke-ink panel-shadow"
          style={{
            position: "absolute",
            // Anchor below the textarea — simpler than caret-pixel math and
            // matches the visual weight of dropdowns elsewhere in the app.
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "var(--panel)",
            zIndex: 50,
            maxHeight: 280,
            overflowY: "auto",
          }}
          onMouseDown={e => e.preventDefault()}
        >
          {loading && results.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted)" }}>
              {t("forum.mention.searching", "Đang tìm...")}
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
              {t("forum.mention.no_results", "Không tìm thấy người dùng.")}
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {results.map((u, idx) => {
                const active = idx === activeIdx;
                return (
                  <li key={u.user_id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => acceptUser(u)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: active ? "var(--accent)" : "transparent",
                        color: active ? "#fff" : "var(--fg)",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 13,
                      }}
                    >
                      <Avatar src={u.avatar_url} username={u.username} active={active} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {u.display_name || u.full_name || u.username}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: active ? "rgba(255,255,255,0.85)" : "var(--muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          @{u.username}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});

function Avatar({ src, username, active }: { src: string | null; username: string; active: boolean }) {
  const fallback = (username[0] || "?").toUpperCase();
  return (
    <div
      className="stroke-ink"
      style={{
        width: 28,
        height: 28,
        background: active ? "rgba(255,255,255,0.18)" : "var(--bg-2)",
        color: active ? "#fff" : "var(--fg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 800,
        overflow: "hidden",
      }}
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        fallback
      )}
    </div>
  );
}
