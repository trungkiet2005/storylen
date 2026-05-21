"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { ThreadCard } from "@/components/forum/ThreadCard";
import {
  APIError,
  listForumThreads,
  type ForumCategory,
  type ForumSort,
  type ForumThread,
} from "@/lib/api";

const CATEGORIES: ForumCategory[] = ["discussion", "qna", "recommend", "feedback", "announcement"];
const SORTS: ForumSort[] = ["hot", "top", "new"];
const PAGE_SIZE = 20;

function isCategory(v: string | null): v is ForumCategory {
  return !!v && (CATEGORIES as readonly string[]).includes(v);
}
function isSort(v: string | null): v is ForumSort {
  return !!v && (SORTS as readonly string[]).includes(v);
}

export default function ForumIndexPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  const category = isCategory(params.get("category")) ? (params.get("category") as ForumCategory) : null;
  const sort = isSort(params.get("sort")) ? (params.get("sort") as ForumSort) : "hot";
  const initialQ = params.get("q") ?? "";

  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState(initialQ);

  const load = useCallback(async (resetPage = false) => {
    setLoading(true);
    setError(null);
    const offset = resetPage ? 0 : page * PAGE_SIZE;
    try {
      const res = await listForumThreads({
        category: category ?? undefined,
        sort,
        q: initialQ || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setThreads(res.items);
      setTotal(res.total);
      if (resetPage) setPage(0);
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không tải được danh sách thread.";
      setError(msg);
      setThreads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  // initialQ comes from URL so it's stable per render until URL changes; safe to include.
  }, [category, sort, page, initialQ]);

  useEffect(() => { void load(); }, [load]);

  const updateUrl = useCallback(
    (next: { category?: ForumCategory | null; sort?: ForumSort; q?: string }) => {
      const sp = new URLSearchParams(params.toString());
      if ("category" in next) {
        if (next.category) sp.set("category", next.category);
        else sp.delete("category");
      }
      if (next.sort) sp.set("sort", next.sort);
      if ("q" in next) {
        if (next.q) sp.set("q", next.q);
        else sp.delete("q");
      }
      router.replace(`/forum${sp.toString() ? `?${sp.toString()}` : ""}`);
    },
    [params, router]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ q: searchInput.trim() });
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 80px" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <h1 className="display" style={{ fontSize: 32, marginBottom: 6 }}>
              {t("forum.title")}
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 540 }}>{t("forum.subtitle")}</p>
          </div>
          {user ? (
            <Link href="/forum/new" className="btn btn-primary">
              + {t("forum.new_thread")}
            </Link>
          ) : (
            <Link href="/login?next=/forum/new" className="btn">
              {t("nav.login")}
            </Link>
          )}
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
          {/* Filter bar */}
          <div
            className="stroke-ink"
            style={{
              background: "var(--panel)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Category tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                type="button"
                onClick={() => updateUrl({ category: null })}
                className="caps-xs"
                style={tabStyle(category === null)}
              >
                {t("forum.all_categories")}
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateUrl({ category: c })}
                  className="caps-xs"
                  style={tabStyle(category === c)}
                >
                  {t(`forum.category.${c}`)}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {/* Sort tabs */}
              <div style={{ display: "flex", gap: 6 }}>
                {SORTS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateUrl({ sort: s })}
                    className="caps-xs"
                    style={tabStyle(sort === s)}
                  >
                    {t(`forum.sort.${s}`)}
                  </button>
                ))}
              </div>

              {/* Search */}
              <form onSubmit={handleSearch} style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder={t("forum.search_placeholder")}
                  maxLength={200}
                  style={{
                    padding: "5px 8px",
                    fontSize: 12,
                    background: "var(--bg-2)",
                    border: "1.5px solid var(--border)",
                    color: "var(--fg)",
                    minWidth: 200,
                  }}
                />
                <button type="submit" className="btn btn-sm" style={{ fontSize: 12 }}>
                  {t("common.search")}
                </button>
              </form>
            </div>
          </div>

          {/* Thread list */}
          {loading ? (
            <div style={{ color: "var(--muted)", padding: 20 }}>{t("common.loading")}</div>
          ) : error ? (
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20, color: "var(--accent)" }}>
              {error}
            </div>
          ) : threads.length === 0 ? (
            <div
              className="stroke-ink"
              style={{
                background: "var(--panel)",
                padding: 32,
                textAlign: "center",
                color: "var(--muted)",
                fontStyle: "italic",
              }}
            >
              {t("forum.empty")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {threads.map(th => (
                <ThreadCard key={th.thread_id} thread={th} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="btn btn-sm"
              >
                ← {t("common.back")}
              </button>
              <span style={{ alignSelf: "center", fontSize: 12, color: "var(--muted)" }}>
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn btn-sm"
              >
                {t("common.next")} →
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    background: active ? "var(--ink)" : "transparent",
    color: active ? "var(--paper)" : "var(--fg)",
    border: "1.5px solid var(--border)",
  };
}
