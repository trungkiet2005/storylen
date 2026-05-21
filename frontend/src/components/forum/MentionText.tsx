"use client";

import React, { Fragment } from "react";
import Link from "next/link";

const MENTION_RE = /(?<!\w)@([A-Za-z0-9_]{3,30})/g;
const URL_RE = /\b(https?:\/\/[^\s<>"']+)/g;

/**
 * Render plain-text post body with @mentions and bare URLs linkified.
 * XSS-safe: all interpolation goes through React text nodes — no
 * dangerouslySetInnerHTML.
 */
export function MentionText({ text }: { text: string }) {
  if (!text) return null;

  // Tokenize: split text by mentions + URLs, keeping the matches.
  // We process line-by-line to preserve newlines as <br/>.
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {renderLine(line)}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}

function renderLine(line: string): React.ReactNode[] {
  // Combined regex pass: find each mention or URL, emit text chunks between.
  const out: React.ReactNode[] = [];
  let cursor = 0;
  // Reset lastIndex on each call because we use the `g` flag.
  const combined = /(?<!\w)@([A-Za-z0-9_]{3,30})|(\bhttps?:\/\/[^\s<>"']+)/g;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = combined.exec(line)) !== null) {
    if (m.index > cursor) {
      out.push(line.slice(cursor, m.index));
    }
    if (m[1]) {
      const uname = m[1];
      out.push(
        <Link
          key={`m-${key++}`}
          href={`/u/${encodeURIComponent(uname)}`}
          style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}
        >
          @{uname}
        </Link>
      );
    } else if (m[2]) {
      const url = m[2];
      out.push(
        <a
          key={`u-${key++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          {url}
        </a>
      );
    }
    cursor = m.index + m[0].length;
  }
  if (cursor < line.length) {
    out.push(line.slice(cursor));
  }
  // Silence unused-var lint when MENTION_RE/URL_RE are only kept for reference.
  void MENTION_RE; void URL_RE;
  return out;
}
