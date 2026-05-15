export const PLAN_COLORS: Record<string, string> = {
  free:    "var(--muted)",
  basic:   "#2563eb",
  pro:     "#7c3aed",
  premium: "#d97706",
};

export const PLAN_LABELS: Record<string, string> = {
  free:    "FREE",
  basic:   "BASIC",
  pro:     "PRO",
  premium: "PREMIUM",
};

export const LANG_NAMES: Record<string, string> = {
  CHS: "Chinese (Simplified)",
  CHT: "Chinese (Traditional)",
  CSY: "Czech",
  NLD: "Dutch",
  ENG: "English",
  FRA: "French",
  DEU: "German",
  HUN: "Hungarian",
  ITA: "Italian",
  JPN: "Japanese",
  KOR: "Korean",
  POL: "Polish",
  PTB: "Portuguese (Brazil)",
  ROM: "Romanian",
  RUS: "Russian",
  ESP: "Spanish",
  TRK: "Turkish",
  UKR: "Ukrainian",
  VIN: "Vietnamese",
  ARA: "Arabic",
  CNR: "Montenegrin",
  SRP: "Serbian",
  HRV: "Croatian",
  THA: "Thai",
  IND: "Indonesian",
  FIL: "Filipino (Tagalog)",
};

export const STATUS_META = {
  pending:      { label: "Đang chờ",   tone: "processing" as const, color: "var(--muted)" },
  ocr_running:  { label: "Đang OCR",   tone: "processing" as const, color: "var(--accent)" },
  translating:  { label: "Đang dịch",  tone: "processing" as const, color: "var(--accent)" },
  translated:   { label: "Đã dịch",    tone: "ready"      as const, color: "var(--jade)" },
  completed:    { label: "Hoàn tất",   tone: "ready"      as const, color: "var(--jade)" },
  ocr_failed:   { label: "Lỗi OCR",    tone: "failed"     as const, color: "var(--accent)" },
  failed:       { label: "Thất bại",   tone: "failed"     as const, color: "var(--accent)" },
  error:        { label: "Lỗi",        tone: "failed"     as const, color: "var(--accent)" },
} as const;

export const STORAGE_KEYS = {
  BOOKMARKS:     "sl-bookmarks",
  RATINGS:       "sl-ratings",
  READING_LISTS: "sl-reading-lists",
  GOALS:         "sl-goals",
  PAGES_READ:    "sl-pages-read",
  MINUTES:       "sl-minutes",
  ACHIEVEMENTS:  "sl-achievements",
} as const;

export const FILE_LIMITS = {
  IMAGE_MAX_BYTES:      20 * 1024 * 1024,
  PDF_MAX_BYTES:        100 * 1024 * 1024,
  PDF_RENDER_MAX_WIDTH: 2200,
  PDF_RENDER_MAX_HEIGHT: 3200,
  PDF_RENDER_QUALITY:   0.92,
} as const;

export const ANIMATION_EASING = {
  STANDARD: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number],
  BOUNCY:   [0.34, 1.56, 0.64, 1]    as [number, number, number, number],
} as const;

export const VIEWPORT_MARGIN = "-50px";

export const TOAST_CONFIG = {
  DEFAULT_DURATION: 4000,
  MAX_QUEUE: 5,
} as const;
