# -*- coding: utf-8 -*-
"""Build StoryLens revised SAD (PA3) -> rup_sad_v2.docx"""
import os
from _doc import *

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "rup_sad_v2.docx")
DEPLOY_IMG = os.path.join(HERE, "deployment_diagram.png")
UC_IMG = os.path.join(HERE, "usecase_diagram.png")

doc = new_doc()

# ============================== TITLE PAGE ==============================
P(doc, "TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN – ĐHQG TP.HCM", bold=True, align="center", size=13, after=2)
P(doc, "KHOA CÔNG NGHỆ THÔNG TIN", bold=True, align="center", size=13, after=2)
P(doc, "CSC10011 – Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo", italic=True, align="center", size=12, after=30)
for _ in range(2): doc.add_paragraph()
P(doc, "TÀI LIỆU KIẾN TRÚC PHẦN MỀM", bold=True, align="center", size=24, after=4, color=NAVY)
P(doc, "(Software Architecture Document – SAD)", italic=True, align="center", size=14, after=10, color=GREY)
P(doc, "STORYLENS", bold=True, align="center", size=30, after=2, color=ACCENT)
P(doc, "Nền tảng AI đọc & dịch manga đa ngôn ngữ có ngữ cảnh", italic=True, align="center", size=12.5, after=40)
for _ in range(2): doc.add_paragraph()
P(doc, "Phiên bản 2.0 — PA3", bold=True, align="center", size=13, after=2)
P(doc, "Nhóm 1 – StoryLens", bold=True, align="center", size=13, after=2)
P(doc, "GVHD: GS.TS Nguyễn Văn Vũ", align="center", size=12, after=2)
P(doc, "TP. Hồ Chí Minh, tháng 06 năm 2026", italic=True, align="center", size=12, after=2)
page_break(doc)

# ============================== MEMBERS + REVISION ==============================
H1(doc, "Thông tin nhóm")
table(doc, ["STT", "Họ và tên", "MSSV", "Vai trò chính"], [
    ["1", "Đào Sỹ Duy Minh", "23122041", "Kiến trúc hệ thống, Supabase schema, Admin"],
    ["2", "Nguyễn Đình Hà Dương", "23122002", "Frontend, Auth, bảo mật API"],
    ["3", "Phạm Phú Hòa", "23122030", "Backend auth/history, tích hợp Gemini"],
    ["4", "Huỳnh Trung Kiệt", "23122039", "Backend FastAPI, pipeline, ML training"],
    ["5", "Trần Chí Nguyên", "23122044", "Frontend Reader/UX, thiết kế UI"],
    ["6", "Nguyễn Lâm Phú Quý", "23122048", "AI Module, pipeline dịch, ai_module client"],
], widths=[0.5, 2.6, 1.1, 3.1])

H1(doc, "Lịch sử chỉnh sửa (Revision History)")
table(doc, ["Ngày", "Phiên bản", "Mô tả", "Tác giả"], [
    ["15/05/2026", "1.0", "Phiên bản đầu tiên của SAD (PA2).", "Nhóm 1"],
    ["02/06/2026", "2.0",
     "Bản hiệu chỉnh PA3: cập nhật Mục 1–4 theo kiến trúc thực tế (Supabase, "
     "manga-ocr fine-tune, xác thực HTTP-only cookie, credits, thư viện công khai); "
     "bổ sung Mục 5 (Deployment) + Mục 6 (Implementation View) + Mục 7 (triển khai & "
     "đánh giá mô hình ML).", "Nhóm 1"],
], widths=[1.1, 0.9, 4.0, 1.3])
page_break(doc)

# ============================== TOC (manual) ==============================
H1(doc, "Mục lục")
for line in [
    "1. Giới thiệu (Introduction)",
    "2. Mục tiêu & Ràng buộc kiến trúc (Architectural Goals and Constraints)",
    "3. Mô hình Use-Case (Use-Case Model)",
    "4. Khung nhìn Logic (Logical View)",
    "5. Khung nhìn Triển khai (Deployment View)",
    "6. Khung nhìn Hiện thực (Implementation View)",
    "7. Mô hình ML: Triển khai, Huấn luyện & Đánh giá",
]:
    P(doc, line, size=12, after=3)
P(doc, "(Mục lục tự động: trong MS Word chọn References ▸ Table of Contents để cập nhật số trang.)",
  italic=True, size=10.5, color=GREY)
page_break(doc)

# ============================== 1. INTRODUCTION ==============================
H1(doc, "1. Giới thiệu (Introduction)")

H2(doc, "1.1. Mục đích")
P(doc, "Tài liệu Kiến trúc Phần mềm (SAD) mô tả các quyết định kiến trúc quan trọng của hệ thống "
       "StoryLens — nền tảng web ứng dụng AI cho phép người dùng tải lên trang/chương manga, tự động "
       "phát hiện và dịch bong bóng thoại (Nhật/Trung → Việt) có ngữ cảnh, rồi hiển thị bản dịch dạng "
       "overlay phục vụ đọc liền mạch. "
       "Tài liệu trình bày kiến trúc qua nhiều khung nhìn (logic, triển khai, hiện thực) nhằm làm cơ sở "
       "thống nhất cho việc phát triển, kiểm thử, triển khai và bảo trì.", align="justify")

