# StoryLens — UI Design Evaluation (LN09)

> **Mục đích:** chấm UI của StoryLens theo khung LN09 — **7 nguyên tắc thiết kế** + **5 chiều
> usability** — với **bằng chứng từ code/UX thật** (design language sharp/editorial, 3 theme, i18n,
> reader shortcuts…). Nguồn: `frontend/src/app/*`, `components/*`, `contexts/{I18nContext,WibuContext}`,
> `app/globals.css`, `frontend/AGENTS.md`.

---

## 1. Bảy nguyên tắc thiết kế UI (LN09)

| # | Nguyên tắc | Hiện thực trong StoryLens | Điểm tự chấm |
|---|---|---|---|
| 1 | **User familiarity** (thuật ngữ/quy ước quen) | Ngôn ngữ manga/wibu quen thuộc (chương, bong bóng, "Nghe truyện", "Tiếp tục đọc"); icon phổ biến (★ bookmark, 🔊 nghe) | ✅ |
| 2 | **Consistency** (nhất quán) | **Design system tường minh**: sharp corners (`--radius-sm=2px`), hard offset shadow (`panel-shadow`), 2px border, `caps-xs` cho label — áp **toàn app**; mọi call API qua **1** wrapper `lib/api.ts` | ✅ Mạnh |
| 3 | **Minimal surprise** (ít bất ngờ) | Cùng loại nút → cùng hành vi; trạng thái xử lý hiện qua WebSocket + polling fallback, không "đứng hình" bí ẩn | ✅ |
| 4 | **Recoverability** (khôi phục được) | **Soft‑delete** ảnh gốc (versioning 30 ngày), **confirm modal** trước hành động nguy hiểm (xoá tài khoản yêu cầu gõ đúng câu), Q&A/dịch có bản lịch sử (`translation_history`) để hoàn tác | ✅ Mạnh |
| 5 | **User guidance** (hướng dẫn/hỗ trợ) | **OnboardingOverlay** lần đầu, tooltip trên nút, thông báo lỗi **tiếng Việt rõ ràng** (không lộ traceback), Bubble Dictionary giải nghĩa | ✅ |
| 6 | **User diversity** (đa dạng người dùng) | **i18n VI/EN** (`I18nContext`), **3 theme** light/dark/sepia, **PWA** + mobile drawer (`mobile.spec.ts`), keyboard shortcuts cho power‑user | ✅ Mạnh |
| 7 | **Prevent errors** (ngăn lỗi) | Validate ảnh (MIME/size) **trước** khi xử lý; nút disable khi thiếu điều kiện (không đủ credit, chưa chọn giọng); rate‑limit + captcha chống lạm dụng | ✅ |

**Tổng:** 7/7 nguyên tắc đều có hiện thực; 3 nguyên tắc *mạnh* (Consistency, Recoverability, User diversity).

---

## 2. Năm chiều usability (LN09)

| Chiều | StoryLens | Bằng chứng |
|---|---|---|
| **Learnability** (dễ học) | Metaphor quen (kệ truyện, đọc chương), affordance rõ (nút nổi khối), **recognition‑over‑recall** (menu hiện, không bắt nhớ lệnh), feedback tức thì | Onboarding + design language nhất quán |
| **Efficiency** (nhanh khi thạo) | **Phím tắt reader** (O overlay, +/‑ zoom), **sensible defaults** (giọng/engine mặc định), **ResumeReading** ("Tiếp tục đọc"), auto‑suggestion từ điển | `reader/page.tsx` keymap, `ResumeReading.tsx` |
| **Memorability** (nhớ lại được) | Bố cục ổn định giữa các trang, icon/nhãn không đổi vị trí, ≤ ~7 mục mỗi nhóm menu (tôn trọng short‑term memory) | Layout nhất quán toàn app |
| **Errors** (ít lỗi + phục hồi tốt) | Ngăn (validate, disable) + phục hồi (soft‑delete, confirm, lịch sử) + thông báo lỗi có hướng xử lý | xem NT4 & NT7 |
| **Satisfaction** (hài lòng) | Thẩm mỹ manga‑magazine (editorial), animated wallpaper theo theme, gamification (streak/level/badge) tạo động lực | `AnimatedBackground`, WibuContext |

---

## 3. Nguyên tắc graphic design (LN09) đã áp dụng
- **Simplicity / KISS:** phẳng, không gradient/nút bóng loè; giảm chi tiết thừa.
- **White space & organization:** grid + alignment + proximity (nhóm control theo chức năng).
- **Consistency (internal/external/metaphorical):** biến CSS chung, tuân design token; ẩn dụ "tạp chí manga".
- **Legibility & contrast:** 3 theme đều đảm bảo tương phản; font Nhật (Shippori/Zen) cho không khí.
- **Gestalt:** proximity/similarity để gom nhóm thẻ truyện, bong bóng.

---

## 4. Hoạt động đánh giá UI (theo yêu cầu LN09 "design/revise a main screen")
- **Màn hình chọn để đánh giá:** *Reader* (use case lõi — đọc trang đã dịch).
- **Chấm theo 4 tiêu chí LN09:** Simplicity ✅ · White‑space hợp lý ✅ · Grouping đúng (toolbar zoom/bookmark/nghe/export gom 1 hàng) ✅ · Easy‑to‑learn‑and‑use ✅ (phím tắt + tooltip).
- **Deliverable:** `ui_prototype.docx` (6 màn hình) + app live = *UI design + interface specification*.

> Khuyến nghị: dán bảng §1 và §2 vào báo cáo phần *UI Design* (hoặc SAD mục f‑UI) để có phần chấm
> theo khung LN09 tường minh (trước đây chỉ có prototype, chưa có bảng đối chiếu nguyên tắc).
