"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "vi" | "en";

type Dict = Record<string, string>;

const VI: Dict = {
  // ── Navigation ──────────────────────────────────────────────────────
  "nav.home": "Trang chủ",
  "nav.upload": "Tải lên",
  "nav.browse": "Khám phá",
  "nav.qa": "Hỏi đáp",
  "nav.history": "Lịch sử",
  "nav.notifications": "Thông báo",
  "nav.profile": "Hồ sơ",
  "nav.login": "Đăng nhập",
  "nav.register": "Đăng ký",
  "nav.logout": "Đăng xuất",
  "nav.library": "Thư viện",
  "nav.forum": "Diễn đàn",

  // ── Forum ──────────────────────────────────────────────────────────
  "forum.title": "Diễn đàn cộng đồng",
  "forum.subtitle": "Hỏi đáp, chia sẻ và đề xuất truyện cùng cộng đồng StoryLens.",
  "forum.new_thread": "Tạo thread mới",
  "forum.all_categories": "Tất cả",
  "forum.category.discussion": "Thảo luận",
  "forum.category.qna": "Hỏi đáp",
  "forum.category.recommend": "Đề xuất truyện",
  "forum.category.feedback": "Góp ý",
  "forum.category.announcement": "Thông báo",
  "forum.sort.hot": "Nổi bật",
  "forum.sort.top": "Cao điểm",
  "forum.sort.new": "Mới nhất",
  "forum.search_placeholder": "Tìm theo tiêu đề...",
  "forum.empty": "Chưa có thread nào trong mục này.",
  "forum.pinned": "Đã ghim",
  "forum.locked": "Đã khoá",
  "forum.replies": "trả lời",
  "forum.by": "bởi",
  "forum.reply": "Trả lời",
  "forum.reply_to": "Đang trả lời",
  "forum.reply_placeholder": "Viết bình luận của bạn...",
  "forum.reply_submit": "Gửi",
  "forum.mention_hint": "Mẹo: dùng @username để nhắc người khác — họ sẽ nhận thông báo.",
  "forum.title_label": "Tiêu đề",
  "forum.title_placeholder": "Nói ngắn gọn chủ đề bạn muốn thảo luận",
  "forum.body_label": "Nội dung",
  "forum.body_placeholder": "Mô tả chi tiết. Có thể @nhắc người khác.",
  "forum.category_label": "Danh mục",
  "forum.upvote": "Tăng",
  "forum.downvote": "Giảm",
  "forum.locked_notice": "Thread đã khoá — không thể trả lời thêm.",
  "forum.login_required": "Bạn cần đăng nhập để tham gia diễn đàn.",
  "forum.delete_confirm": "Xoá bài viết này?",
  "forum.admin_pin": "Ghim",
  "forum.admin_unpin": "Bỏ ghim",
  "forum.admin_lock": "Khoá",
  "forum.admin_unlock": "Mở khoá",
  "forum.back_to_list": "Quay lại danh sách",
  "forum.attach.label": "Đính kèm ảnh / video",
  "forum.attach.add": "Chọn file",
  "forum.attach.hint": "Kéo thả hoặc chọn file. Ảnh tối đa 10MB, video tối đa 50MB. Tối đa 10 file.",
  "forum.attach.too_large_image": "Ảnh vượt quá 10MB.",
  "forum.attach.too_large_video": "Video vượt quá 50MB.",
  "forum.attach.unsupported": "Loại file không hỗ trợ. Dùng JPG/PNG/WebP/GIF hoặc MP4/WebM.",
  "forum.attach.over_limit": "Tối đa 10 file/post.",

  // ── Common buttons / actions ────────────────────────────────────────
  "common.search": "Tìm kiếm",
  "common.cancel": "Huỷ",
  "common.save": "Lưu",
  "common.delete": "Xoá",
  "common.confirm": "Xác nhận",
  "common.back": "Quay lại",
  "common.next": "Tiếp",
  "common.continue": "Tiếp tục",
  "common.loading": "Đang tải...",
  "common.error_generic": "Có lỗi xảy ra. Vui lòng thử lại.",
  "common.retry": "Thử lại",
  "common.close": "Đóng",
  "common.email": "Email",
  "common.password": "Mật khẩu",
  "common.username": "Tên đăng nhập",

  // ── Hero / landing ──────────────────────────────────────────────────
  "hero.tagline": "XÓA NHÒA RÀO CẢN NGÔN NGỮ · STORYLENS VOL. 1",
  "hero.title.line1": "ĐỌC TRUYỆN,",
  "hero.title.line2": "KHÔNG CÒN",
  "hero.title.line3": "rào cản.",
  "hero.subtitle":
    "Bản dịch giữ nguyên nhịp điệu, ngữ khí nhân vật, và giọng văn gốc — nhờ ngữ cảnh được AI học từ toàn bộ chương truyện.",
  "hero.cta_start": "Bắt đầu ngay",
  "hero.cta_qa": "Trải nghiệm Q&A",

  // ── Login ───────────────────────────────────────────────────────────
  "login.section": "STORYLENS ACCOUNT · LOGIN",
  "login.title": "Chào mừng trở lại",
  "login.no_account": "Chưa có tài khoản?",
  "login.forgot": "Quên mật khẩu?",
  "login.submit": "Đăng nhập",
  "login.submitting": "Đang đăng nhập...",
  "login.or": "HOẶC",
  "login.google_soon": "Tiếp tục với Google",
  "login.coming_soon": "SOON",
  "login.terms_consent": "Bằng việc đăng nhập, bạn đồng ý với",

  // ── Forms ───────────────────────────────────────────────────────────
  "form.email_placeholder": "name@example.com",
  "form.password_placeholder": "Tối thiểu 8 ký tự",
  "form.show_password": "Hiện mật khẩu",
  "form.hide_password": "Ẩn mật khẩu",
};