H2(doc, "1.2. Phạm vi")
P(doc, "SAD áp dụng cho toàn bộ hệ thống StoryLens gồm ba dịch vụ triển khai độc lập: (1) Frontend "
       "Next.js, (2) Backend FastAPI, và (3) AI Module (dịch vụ ML nặng). Tài liệu bao quát kiến trúc "
       "tổng thể, các thành phần chính, thiết kế cơ sở dữ liệu, các mô hình học máy được sử dụng, cách "
       "triển khai trên hạ tầng đám mây miễn phí, và quy trình huấn luyện–đánh giá–tái triển khai mô hình.", align="justify")

H2(doc, "1.3. Định nghĩa, từ viết tắt")
table(doc, ["Thuật ngữ", "Ý nghĩa"], [
    ["OCR", "Optical Character Recognition — nhận dạng ký tự quang học (đọc chữ trong bong bóng)."],
    ["YOLOv8", "You Only Look Once v8 — mô hình phát hiện đối tượng 1 giai đoạn (phát hiện bong bóng)."],
    ["manga-ocr", "Mô hình OCR Vision-Encoder-Decoder chuyên cho chữ Nhật trong manga (kha-white/manga-ocr-base)."],
    ["LaMa", "Large Mask Inpainting — mô hình xoá/điền nền sau khi gỡ chữ gốc (inpainting)."],
    ["LLM", "Large Language Model — mô hình ngôn ngữ lớn (Google Gemini) dùng để dịch ngữ cảnh."],
    ["bbox", "Bounding box — toạ độ khung chữ nhật bao quanh vùng chữ/bong bóng."],
    ["CER", "Character Error Rate — tỉ lệ lỗi ký tự của OCR (càng thấp càng tốt)."],
    ["mAP", "mean Average Precision — độ đo chính xác trung bình cho bài toán phát hiện đối tượng."],
    ["PWA", "Progressive Web App — ứng dụng web cài đặt được, hỗ trợ offline."],
], widths=[1.2, 5.3])

H2(doc, "1.4. Tài liệu tham khảo")
bullet(doc, "Vision Document (rup_vision_sp_vn_v2) và Use-Case Specification (run_ucspec_v1) — PA2.")
bullet(doc, "Software Development Plan (rup_sdpln_sp) và SRS — PA1/PA2.")
bullet(doc, "Mã nguồn dự án: kho Git StoryLens (frontend/, backend/, ai_module/), tài liệu CLAUDE.md.")
bullet(doc, "Manga109-s dataset (Aizawa Lab, Univ. of Tokyo) — dữ liệu huấn luyện mô hình phát hiện & OCR.")

H2(doc, "1.5. Tổng quan tài liệu")
P(doc, "Mục 2 trình bày mục tiêu và ràng buộc kiến trúc. Mục 3 mô tả mô hình use-case. Mục 4 phân tích "
       "khung nhìn logic (các thành phần, CSDL, mô hình ML). Mục 5 và 6 — nội dung mới của PA3 — lần lượt "
       "trình bày sơ đồ triển khai (deployment) và cấu trúc thư mục mã nguồn. Mục 7 trình bày chi tiết "
       "cách các mô hình ML được triển khai, huấn luyện lại, đánh giá và tái triển khai.", align="justify")
page_break(doc)

# ============================== 2. GOALS & CONSTRAINTS ==============================
H1(doc, "2. Mục tiêu & Ràng buộc kiến trúc")
P(doc, "So với PA2, kiến trúc đã được hiện thực hoá đầy đủ và một số lựa chọn công nghệ được điều chỉnh "
       "theo thực tế triển khai (đánh dấu “cập nhật”).", italic=True, color=GREY, size=11)

H2(doc, "2.1. Mục tiêu kiến trúc")
bullet(doc, "kiến trúc tách dịch vụ (service-oriented): frontend, backend và ai_module triển khai độc lập, "
            "cho phép mở rộng/khởi động lại từng phần mà không ảnh hưởng phần còn lại.", bold_lead="Tách dịch vụ — ")
bullet(doc, "Detection/OCR/Inpainting/Translation là các module có thể thay nhà cung cấp (Gemini ⇄ "
            "M2M100/NLLB; YOLO detector cấu hình qua biến môi trường) mà không sửa lõi pipeline.", bold_lead="Pipeline AI mô-đun-hoá — ")
bullet(doc, "mọi lời gọi AI đều có dự phòng: Gemini key-rotation + throttle, fallback dịch sang M2M100/NLLB, "
            "polling thay cho WebSocket khi mất kết nối realtime.", bold_lead="Fallback-first — ")
