# StoryLens — Phần mềm hoạt động (PA3)

**Nhóm 1 – StoryLens · CSC10011 – Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo**
GVHD: GS.TS Nguyễn Văn Vũ

StoryLens là một web app **đang chạy thật (production)** cho phép người dùng tải lên trang/chương
manga, tự động **phát hiện – đọc – xoá nền – dịch** bong bóng thoại (Nhật/Trung → Việt) có ngữ cảnh,
rồi hiển thị bản dịch dạng **overlay** phục vụ đọc liền mạch.

---

## 1. Liên kết & tài khoản demo

| Hạng mục | Giá trị |
| --- | --- |
| Frontend (Vercel) | Next.js 16 — chạy local: `npm run dev` → http://localhost:3000 |
| Backend (Render) | https://storylens-api.onrender.com — health: `/health` |
| AI Module (HF Spaces) | https://huynhtrungkiet09032005-ai-storylen.hf.space |
| Tài khoản demo | `demo.pa3@storylens.app` / `StoryLens#PA3demo` (đã có sẵn series mẫu) |

> **Lưu ý khi demo dịch:** AI Module trên HuggingFace Spaces có thể "ngủ" (free tier) — truy cập URL
> Space một lần để đánh thức. Nếu upload báo lỗi `ai_module returned HTTP 404`, vào **Admin → AI module
> source** đặt lại URL nguồn về Space đang sống (hoặc chạy AI Module local), vì URL nguồn được cấu hình
> động trong DB.

---

## 2. Hai luồng use-case chính được demo (yêu cầu ≥ 2)

### Luồng A — UC01 + UC02: Upload → Dịch → Đọc overlay
1. Đăng nhập → vào **Upload**, kéo-thả 1 trang manga tiếng Nhật.
2. Backend nhận file → lưu Supabase Storage → gọi AI Module:
   **YOLOv8** phát hiện bong bóng → **manga-ocr** đọc chữ Nhật → **LaMa** xoá chữ gốc →
   **Gemini** dịch ngữ cảnh → render chữ Việt vào bbox.
3. Tiến trình hiển thị realtime qua **WebSocket**; xong thì mở **Reader** hiển thị bản dịch overlay.

### Luồng B — UC03: Batch upload cả chương
1. Vào **Upload**, chọn nhiều trang (cả một chương) → kiểm tra thứ tự → **Bắt đầu xử lý**.
2. Backend tạo **batch job**, xử lý **tuần tự** từng trang qua pipeline AI (semaphore-limited);
   tiến trình **x/N trang** cập nhật realtime qua **WebSocket** (có fallback polling).
3. Xong → mở **Reader** đọc cả chương; có thể **xuất bản** lên thư viện công khai cho người khác đọc.

---

## 3. Các tính năng đã hiện thực

**AI pipeline & nội dung**
- Upload 1 ảnh hoặc **batch cả chương** (xử lý tuần tự, semaphore, idempotency-key).
- Pipeline dịch: detection (YOLOv8) → OCR (manga-ocr fine-tuned) → inpaint (LaMa) → dịch (Gemini, fallback M2M100/NLLB) → render chữ Việt (binary-search cỡ chữ).
- **Reader** overlay: bật/tắt dịch, copy text gốc/dịch, nhiều chế độ đọc (1 trang / 2 trang / cuộn dọc / webtoon), phím tắt, vuốt trên mobile, cảnh báo bong bóng độ tin cậy thấp, từ điển bong bóng (Gemini).
- **Studio QC**: hiệu đính per-bubble (approve/reject), tìm–thay thế hàng loạt; phản hồi dịch 👍/👎.

**Tài khoản, dữ liệu, cộng đồng**
- Supabase **Auth** qua cookie HttpOnly; quên/đặt lại mật khẩu; đổi email/mật khẩu; **GDPR** export/xoá tài khoản; Google OAuth; captcha Turnstile.
- **Series/Chapter/Page** + lịch sử + **tiếp tục đọc** (resume); **thư viện công khai** (publish) đọc ẩn danh; **chia sẻ link** (TTL) + OG image.
- **Credits** theo gói (free 5/ngày, reset 00:00 giờ VN) + **Stripe** checkout/webhook; **điểm danh** + streak.
- **Gamification (Wibu)**: bookmark, rating, reading list, mục tiêu đọc, XP/level, **thành tựu** + thông báo.
- **Thông báo** in-app, **diễn đàn** (mention/đính kèm/bình chứng), **bình luận chương**, hồ sơ công khai `/u/{username}`.
- **MangaDex**: duyệt/đọc/nhập chương.

