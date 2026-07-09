# StoryLens — Kiểm thử tự động (PA5, phần a)

**Nhóm 1 – StoryLens · CSC10011 – Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo**
GVHD: GS.TS Nguyễn Văn Vũ · ThS. Trương Phước Lộc · ThS. Ngô Ngọc Đăng Khoa
Hạn nộp: 12/07/2026

PA5 phần (a) — 10 điểm — yêu cầu kiểm thử tự động cho **tối thiểu 2 use-case**, mỗi use-case
**tối thiểu 2 scenario**, dùng một công cụ test automation (Katalon Studio cho ứng dụng web), và
nộp **một tài liệu** liệt kê tên test case, test script, kết quả (Passed/Failed).

---

## 1. Danh sách tệp

| Tệp | Mô tả | Trạng thái |
| --- | --- | --- |
| `PA5-Automated-Test-Report.docx` | **Tài liệu nộp chính thức** — báo cáo kiểm thử tự động đầy đủ (tên test case, script Groovy, kết quả) | ✅ Hoàn chỉnh, thực thi thật |
| `StoryLens-Test-Report.html` | Bản HTML tương đương (xem nhanh trên trình duyệt, không cần nộp) | ✅ |
| `assets/build_test_report.py`, `assets/_doc.py` | Script sinh lại `.docx` bằng python-docx | ✅ |

## 2. Kết quả kiểm thử thật

Thực thi bằng **Katalon Studio 11.3.0** (Runtime Engine, chế độ CLI `katalonc.exe`), trình duyệt
**Chrome 150.0.7871.49**, nhắm trực tiếp vào ứng dụng production tại
[storylen.vercel.app](https://storylen.vercel.app/) — không mock, không giả lập.

| Use-case | Scenario (test case) | Kết quả |
| --- | --- | --- |
| UC-1 Đăng nhập (Login) | `Login_InvalidCredentials` | PASSED |
| UC-1 Đăng nhập (Login) | `Login_EmptyFields` | PASSED |
| UC-2 Điều hướng chính (Main navigation) | `Nav_ToBrowsePage` | PASSED |
| UC-2 Điều hướng chính (Main navigation) | `Nav_ToForumPage` | PASSED |

**Tổng: 2 use-case × 2 scenario = 4 test case, 4 Pass, 0 Fail — 100% pass rate.**
Chạy lúc 09/07/2026, 13:59–14:00, exit code 0 (test suite `StoryLens Test Suite`, run
`20260709_135947`).

## 3. Cách tái tạo tài liệu

```powershell
cd docs/PA/PA5-Group01/assets
pip install python-docx     # nếu chưa có
python build_test_report.py    # -> ../PA5-Automated-Test-Report.docx
```

Xem `SUBMISSION_GUIDE.md` để biết những việc còn cần xác nhận trước khi nộp.