bullet(doc, "toàn bộ stack chạy trên gói miễn phí (Vercel, Render Free, HuggingFace Spaces, Supabase Free, "
            "Gemini Free, Kaggle GPU cho huấn luyện) — tối ưu chi phí bằng caching, batch và quản lý quota.", bold_lead="Zero-budget — ")
bullet(doc, "xác thực Supabase Auth qua cookie HttpOnly (token không lộ ra JS), RLS ở tầng DB, security "
            "headers + CSP, rate-limit theo người dùng/IP, GDPR self-service (export/xoá tài khoản).", bold_lead="Bảo mật & riêng tư — ")
bullet(doc, "credits theo gói, ý tưởng idempotency-key cho upload, có thể huỷ tác vụ (cancel) hợp tác, "
            "tiến trình realtime qua WebSocket + event bus phát lại sự kiện khi reconnect.", bold_lead="Tin cậy & trải nghiệm — ")

H2(doc, "2.2. Ràng buộc kiến trúc")
table(doc, ["Loại ràng buộc", "Nội dung (đã cập nhật theo thực tế PA3)"], [
    ["Công nghệ bắt buộc",
     "Frontend: Next.js 16 + React 19 + TypeScript (Vercel). Backend: FastAPI + Python 3.11 (Render, Docker). "
     "AI Module: FastAPI + PyTorch (HuggingFace Spaces). CSDL: Supabase PostgreSQL (managed). "
     "LLM: Google Gemini (gemini-2.5-flash) — dùng cho dịch. [Cập nhật: thay Cloud Vision→manga-ocr.]"],
    ["Hiệu năng",
     "OCR+dịch 1 trang mục tiêu < 30 s (phụ thuộc cold-start AI Module); tải trang web < 2 s (Lighthouse)."],
    ["Bảo mật",
     "HTTPS/TLS toàn tuyến; token trong cookie HttpOnly+Secure (SameSite=None khi cross-domain); "
     "API key chỉ ở server; RLS bật trên bảng người dùng; không lưu lộ traceback ở production."],
    ["Hạn mức tài nguyên",
     "Render Free 512 MB RAM (không nạp mô hình ML ở backend); HF Spaces ~4GB image; "
     "Gemini Free ~ giới hạn RPD → bắt buộc key-rotation + client-side throttle + cache."],
    ["Lưu trữ dữ liệu",
     "Ảnh gốc ở bucket riêng tư manga-originals (versioning, soft-delete 30 ngày); ảnh dịch ở manga-thumbnails; "
     "avatar public-read. Kết quả OCR/dịch & bbox lưu trong bảng bubble_data."],
], widths=[1.6, 4.9])
page_break(doc)

# ============================== 3. USE-CASE MODEL ==============================
H1(doc, "3. Mô hình Use-Case (Use-Case Model)")
H2(doc, "3.1. Tác nhân (Actors)")
table(doc, ["Tác nhân", "Mô tả"], [
    ["Khách (Guest)", "Người chưa đăng nhập: xem trang chủ, thư viện công khai, trang chia sẻ (share link)."],
    ["Người dùng đã đăng ký", "Upload & dịch, đọc overlay, xem lịch sử, quản lý credits, hiệu đính bản dịch."],
    ["Content Creator", "Người dùng nâng cao: batch upload cả chương, xuất bản lên thư viện, tham gia diễn đàn."],
    ["Admin", "Quản trị: người dùng, kiểm duyệt nội dung, cấu hình nguồn AI Module, gói/credits, audit log."],
    ["Hệ thống ngoài", "Gemini API (dịch ngữ cảnh) và AI Module (detection/OCR/inpaint/render)."],
], widths=[1.8, 4.7])

H2(doc, "3.2. Sơ đồ Use-Case tổng quát")
figure(doc, UC_IMG, width=6.3, cap="Hình 3.1 — Sơ đồ Use-Case tổng quát của StoryLens.")

H2(doc, "3.3. Các use-case chính")
P(doc, "Bốn use-case cốt lõi được đặc tả chi tiết trong tài liệu Use-Case Specification. Bảng dưới "
       "tóm tắt và liên hệ tới các thành phần hiện thực.", align="justify")
table(doc, ["Mã", "Use-case", "Tác nhân", "Mô tả ngắn"], [
    ["UC01", "Upload & dịch trang manga", "Người dùng", "Tải ảnh JPG/PNG/WebP → pipeline AI phát hiện bong bóng, OCR, inpaint, dịch ngữ cảnh, lưu kết quả."],
    ["UC02", "Xem bản dịch overlay", "Người dùng", "Đọc manga với bản dịch tiếng Việt đè đúng toạ độ bbox; bật/tắt overlay, chỉnh độ trong suốt."],
    ["UC03", "Batch upload cả chương", "Content Creator", "Tải nhiều trang cùng lúc; xử lý tuần tự (semaphore) + tiến trình realtime qua WebSocket."],
    ["UC04", "Xem lịch sử / tiếp tục đọc", "Người dùng", "Xem các series/chương đã xử lý, tiếp tục đọc từ trang gần nhất (resume reading)."],
], widths=[0.6, 1.9, 1.2, 2.8])
P(doc, "Ngoài ra hệ thống còn hiện thực: đăng ký/đăng nhập & GDPR self-service, xuất bản–thư viện công khai, "
       "chia sẻ link, thông báo (notifications), thành tựu (achievements), hiệu đính (Studio QC), diễn đàn, "
       "thanh toán Stripe và bảng điều khiển Admin.", align="justify", size=11.5, color=GREY)
