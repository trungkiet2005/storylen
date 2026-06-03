# -*- coding: utf-8 -*-
"""Build StoryLens UI Prototype document (PA3 - part c) -> ui_prototype.docx"""
import os
from _doc import *

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "ui_prototype.docx")

doc = new_doc()

# Title
P(doc, "STORYLENS — BẢN MẪU GIAO DIỆN (UI PROTOTYPE)", bold=True, align="center", size=20, after=4, color=NAVY)
P(doc, "PA3 · Nhóm 1 – StoryLens · CSC10011", italic=True, align="center", size=12, after=2, color=GREY)
P(doc, "Giao diện được chụp từ phần mềm StoryLens đang chạy thật (web app Next.js).",
  italic=True, align="center", size=11, after=12, color=GREY)
hrule(doc)

# Capture guide
H1(doc, "Hướng dẫn chụp màn hình (cho người nộp bài)")
P(doc, "Mỗi màn hình bên dưới có sẵn ô “CHÈN ẢNH CHỤP MÀN HÌNH TẠI ĐÂY”. Chạy app thật rồi chụp đúng route "
       "ghi trong ô và dán đè ảnh vào. Cách chạy nhanh nhất:", align="justify")
numbered(doc, "Frontend: trong thư mục frontend chạy  npm run dev  → mở http://localhost:3000")
numbered(doc, "Backend: chạy thật trên Render (https://storylens-api.onrender.com) — frontend đã trỏ sẵn. "
              "Hoặc chạy local: uvicorn app.main:app --port 8000 và đổi NEXT_PUBLIC_API_URL.")
numbered(doc, "Đăng nhập tài khoản demo có sẵn:  demo.pa3@storylens.app  /  StoryLens#PA3demo  (đã có series mẫu).")
numbered(doc, "Để màn hình Reader có dữ liệu dịch thật: đảm bảo AI Module (HuggingFace Space) đang chạy "
              "và nguồn AI Module trong Admin trỏ đúng URL Space; sau đó upload 1 trang và chờ dịch xong.")
P(doc, "Gợi ý: chụp ở cỡ cửa sổ desktop (~1366×900) cho màn hình chính, và thêm 1–2 ảnh ở chế độ mobile "
       "(DevTools ▸ Responsive) để minh hoạ tính responsive.", italic=True, size=11, color=GREY)
page_break(doc)

