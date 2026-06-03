# PA3-Group01 — Hướng dẫn hoàn tất & nộp bài

Thư mục này chứa các sản phẩm PA3 của **Nhóm 1 – StoryLens**. Dưới đây là ánh xạ tới yêu cầu PA3,
trạng thái, và **những việc bạn cần tự làm** trước khi nén nộp.

## 1. Danh sách tệp & ánh xạ rubric

| Tệp | Phần PA3 | Điểm | Trạng thái |
| --- | --- | --- | --- |
| `rup_sad_v2.docx` | (a) SAD đã hiệu chỉnh — Mục 1–6 + (b) Mục 7 ML | 15 + 20 | ✅ Hoàn chỉnh (nội dung) |
| `ui_prototype.docx` | (c) UI prototype — 6 màn hình (main + UC01–UC04 + phụ trợ) | 15 | ⚠️ Cần bạn **chèn ảnh chụp** |
| `README.md` | (d) Working software — readme | 20 | ✅ Hoàn chỉnh |
| `demo_video.mp4` | (d) Working software — video demo | (gộp) | ⚠️ Cần bạn **quay video** |
| `weekly_report_pa3.docx` | (e) Báo cáo hàng tuần (Tuần 7–9) | 5 | ✅ Hoàn chỉnh |
| `assets/` | Sơ đồ (deployment, use-case) + script tạo lại | — | ✅ Đã nhúng vào SAD |

> SAD đã nhúng sẵn 2 sơ đồ UML (deployment ở Mục 5, use-case ở Mục 3). Nguồn PNG + script Python
> nằm trong `assets/` nếu cần chỉnh/tái tạo (`python make_deployment_diagram.py`, v.v.).

## 2. Việc BẠN cần làm (3 việc)

### A. Chèn ảnh chụp UI vào `ui_prototype.docx`
Mỗi màn hình đã có ô **“CHÈN ẢNH CHỤP MÀN HÌNH TẠI ĐÂY”** kèm route cần chụp. Cách lấy ảnh thật:
1. `cd frontend && npm run dev` → mở http://localhost:3000 (frontend đã trỏ sẵn backend Render thật).
2. Đăng nhập tài khoản demo: **`demo.pa3@storylens.app` / `StoryLens#PA3demo`** (đã có series mẫu “Lưỡi Kiếm Định Mệnh”).
3. Chụp lần lượt các route: `/` · `/upload` · `/reader?page=…` · `/history` (+ `/library`, `/login`).
4. Dán ảnh đè vào từng ô trong file Word.

> Muốn màn hình **Reader có bản dịch thật**: cần AI Module (HuggingFace Space) đang chạy **và** nguồn
> AI Module trong **/admin → AI module source** trỏ đúng URL Space sống
> (`https://huynhtrungkiet09032005-ai-storylen.hf.space`). Hiện backend live đang trỏ URL cũ nên upload
> báo `ai_module returned HTTP 404`. Cách khác: chạy backend local + đặt `AI_MODULE_URL` về Space.

### B. Quay video demo 2–3 phút (`demo_video.mp4`)
Quay **2 luồng chính** (đủ yêu cầu “≥ 2 use-case”):
- **Luồng A (UC01+UC02):** đăng nhập → Upload 1 trang manga Nhật → chờ pipeline (YOLOv8→manga-ocr→LaMa→Gemini) → mở Reader xem overlay.
- **Luồng B (UC03):** Batch upload nhiều trang (cả chương) → xử lý tuần tự + tiến trình realtime → đọc cả chương.
Kịch bản chi tiết: xem `README.md` mục 2.

### C. Xuất PDF & nén nộp (tuỳ chọn PDF, bắt buộc nén)
- (Tuỳ chọn) Mở mỗi `.docx` trong Word → **File ▸ Save as PDF** (TA thường thích PDF). Nhớ **cập nhật Mục lục** trong SAD (References ▸ Update Table of Contents).
- Đảm bảo cả thư mục tên đúng `PA3-Group01`, rồi nén thành **`PA3-Group01.zip`**.

## 3. Ghi chú kỹ thuật (đã kiểm chứng khi soạn bài)
- SAD đã **đồng bộ với hệ thống thật** (khác PA2): Supabase PostgreSQL; manga-ocr fine-tune thay Cloud Vision; xác thực cookie HttpOnly; credits/Stripe/thư viện/thông báo/admin.
- **Kết quả ML thật** đưa vào SAD Mục 7.5: (a) manga-ocr fine-tune trên Manga109-s (test 14.130 mẫu) đạt **CER 6.1%, Char-Acc 93.9%, Exact 67.5%**; (b) YOLOv8 phát hiện bong bóng (test 956 ảnh) đạt **mAP@0.5 95.3%, mAP@0.5:0.95 84.4%, P 97.3%, R 93.8%** — cả hai vượt ngưỡng.
- Backend live `https://storylens-api.onrender.com/health` = 200; AI Module Space = 200 (có thể ngủ, truy cập để đánh thức).

## 4. Cách tái tạo tài liệu (nếu cần chỉnh)
```powershell
cd docs/PA/PA3-Group01/assets
python make_deployment_diagram.py   # -> deployment_diagram.png
python make_usecase_diagram.py      # -> usecase_diagram.png
python build_sad.py                 # -> ../rup_sad_v2.docx
python build_ui.py                  # -> ../ui_prototype.docx
python build_weekly.py              # -> ../weekly_report_pa3.docx
```