page_break(doc)

# ============================== 4. LOGICAL VIEW ==============================
H1(doc, "4. Khung nhìn Logic (Logical View)")
H2(doc, "4.1. Tổng quan kiến trúc")
P(doc, "StoryLens theo kiến trúc phân tầng 3 lớp triển khai dưới dạng ba dịch vụ độc lập. Lớp trình bày "
       "(Next.js) chạy trên trình duyệt/Vercel; lớp ứng dụng (FastAPI) điều phối nghiệp vụ và gọi AI Module "
       "cùng các dịch vụ ngoài; lớp dữ liệu (Supabase) lưu trữ quan hệ + vector + tệp. Toàn bộ giao tiếp "
       "qua REST/HTTPS, bổ sung WebSocket cho tiến trình realtime.", align="justify")
table(doc, ["Lớp", "Thành phần", "Công nghệ", "Trách nhiệm chính"], [
    ["Presentation", "Frontend Web", "Next.js 16, React 19, Tailwind", "Render UI, overlay bản dịch, gọi API qua lib/api.ts, PWA/offline."],
    ["Application", "Backend API", "FastAPI, Python 3.11", "Xác thực, điều phối pipeline, credits, realtime, rate-limit."],
    ["Application", "AI Module", "FastAPI, PyTorch", "Detection → OCR → Inpaint → Translate → Render."],
    ["Data", "Supabase", "PostgreSQL, Auth, Storage", "Dữ liệu quan hệ, xác thực, lưu trữ ảnh."],
], widths=[1.1, 1.2, 1.6, 2.6])

H2(doc, "4.2. Thành phần: Frontend (Next.js)")
bullet(doc, "Render giao diện: Upload, Reader (overlay), Library, History, Series, Studio QC, Profile, Admin.")
bullet(doc, "Mọi lời gọi backend đi qua src/lib/api.ts (fetch wrapper: retry cold-start, idempotency-key, kiểu trả về).")
bullet(doc, "Trạng thái toàn cục bằng React Context: AuthContext (phiên), WibuContext (gamification), I18nContext (VI/EN).")
bullet(doc, "Nhận tiến trình batch qua WebSocket (/v1/ws/batch/{id}) có fallback polling; PWA + Service Worker cho offline.")

H2(doc, "4.3. Thành phần: Backend API (FastAPI)")
P(doc, "Backend tổ chức theo router (tầng giao tiếp) và service (tầng nghiệp vụ). Nghiệp vụ đặt trong "
       "app/services, không nằm trong hàm router.", align="justify")
bullet(doc, "ai_pipeline.process_page: điều phối upload→AI Module→lưu kết quả; checkpoint huỷ hợp tác (threading.Event).", bold_lead="ai_pipeline — ")
bullet(doc, "credit_service: trừ/kiểm tra credits; pipeline_control: event bus phát lại sự kiện realtime; idempotency.", bold_lead="dịch vụ khác — ")
bullet(doc, "ai_module_client + ai_module_source: gọi /translate/* và quản lý URL nguồn AI Module động qua Admin.", bold_lead="tích hợp AI — ")

H2(doc, "4.4. Thành phần: AI Module (pipeline dịch)")
P(doc, "AI Module là dịch vụ ML đứng riêng (ảnh Docker ~4GB) hiện thực toàn bộ pipeline dịch ảnh manga:", align="justify")
table(doc, ["Bước", "Module", "Mô hình / kỹ thuật", "Đầu ra"], [
    ["1. Detection", "detection", "YOLOv8 (manga_yolo/best.pt)", "Danh sách bbox bong bóng/khối chữ."],
    ["2. OCR", "ocr", "manga-ocr (fine-tuned, safetensors)", "Văn bản tiếng Nhật cho mỗi bbox."],
    ["3. Inpainting", "inpainting", "LaMa (lama_large_512px)", "Ảnh đã xoá chữ gốc, điền nền sạch."],
    ["4. Translation", "translators", "Gemini (mặc định) / M2M100 / NLLB", "Văn bản tiếng Việt theo ngữ cảnh."],
    ["5. Rendering", "rendering", "Vẽ chữ Việt vào bbox (binary-search cỡ chữ)", "Ảnh PNG đã dịch (overlay nung)."],
], widths=[1.3, 1.1, 2.2, 1.9])