SCREENS = [
    {
        "no": "1", "title": "Màn hình chính — Trang chủ (Home)", "uc": "Màn hình chính",
        "route": "/", "what": "Hero + tiêu đề, nút CTA 'Bắt đầu dịch', thanh điều hướng, nền anime động, footer.",
        "purpose": "Là điểm vào của hệ thống; giới thiệu giá trị cốt lõi (dịch manga có ngữ cảnh + đọc overlay) "
                   "và điều hướng người dùng tới các luồng chính.",
        "shows": ["Khối hero với tiêu đề sản phẩm và mô tả ngắn; nền hình hoạ anime chuyển động (AnimatedBackground).",
                  "Nút CTA chính (Upload/Bắt đầu) và nút phụ (Khám phá thư viện).",
                  "Thanh TopBar: logo, điều hướng, công tắc ngôn ngữ (VI/EN), chuông thông báo, huy hiệu credits, menu người dùng.",
                  "Pill 'Tiếp tục đọc' (ResumeReading) nếu đã đọc dở; phần demo pipeline; footer + liên kết pháp lý."],
        "use": ["Nhấn CTA để tới trang Upload (hoặc Đăng nhập nếu chưa có phiên).",
                "Dùng TopBar để chuyển ngôn ngữ, mở thông báo, xem credits hoặc vào hồ sơ.",
                "Nhấn 'Khám phá' để vào thư viện công khai."],
    },
    {
        "no": "2", "title": "UC01 — Upload & Dịch trang manga", "uc": "UC01",
        "route": "/upload", "what": "Vùng kéo-thả ảnh, thumbnail preview, chọn series/chương, nút 'Bắt đầu xử lý', thanh tiến trình.",
        "purpose": "Cho phép người dùng tải ảnh manga (JPG/PNG/WebP) lên để hệ thống tự động phát hiện bong bóng, "
                   "OCR, inpaint và dịch sang tiếng Việt có ngữ cảnh.",
        "shows": ["Khu vực drag-and-drop (kèm nút chọn tệp / chụp ảnh bằng camera trên mobile).",
                  "Danh sách thumbnail các ảnh đã chọn, cho phép sắp xếp lại thứ tự và xoá.",
                  "Tuỳ chọn gắn vào series/chương (hoặc tạo chương mới) và cấu hình dịch.",
                  "Thanh tiến trình realtime theo từng bước pipeline (qua WebSocket) + huy hiệu credits còn lại."],
        "use": ["Kéo-thả hoặc chọn ảnh; kiểm tra định dạng/kích thước (≤ 10MB).",
                "Chọn series/chương đích rồi nhấn 'Bắt đầu xử lý' (trừ 1 credit/ảnh).",
                "Theo dõi tiến trình; khi xong, hệ thống chuyển sang màn hình Reader."],
    },
    {
        "no": "3", "title": "UC02 — Đọc với bản dịch Overlay (Reader)", "uc": "UC02",
        "route": "/reader?page={page_id}", "what": "Ảnh manga + bản dịch tiếng Việt đè trên bong bóng; công tắc overlay; thanh điều hướng trang.",
        "purpose": "Hiển thị trang manga với bản dịch tiếng Việt đặt đúng toạ độ bbox của từng bong bóng; "
                   "người dùng đọc liền mạch và có thể đối chiếu bản gốc.",
        "shows": ["Ảnh trang manga (gốc hoặc đã inpaint) với chữ Việt render vào đúng khung bong bóng.",
                  "Công tắc bật/tắt overlay, thanh điều chỉnh độ trong suốt, nút copy text gốc/dịch.",
                  "Điều hướng trang (phím tắt / vuốt trên mobile), chế độ đọc (1 trang, 2 trang, cuộn dọc/webtoon).",
                  "Bookmark, đánh giá sao, cảnh báo viền cho bong bóng độ tin cậy thấp, từ điển bong bóng."],
        "use": ["Bật/tắt overlay để so sánh bản gốc và bản dịch; kéo thanh opacity nếu cần.",
                "Dùng phím ←/→ hoặc vuốt để chuyển trang; đổi chế độ đọc trong cài đặt.",
                "Nhấn vào bong bóng để xem chi tiết / từ điển (BubbleDictionary)."],
    },
    {
        "no": "4", "title": "UC03 — Batch upload cả chương", "uc": "UC03",
        "route": "/upload  (chọn nhiều tệp)", "what": "Hàng đợi nhiều trang với thumbnail, tiến trình 'x/N trang', báo cáo trang lỗi.",
        "purpose": "Dành cho Content Creator: tải nhiều trang của cả một chương cùng lúc, hệ thống xử lý tuần tự "
                   "(giới hạn semaphore) và hiển thị tiến trình realtime.",
        "shows": ["Danh sách queue nhiều ảnh (sắp theo tên) với thumbnail và trạng thái từng trang.",
                  "Tiến trình tổng thể 'x/N trang hoàn thành' cập nhật realtime qua WebSocket.",
                  "Nút bắt đầu/huỷ batch; báo cáo các trang bị lỗi sau khi chạy xong.",
                  "Tự động tạo/gắn chương và cập nhật glossary nhân vật khi hoàn tất."],
        "use": ["Chọn nhiều ảnh (2–100 trang) và kiểm tra thứ tự.",
                "Nhấn 'Bắt đầu xử lý' và theo dõi tiến trình; có thể huỷ giữa chừng (cancel).",
                "Khi xong, nhấn 'Đọc ngay' để mở chương trong Reader."],
    },
    {
        "no": "5", "title": "UC04 — Lịch sử & Tiếp tục đọc", "uc": "UC04",
        "route": "/history  (và /stats)", "what": "Danh sách series/chương đã xử lý (thumbnail, tên, ngày, số trang), nút tiếp tục đọc.",
        "purpose": "Giúp người dùng xem lại các bộ truyện đã upload trong các phiên trước và tiếp tục đọc từ trang "
                   "đã dừng mà không cần xử lý lại.",
        "shows": ["Lưới/danh sách các series đã upload kèm thumbnail, tên, ngày xử lý, số trang.",
                  "Trạng thái đọc (đang đọc / muốn đọc / xong) và tiến độ phần trăm.",
                  "Trang Stats: cấp độ (XP), chuỗi đăng nhập (streak), mục tiêu đọc, huy hiệu thành tựu.",
                  "Trạng thái rỗng có hướng dẫn 'Upload ngay' khi chưa có lịch sử."],
        "use": ["Vào tab 'Lịch sử' để xem danh sách; chọn một bộ để mở lại.",
                "Hệ thống load bản dịch từ DB (không xử lý lại) và đưa tới trang đọc gần nhất.",
                "Theo dõi tiến độ và thành tựu ở trang Stats."],
    },
    {
        "no": "6", "title": "(Bổ sung) Thư viện công khai & Đăng nhập", "uc": "Phụ trợ",
        "route": "/library  ·  /login", "what": "Lưới truyện đã xuất bản (thư viện); và form đăng nhập/đăng ký.",
        "purpose": "Thư viện cho phép đọc các chương do cộng đồng xuất bản (đọc ẩn danh); màn hình đăng nhập/đăng ký "
                   "phục vụ luồng tài khoản & bảo mật.",
        "shows": ["Thư viện: lưới thẻ truyện (cover, tiêu đề, tag), sắp xếp 'trending', lọc theo tag.",
                  "Đăng nhập/Đăng ký: form email-mật khẩu, nút Google OAuth, captcha (Turnstile) khi bật.",
                  "Liên kết quên mật khẩu / xác thực email."],
        "use": ["Duyệt thư viện công khai và mở đọc chương bất kỳ (không cần đăng nhập).",
                "Đăng ký/đăng nhập để mở khoá upload, lịch sử, hiệu đính và credits."],
    },
]

for s in SCREENS:
    H1(doc, f"Màn hình {s['no']}: {s['title']}")
    P(doc, f"Use-case liên quan: {s['uc']}", italic=True, size=11, color=ACCENT, after=4)
    placeholder(doc, s["route"], s["what"])
    H3(doc, "Mục đích")
    P(doc, s["purpose"], align="justify", after=4)
    H3(doc, "Hiển thị gì")
    for it in s["shows"]:
        bullet(doc, it)
    H3(doc, "Cách người dùng sử dụng")
    for it in s["use"]:
        bullet(doc, it)
    page_break(doc)

doc.save(OUT)
print("SAVED", os.path.abspath(OUT))
print("paragraphs:", len(doc.paragraphs), "tables:", len(doc.tables))
