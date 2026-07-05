# StoryLens — Slide thuyết trình cuối kỳ

Slide báo cáo đồ án **StoryLens** (PA3) cho môn **CSC10011 – Công nghệ phần mềm
cho hệ thống Trí tuệ Nhân tạo**, HCMUS · GVHD: GS.TS Nguyễn Văn Vũ.

| Tệp | Mô tả |
| --- | --- |
| `StoryLens_Presentation.pptx` | **Slide chính** (26 slide, 16:9) — mở & trình chiếu bằng PowerPoint |
| `build_slides.js` | Script sinh lại slide (Node + pptxgenjs) |
| `assets/` | (tuỳ chọn) nơi để ảnh chụp màn hình nếu muốn nhúng bằng script |

Thiết kế theo phong cách **manga-editorial** đồng bộ với chính sản phẩm: góc vuông
sắc, viền 2px, bóng cứng lệch (panel-shadow), nhãn chữ hoa giãn ký tự, tông
mực đen + đỏ manga + vàng nhấn. Font an toàn (Arial + Calibri) hỗ trợ tiếng Việt.

---

## 1. Việc cần bạn tự làm — chèn ảnh chụp web

3 slide demo (**16, 17, 18**) có sẵn các **khung nét đứt** ghi
“CHÈN ẢNH CHỤP MÀN HÌNH” kèm route cần chụp. Cách làm:

1. Chạy web: `cd frontend && npm run dev` → mở http://localhost:3000
2. Đăng nhập tài khoản demo: `demo.pa3@storylens.app` / `StoryLens#PA3demo`
3. Chụp các route: `/` · `/upload` · `/reader?page=…` · `/studio` · `/qa` ·
   `/library` · `/admin` (xem nhãn đỏ trên từng khung).
4. Trong PowerPoint: nhấp vào khung nét đứt → **Insert ▸ Picture** (hoặc kéo-thả
   ảnh đè lên khung), rồi xoá phần chữ hướng dẫn.

> Muốn Reader có **bản dịch thật**: cần AI Module (HuggingFace Space) đang chạy
> và nguồn AI Module trong **/admin → AI module source** trỏ đúng URL Space sống.

Ngoài 3 slide demo, bạn có thể chèn thêm ảnh vào bất kỳ slide nào tuỳ ý.

---

## 2. Cấu trúc 26 slide

| # | Slide | # | Slide |
| --- | --- | --- | --- |
| 1 | Trang bìa | 14 | Ngăn xếp công nghệ |
| 2 | Nội dung (agenda) | 15 | Tính năng nổi bật |
| 3 | Bối cảnh & Vấn đề | 16 | **Demo A** — Trang chủ & Upload |
| 4 | Giải pháp (định vị) | 17 | **Demo A** — Reader & Studio QC |
| 5 | So sánh cạnh tranh | 18 | **Demo B** — Batch · Q&A · Thư viện |
| 6 | Người dùng (personas) | 19 | Quy trình (RUP + Scrum + vai trò) |
| 7 | Use case chính | 20 | Kiểm thử & CI/CD |
| 8 | Yêu cầu chức năng (F01–F09) | 21 | Bảo mật nhiều lớp |
| 9 | Yêu cầu phi chức năng | 22 | Triển khai |
| 10 | Kiến trúc 3 dịch vụ | 23 | Hạn chế & lỗi đã biết |
| 11 | Pipeline dịch AI | 24 | Hướng phát triển |
| 12 | RAG Q&A | 25 | Kết luận |
| 13 | Mô hình ML & kết quả | 26 | Cảm ơn & Q&A |

Mỗi slide đều có **ghi chú người trình bày** (Presenter Notes) — mở tab **View ▸
Notes** trong PowerPoint để xem gợi ý nói.

---

## 3. Cần chỉnh trước khi trình bày

- **Slide 1** — điền **MSSV + họ tên các thành viên nhóm** (đang là placeholder).
- Kiểm tra lại tên GVHD / học kỳ nếu khác.
- (Tuỳ chọn) thêm logo trường vào slide bìa và slide cảm ơn.

---

## 4. Sinh lại slide (nếu sửa nội dung)

Nội dung nằm hết trong `build_slides.js`. Sau khi sửa:

```powershell
# 1. Cài pptxgenjs (chỉ cần 1 lần)
npm install pptxgenjs

# 2. Đóng PowerPoint (nếu đang mở file), rồi chạy:
node build_slides.js
# -> StoryLens_Presentation.pptx
```

> Nếu chạy `node` báo không tìm thấy `pptxgenjs`, đặt biến `NODE_PATH` trỏ tới
> thư mục `node_modules` nơi đã cài, hoặc chạy `npm install pptxgenjs` ngay trong
> thư mục này.