H2(doc, "4.5. Thiết kế Cơ sở dữ liệu")
P(doc, "CSDL Supabase PostgreSQL (managed). Các bảng chính:", align="justify")
table(doc, ["Bảng", "Vai trò"], [
    ["profiles", "Hồ sơ người dùng (+ plan_tier, credits_balance, stripe_customer_id, role)."],
    ["manga_series / manga_chapters", "Bộ truyện & chương (chapters.published_at: cờ thư viện công khai)."],
    ["manga_pages", "Từng trang: trạng thái xử lý, URL ảnh gốc & ảnh dịch."],
    ["bubble_data", "bbox, text gốc/dịch, độ tin cậy (confidence), review_status (Studio QC)."],
    ["credit_transactions", "Lịch sử biến động credits theo người dùng."],
    ["notifications / share_links", "Thông báo in-app; link chia sẻ công khai (TTL)."],
    ["user_bookmarks/ratings/reading_*/achievements", "Nhóm bảng gamification (Wibu)."],
    ["app_settings / audit_logs", "Cờ tính năng (Admin); nhật ký kiểm toán."],
], widths=[2.3, 4.2])
P(doc, "Buckets lưu trữ: manga-originals (riêng tư), manga-thumbnails (riêng tư), avatars (public-read).",
  size=11.5, color=GREY)

H2(doc, "4.6. Thiết kế ML (tổng quan)")
P(doc, "Hệ thống sử dụng 4 nhóm mô hình theo pipeline dịch ảnh: (1) YOLOv8 phát hiện bong bóng, "
       "(2) manga-ocr đọc chữ Nhật, (3) LaMa xoá nền, (4) Gemini dịch ngữ cảnh sang tiếng Việt. "
       "Chi tiết triển khai, dữ liệu, độ đo và quy trình huấn luyện–đánh giá–tái triển khai được trình "
       "bày ở Mục 7.", align="justify")
page_break(doc)

# ============================== 5. DEPLOYMENT ==============================
H1(doc, "5. Khung nhìn Triển khai (Deployment View)")
P(doc, "StoryLens là ứng dụng web nên sơ đồ triển khai gồm các nút (node) máy khách (trình duyệt "
       "desktop/mobile) và các nút máy chủ/nền tảng đám mây, kết nối qua Internet bằng HTTPS/WSS. "
       "Mỗi nút lưu trữ (host) một hoặc nhiều thành phần đã mô tả ở Mục 4.", align="justify")
figure(doc, DEPLOY_IMG, width=6.5, cap="Hình 5.1 — Sơ đồ triển khai UML của StoryLens.")

H2(doc, "5.1. Mô tả các nút (nodes)")
table(doc, ["Nút", "Stereotype", "Thành phần được host", "Vai trò"], [
    ["Trình duyệt (desktop/mobile)", "«device»", "StoryLens PWA (HTML/JS/CSS)", "Client: hiển thị UI, overlay; cài đặt PWA, đọc offline; camera upload."],
    ["Vercel (Edge/CDN)", "«execution environment»", "Next.js 16 frontend", "Phục vụ frontend toàn cầu (SSR + static), Service Worker."],
    ["Render (Singapore)", "«execution environment»", "Backend FastAPI (Docker)", "API /v1 + WebSocket: xác thực, pipeline dịch, credits, realtime."],
    ["HuggingFace Spaces", "«execution environment»", "AI Module (Docker ~4GB)", "Inference: YOLOv8→manga-ocr→LaMa→dịch→render."],
    ["Supabase Cloud", "«execution environment»", "PostgreSQL, Auth, Storage", "Dữ liệu quan hệ, xác thực JWT, lưu trữ ảnh."],
    ["Google Gemini API", "«external service»", "gemini-2.5-flash", "Dịch ngữ cảnh bong bóng thoại sang tiếng Việt."],
    ["Stripe API", "«external service»", "Checkout + Webhook", "Thanh toán nâng cấp gói trả phí."],
    ["MangaDex API", "«external service»", "Browse/Import", "Nguồn truyện tuỳ chọn để duyệt/nhập."],
    ["Kaggle GPU (T4/P100)", "«execution environment»", "Notebook huấn luyện", "Huấn luyện/fine-tune mô hình offline rồi đẩy trọng số lên HF Hub."],
], widths=[1.5, 1.4, 1.8, 1.8])

H2(doc, "5.2. Giao thức kết nối")
bullet(doc, "Trình duyệt ⇄ Vercel: HTTPS (tải web/PWA). Trình duyệt ⇄ Render: HTTPS REST /v1 + WSS (tiến trình).")
bullet(doc, "Render → Supabase: HTTPS (PostgREST/Auth/Storage). Render → HF Spaces: HTTPS REST (/translate/*).")
bullet(doc, "Render → Gemini/Stripe/MangaDex: HTTPS (Stripe có thêm webhook đến backend). HF Spaces → Gemini: HTTPS.")
bullet(doc, "Kaggle ⇢ HF Spaces: kênh triển khai mô hình offline→online (đẩy best.pt / safetensors lên HF Hub).")
page_break(doc)

# ============================== 6. IMPLEMENTATION VIEW ==============================
H1(doc, "6. Khung nhìn Hiện thực (Implementation View)")
P(doc, "Mục này trình bày cấu trúc thư mục mã nguồn cho từng dịch vụ (chỉ liệt kê các thư mục/tệp chính).", align="justify")

