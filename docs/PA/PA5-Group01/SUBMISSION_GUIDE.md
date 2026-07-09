# PA5-Group01 — Hướng dẫn hoàn tất & nộp bài

Thư mục này chứa sản phẩm PA5 phần (a) — kiểm thử tự động (10 điểm) — của **Nhóm 1 – StoryLens**.
Phần (b) (thuyết trình, 80 điểm) và tài liệu ở `docs/presentation/`; phần (c) (nộp cuối kỳ, 10 điểm)
là `PA6-Group01-final-report.zip` ở thư mục gốc `docs/PA/`.

## 1. Danh sách tệp & ánh xạ rubric

| Tệp | Phần PA5 | Điểm | Trạng thái |
| --- | --- | --- | --- |
| `PA5-Automated-Test-Report.docx` | (a) Tài liệu test case + script + kết quả | 10 | ✅ Hoàn chỉnh — 2 use-case × 2 scenario, 4/4 Pass thật |
| `StoryLens-Test-Report.html` | Bản xem nhanh (không bắt buộc nộp) | — | ✅ |
| `assets/*.py` | Script tái tạo `.docx` | — | ✅ Chạy lại được |

## 2. Việc BẠN cần làm

### A. (Tuỳ chọn) Xuất PDF
Mở `PA5-Automated-Test-Report.docx` trong Word → **File ▸ Save as PDF** nếu muốn nộp kèm bản PDF.

### B. (Tuỳ chọn) Nén nộp riêng phần (a)
Nếu giảng viên yêu cầu nộp phần (a) riêng, nén thư mục `PA5-Group01` (giữ nguyên tên thư mục ở
cấp cao nhất trong zip) thành `PA5-Group01.zip`. Việc này không bắt buộc vì PA5 chỉ yêu cầu "một
tài liệu" (đã có `PA5-Automated-Test-Report.docx`), không yêu cầu file zip riêng — file zip bắt
buộc theo đề là `PA6-Group[GroupId]-final-report.zip` (phần c, nộp toàn bộ dự án).

## 3. Ghi chú kỹ thuật (đã kiểm chứng khi soạn bài)

- **Kết quả thật:** 4 test case Katalon (2 use-case × 2 scenario) đều Pass, chạy trực tiếp trên
  storylen.vercel.app ngày 09/07/2026 — không bịa số liệu, không mock kết quả.
- Locator dùng CSS/ID selector ghi trực tiếp từ DOM render (`#login-email`, `#login-password`,
  `a[href='/browse']`, `a[href='/forum']`).

## 4. Cách tái tạo tài liệu (nếu cần chỉnh)

```powershell
cd docs/PA/PA5-Group01/assets
python build_test_report.py
```