**Hạ tầng & chất lượng**
- 3 dịch vụ triển khai độc lập (Vercel / Render / HF Spaces) + Supabase (PostgreSQL, Auth, Storage).
- WebSocket tiến trình + **event bus** phát lại sự kiện; **huỷ tác vụ** hợp tác (cancel).
- Rate-limit (slowapi), **security headers + CSP**, RLS, **Sentry + OpenTelemetry**, **PWA** + offline.
- **CI** (GitHub Actions): typecheck, lint, build, Playwright E2E, pytest. Test: Vitest + RTL + Playwright + pytest(respx).

---

## 4. Mô hình ML & kết quả đánh giá ban đầu

| Mô hình | Nhiệm vụ | Dữ liệu | Kết quả test / ngưỡng |
| --- | --- | --- | --- |
| YOLOv8 (manga_yolo) | Phát hiện bong bóng | Manga109-s, 956 ảnh / 14.130 box | **mAP@0.5 = 95.3% · mAP@0.5:0.95 = 84.4% · P 97.3% · R 93.8%** (vượt ngưỡng 0.85) |
| manga-ocr (fine-tuned) | OCR tiếng Nhật | Manga109-s, 14.130 mẫu test | **CER 6.1% · Char-Acc 93.9% · Exact 67.5%** (đạt ngưỡng) |
| Gemini 2.5 Flash | Dịch ngữ cảnh sang tiếng Việt | — | 👍 ≥ 80% (human-in-the-loop) |

Chi tiết dữ liệu, độ đo, triển khai tĩnh/động và quy trình tái huấn luyện: xem **SAD v2.0, Mục 7**.

---

## 5. Hạn chế (Limitations)

- **Cold start**: Render Free & HF Spaces ngủ sau thời gian rảnh → lần đầu có thể chậm 15–60s (đã có keep-alive ping cho backend).
- **Quota Gemini**: free tier giới hạn RPD → dùng key-rotation + client-side throttle + cache; lúc cao điểm dịch có thể bị giới hạn.
- **OCR với chữ hiệu ứng/viết tay (SFX)**: độ chính xác giảm; bong bóng SFX có thể bị bỏ qua.
- **Bố cục chữ Việt dài**: một số bong bóng nhỏ phải thu nhỏ cỡ chữ / cắt bớt (có tooltip đầy đủ).
- **Nguồn AI Module cấu hình động**: nếu URL nguồn trong Admin trỏ sai/cũ, upload sẽ lỗi 404 (xem mục 1).
- **Manga đọc phải-sang-trái**: thứ tự bong bóng phức tạp có thể chưa tối ưu trong vài bố cục.

## 6. Lỗi đã biết (Known defects)

- Khi token phiên hết hạn giữa chừng, một số trang cần tải lại để refresh cookie (đang hoàn thiện auto-refresh).
- WebSocket tiến trình thỉnh thoảng mất gói khi mạng chập chờn → fallback polling, đôi khi tiến trình "nhảy" %.
- URL ký (signed URL) ảnh Supabase có thể hết hạn với phiên đọc rất dài → đã thêm retry tải ảnh, nhưng hiếm khi cần refresh thủ công.
- Trên một số thiết bị mobile cũ, nền anime động có thể gây tụt FPS (có thể tắt hiệu ứng trong cài đặt).

---

## 7. Cách chạy nhanh (tóm tắt)

```powershell
# Backend (local)
cd backend
python -m venv .venv ; .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # điền secrets (Supabase, Gemini, AI_MODULE_URL)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend (local)
cd frontend
npm install
# tạo .env.local: NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/v1 (hoặc trỏ Render)
npm run dev    # http://localhost:3000
```

> Không bắt buộc chạy AI Module local (ảnh ~4GB). Có thể trỏ `AI_MODULE_URL` về HuggingFace Space.

## 8. Video demo

Video demo (2–3 phút) minh hoạ **2 luồng chính** (Upload→Dịch→Đọc overlay và Batch upload cả chương)
được đính kèm trong thư mục nộp bài: `demo_video.mp4`.