H2(doc, "6.1. Cấu trúc kho mã (repository)")
code_block(doc,
"storylen/\n"
"├── frontend/            # Web app Next.js 16 (triển khai Vercel)\n"
"├── backend/             # API FastAPI (triển khai Render, Docker)\n"
"├── ai_module/           # Dịch vụ ML nặng (triển khai HuggingFace Spaces)\n"
"├── docs/                # SAD, SRS, API spec, DB schema, báo cáo PA\n"
"├── supabase/            # Cấu hình & migration Supabase\n"
"├── render.yaml          # IaC triển khai backend (Render)\n"
"├── README.md  CLAUDE.md\n"
"└── .github/workflows/   # CI: typecheck, lint, build, Playwright, pytest")

H2(doc, "6.2. Frontend")
code_block(doc,
"frontend/\n"
"├── src/\n"
"│   ├── app/             # App Router (mỗi thư mục = 1 route):\n"
"│   │                    #   login, register, upload, reader, library,\n"
"│   │                    #   history, series, studio, review, share,\n"
"│   │                    #   notifications, profile, settings, plans, forum,\n"
"│   │                    #   bookmarks, stats, u/[username], admin/...\n"
"│   ├── components/      # TopBar, AnimatedBackground, NotificationBell,\n"
"│   │                    #   MangaPage, CreditBadge, TranslationFeedback...\n"
"│   ├── contexts/        # AuthContext, WibuContext, I18nContext\n"
"│   └── lib/             # api.ts (fetch wrapper), wallpaper-playlists.ts\n"
"├── e2e/                 # Playwright E2E (auth, home, mobile, edge-cases)\n"
"├── __tests__/           # Vitest + React Testing Library\n"
"├── public/              # wallpapers/, images/, manifest, service-worker\n"
"├── next.config.ts  package.json  playwright.config.ts  tsconfig.json")

H2(doc, "6.3. Backend")
code_block(doc,
"backend/\n"
"├── app/\n"
"│   ├── main.py          # Khởi tạo FastAPI, middleware, đăng ký router\n"
"│   ├── config.py        # Pydantic Settings — toàn bộ biến môi trường\n"
"│   ├── database.py      # Supabase client (singleton)\n"
"│   ├── middleware.py    # RequestID, BodySizeLimit, SecurityHeaders/CSP\n"
"│   ├── rate_limit.py  observability.py  i18n.py\n"
"│   ├── routers/         # auth, upload, pages, status, history, series,\n"
"│   │                    #   credits, library, share, notifications,\n"
"│   │                    #   payments, wibu, comments, forum, mangadex,\n"
"│   │                    #   scrape, ai_module, ws, admin/\n"
"│   ├── services/        # ai_pipeline, ai_module_client, credit_service,\n"
"│   │                    #   pipeline_control, achievements, idempotency,\n"
"│   │                    #   image_validation, captcha, dictionary, scraper\n"
"│   ├── models/schemas.py        # Pydantic request/response\n"
"│   ├── storage/supabase_storage.py\n"
"│   └── scripts/apply_migrations.py\n"
"├── supabase_migration*.sql  # base, credits, series, studio, wibu, admin, v2, v3\n"
"├── tests/   Dockerfile   requirements.txt   render.yaml")

H2(doc, "6.4. AI Module")
code_block(doc,
"ai_module/\n"
"├── main.py              # Điểm vào dịch vụ (FastAPI + hàng đợi)\n"
"├── server/              # main, instance, myqueue, streaming, request_extraction\n"
"├── manga_translator/    # LÕI pipeline dịch:\n"
"│   ├── detection/       #   phát hiện bong bóng (YOLOv8 / MangaYolo)\n"
"│   ├── ocr/             #   manga-ocr (Vision-Encoder-Decoder)\n"
"│   ├── inpainting/      #   LaMa (xoá chữ gốc, điền nền)\n"
"│   ├── translators/     #   Gemini / M2M100 / NLLB\n"
"│   ├── rendering/       #   vẽ chữ Việt vào bbox (binary-search cỡ chữ)\n"
"│   ├── textline_merge/  mask_refinement/  upscaling/  colorization/\n"
"│   └── manga_translator.py  config.py  args.py\n"
"├── models/              # Trọng số: manga_yolo/best.pt, manga_ocr/weights/,\n"
"│                        #   inpainting/lama_large_512px.ckpt, translators/\n"
"├── training/manga109/   # 01_parse_visualize, 02_convert_to_yolo, 03_train_ocr\n"
"├── fonts/  dict/  result/  run_kaggle.py  Dockerfile  requirements.txt")
page_break(doc)

# ============================== 7. ML DEPLOY/TRAIN/EVAL ==============================
H1(doc, "7. Mô hình ML: Triển khai, Huấn luyện & Đánh giá")