const EN: Dict = {
  // Navigation
  "nav.home": "Home",
  "nav.upload": "Upload",
  "nav.browse": "Browse",
  "nav.qa": "Q&A",
  "nav.history": "History",
  "nav.notifications": "Notifications",
  "nav.profile": "Profile",
  "nav.login": "Sign in",
  "nav.register": "Sign up",
  "nav.logout": "Sign out",
  "nav.library": "Library",
  "nav.forum": "Forum",

  // Forum
  "forum.title": "Community forum",
  "forum.subtitle": "Ask, share, and recommend manga with the StoryLens community.",
  "forum.new_thread": "New thread",
  "forum.all_categories": "All",
  "forum.category.discussion": "Discussion",
  "forum.category.qna": "Q&A",
  "forum.category.recommend": "Recommendations",
  "forum.category.feedback": "Feedback",
  "forum.category.announcement": "Announcements",
  "forum.sort.hot": "Hot",
  "forum.sort.top": "Top",
  "forum.sort.new": "New",
  "forum.search_placeholder": "Search by title...",
  "forum.empty": "No threads here yet.",
  "forum.pinned": "Pinned",
  "forum.locked": "Locked",
  "forum.replies": "replies",
  "forum.by": "by",
  "forum.reply": "Reply",
  "forum.reply_to": "Replying to",
  "forum.reply_placeholder": "Write your reply...",
  "forum.reply_submit": "Send",
  "forum.mention_hint": "Tip: use @username to mention someone — they'll get a notification.",
  "forum.title_label": "Title",
  "forum.title_placeholder": "A short, clear topic",
  "forum.body_label": "Body",
  "forum.body_placeholder": "Details. You can @mention people.",
  "forum.category_label": "Category",
  "forum.upvote": "Upvote",
  "forum.downvote": "Downvote",
  "forum.locked_notice": "This thread is locked — no further replies.",
  "forum.login_required": "You need to sign in to participate.",
  "forum.delete_confirm": "Delete this post?",
  "forum.admin_pin": "Pin",
  "forum.admin_unpin": "Unpin",
  "forum.admin_lock": "Lock",
  "forum.admin_unlock": "Unlock",
  "forum.back_to_list": "Back to list",
  "forum.attach.label": "Attach images / videos",
  "forum.attach.add": "Choose files",
  "forum.attach.hint": "Drag & drop or click. Images up to 10MB, videos up to 50MB. Max 10 files.",
  "forum.attach.too_large_image": "Image exceeds 10MB.",
  "forum.attach.too_large_video": "Video exceeds 50MB.",
  "forum.attach.unsupported": "Unsupported file type. Use JPG/PNG/WebP/GIF or MP4/WebM.",
  "forum.attach.over_limit": "Max 10 files per post.",

  // Common
  "common.search": "Search",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.confirm": "Confirm",
  "common.back": "Back",
  "common.next": "Next",
  "common.continue": "Continue",
  "common.loading": "Loading...",
  "common.error_generic": "Something went wrong. Please try again.",
  "common.retry": "Retry",
  "common.close": "Close",
  "common.email": "Email",
  "common.password": "Password",
  "common.username": "Username",

  // Hero
  "hero.tagline": "BREAKING LANGUAGE BARRIERS · STORYLENS VOL. 1",
  "hero.title.line1": "READ MANGA,",
  "hero.title.line2": "WITHOUT",
  "hero.title.line3": "barriers.",
  "hero.subtitle":
    "Translations preserve pacing, character voice, and authorial tone — context-aware AI trained on the entire chapter.",
  "hero.cta_start": "Get started",
  "hero.cta_qa": "Try Q&A",

  // Login
  "login.section": "STORYLENS ACCOUNT · LOGIN",
  "login.title": "Welcome back",
  "login.no_account": "Don't have an account?",
  "login.forgot": "Forgot password?",
  "login.submit": "Sign in",
  "login.submitting": "Signing in...",
  "login.or": "OR",
  "login.google_soon": "Continue with Google",
  "login.coming_soon": "SOON",
  "login.terms_consent": "By signing in you agree to our",

  // Forms
  "form.email_placeholder": "name@example.com",
  "form.password_placeholder": "Minimum 8 characters",
  "form.show_password": "Show password",
  "form.hide_password": "Hide password",
};

const DICTS: Record<Locale, Dict> = { vi: VI, en: EN };
const STORAGE_KEY = "storylens.locale";

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const Ctx = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "vi" || saved === "en") setLocaleState(saved);
    } catch { /* ignore */ }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    if (typeof document !== "undefined") document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: string, fallback?: string) => {
    return DICTS[locale][key] ?? fallback ?? key;
  }, [locale]);

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