H2(doc, "7.1. Các mô hình và vai trò")
table(doc, ["Mô hình", "Nhiệm vụ", "Nguồn gốc", "Nơi chạy"], [
    ["YOLOv8 (manga_yolo)", "Phát hiện bong bóng/khối chữ", "yolov8n fine-tune trên Manga109-s", "AI Module (HF Spaces) / Kaggle khi train"],
    ["manga-ocr (fine-tuned)", "OCR tiếng Nhật", "kha-white/manga-ocr-base fine-tune", "AI Module (HF Spaces)"],
    ["LaMa (lama_large)", "Inpainting xoá chữ gốc", "Pretrained (đóng băng)", "AI Module (HF Spaces)"],
    ["Gemini 2.5 Flash", "Dịch ngữ cảnh sang tiếng Việt", "API Google (managed)", "Gọi runtime (dịch) từ AI Module"],
], widths=[1.5, 1.8, 1.9, 1.6])

H2(doc, "7.2. Cách triển khai: tĩnh hay động?")
P(doc, "Hệ thống kết hợp cả hai kiểu triển khai:", align="justify")
bullet(doc, "YOLOv8, manga-ocr và LaMa được nạp trọng số MỘT LẦN khi container AI Module khởi động "
            "(load-at-startup) và giữ trong bộ nhớ suốt vòng đời tiến trình; trọng số đóng gói trong "
            "image Docker / mount từ thư mục models/ (hoặc HF Hub). Trong runtime, các trọng số này "
            "KHÔNG đổi — đây là triển khai tĩnh, ưu tiên độ trễ inference ổn định.", bold_lead="Triển khai TĨNH (statically deployed): ")
bullet(doc, "Lựa chọn nhà cung cấp dịch (Gemini ⇄ M2M100/NLLB) và các tham số detector/OCR/inpainter/renderer "
            "được chọn lúc chạy qua biến môi trường AI_MODULE_* / cấu hình request. Nguồn AI Module (URL) "
            "cấu hình động qua bảng Admin (ai_module_source) — có thể trỏ sang một Space khác hoặc tunnel "
            "Kaggle GPU mà không build lại. Gemini là dịch vụ API động (gọi theo yêu cầu, key-rotation).", bold_lead="Triển khai ĐỘNG (dynamically configured): ")
bullet(doc, "Backend (Render Free, 512MB) KHÔNG nạp bất kỳ mô hình ML nào — chỉ điều phối và gọi AI Module/"
            "Gemini. Điều này giữ backend nhẹ và tách bạch tài nguyên ML.", bold_lead="Tách tài nguyên: ")

H2(doc, "7.3. Dữ liệu đánh giá (Datasets)")
P(doc, "Nhóm sử dụng Manga109-s (Manga109sreleased20260521) — bộ dữ liệu manga chuẩn học thuật của "
       "Aizawa Lab (ĐH Tokyo), gồm 109 đầu truyện với annotation frame/body/face/text. Từ trường <text> "
       "(bbox vùng chữ) nhóm trích xuất các cặp (ảnh-crop, văn bản) cho OCR và chuyển sang định dạng YOLO "
       "cho phát hiện. Việc chia tập thực hiện THEO ĐẦU TRUYỆN (split-by-title) để chống rò rỉ dữ liệu.", align="justify")
table(doc, ["Thuộc tính", "Giá trị"], [
    ["Nguồn", "Manga109-s (Aizawa Lab, University of Tokyo)"],
    ["Tổng mẫu OCR trích xuất", "123.208 cặp (crop ảnh + nhãn văn bản)"],
    ["Chia tập (theo title, seed=42)", "Train 97.602 / Val 11.476 / Test 14.130 (≈ 80/10/10)"],
    ["Lọc nhiễu", "min_box=8px, min_text_len=1, max_text_len=300, pad 5% quanh bbox"],
    ["Detection (YOLO)", "Cùng nguồn, convert bbox <text> → nhãn YOLO, lọc box < 4px"],
], widths=[2.4, 4.1])

H2(doc, "7.4. Độ đo & ngưỡng chấp nhận")
table(doc, ["Mô hình", "Độ đo", "Ngưỡng chấp nhận", "Ghi chú"], [
    ["YOLOv8 phát hiện", "mAP@0.5 ; mAP@0.5:0.95 ; Precision/Recall", "mAP@0.5 ≥ 0.85", "Eval trên test split (conf=0.25, IoU=0.6), per-class."],
    ["manga-ocr", "CER ; Char-Accuracy ; Exact-Match", "CER ≤ 0.10 và Char-Acc ≥ 0.90", "Chọn best model theo CER (greater_is_better=False)."],
    ["Gemini dịch", "BLEU/chrF (tham khảo) ; tỉ lệ 👍 người dùng", "👍 ≥ 80% trên feedback", "Human-in-the-loop qua TranslationFeedback."],
], widths=[1.5, 1.9, 1.6, 1.5])

H2(doc, "7.5. Kết quả đánh giá ban đầu")
P(doc, "Cả hai mô hình tự huấn luyện đều đã được fine-tune và đánh giá trên test split của Manga109-s "
       "(chia theo đầu truyện, chống rò rỉ). Kết quả ĐẠT và vượt ngưỡng đề ra.", align="justify")

P(doc, "a) manga-ocr (fine-tune full, 8 epochs, lr=3e-5, cosine, label-smoothing=0.1, fp16) — test 14.130 mẫu:",
  bold=True, size=11.5, after=3)
table(doc, ["Độ đo (manga-ocr, test)", "Kết quả", "Ngưỡng", "Đạt?"], [
    ["CER (Character Error Rate)", "0.0611 (6.1%)", "≤ 0.10", "✓ Đạt"],
    ["Char-Accuracy", "0.9389 (93.9%)", "≥ 0.90", "✓ Đạt"],
    ["Exact-Match", "0.6748 (67.5%)", "— (tham chiếu)", "Tốt"],
], widths=[2.6, 1.4, 1.2, 1.3])

P(doc, "b) YOLOv8 phát hiện bong bóng (yolov8n, 50 epochs, imgsz=640, ~1,23 giờ trên Tesla T4) — "
       "test 956 ảnh / 14.130 vùng chữ:", bold=True, size=11.5, after=3, before=4)
table(doc, ["Độ đo (YOLOv8, test)", "Kết quả", "Ngưỡng", "Đạt?"], [
    ["mAP@0.5", "0.9525 (95.3%)", "≥ 0.85", "✓ Đạt"],
    ["mAP@0.5:0.95", "0.8440 (84.4%)", "— (tham chiếu)", "Tốt"],
    ["Precision (mean)", "0.9731 (97.3%)", "— (tham chiếu)", "Tốt"],
    ["Recall (mean)", "0.9379 (93.8%)", "— (tham chiếu)", "Tốt"],
], widths=[2.6, 1.4, 1.2, 1.3])

P(doc, "So với bản fine-tune sơ bộ ở PA2 (Char-Acc 87,3%, CER 0,127), manga-ocr giảm hơn 50% lỗi ký tự. "
       "Mô hình phát hiện YOLOv8 (1 lớp “text”, ~3,0M tham số) vượt xa ngưỡng mAP@0.5 = 0.85. Cả hai mô "
       "hình đều đạt mục tiêu chất lượng, sẵn sàng phục vụ pipeline dịch; đánh giá sâu hơn (đường cong PR, "
       "phân tích lỗi theo thể loại) sẽ trình bày ở PA4.", align="justify", size=11.5, color=GREY)

H2(doc, "7.6. Quy trình huấn luyện lại – đánh giá – tái triển khai (MLOps)")
P(doc, "Vòng đời mô hình được thiết kế khép kín, tận dụng GPU miễn phí của Kaggle cho huấn luyện và "
       "HuggingFace cho phân phối trọng số:", align="justify")
numbered(doc, "Thu thập dữ liệu: phản hồi 👍/👎 từng trang, cờ low-confidence, chỉnh sửa thủ công trong Studio QC "
              "(bubble_data.review_status) và log OCR/dịch — bổ sung các mẫu khó (chữ dày, SFX).")
numbered(doc, "Gán nhãn & curate: kết hợp Manga109-s với dữ liệu mới đã hiệu đính; chuẩn hoá, lọc nhiễu.")
numbered(doc, "Huấn luyện lại offline trên Kaggle GPU (T4/P100): 02_convert_to_yolo.py (YOLOv8) và "
              "03_train_ocr.py (manga-ocr), chia tập theo title để chống leak.")
numbered(doc, "Đánh giá trên test split: mAP / CER / Char-Acc / Exact-Match; so với ngưỡng và bản hiện tại "
              "(kiểm soát hồi quy — no-regression gate).")
numbered(doc, "Đóng gói & đẩy: best.pt (YOLO) + weights/ safetensors (OCR) + metadata.json lên HuggingFace Hub.")
numbered(doc, "Tái triển khai: cập nhật trọng số trong AI Module (rebuild HF Space) hoặc trỏ nguồn động (Admin "
              "ai_module_source) sang bản mới; chạy smoke-test rồi go-live.")
numbered(doc, "Giám sát sau triển khai: theo dõi tỉ lệ 👍, độ trễ, lỗi pipeline; rollback nếu phát hiện hồi quy.")

H2(doc, "7.7. Giám sát & vòng phản hồi người dùng")
bullet(doc, "TranslationFeedback (👍/👎 + bình luận) mỗi trang → tín hiệu chất lượng dịch.")
bullet(doc, "Cờ độ tin cậy thấp (low-confidence) hiển thị viền cảnh báo; bỏ qua bong bóng SFX.")
bullet(doc, "Studio QC: hiệu đính per-bubble (approve/reject) + tìm-thay thế hàng loạt → dữ liệu vàng cho retrain.")
bullet(doc, "Admin health/observability (Sentry + OpenTelemetry) theo dõi latency và lỗi của AI Module/Gemini.")

# ============================== SAVE ==============================
doc.save(OUT)
print("SAVED", os.path.abspath(OUT))
print("paragraphs:", len(doc.paragraphs), "tables:", len(doc.tables))
