# StoryLens — Slide thuyết trình cuối kỳ

Slide báo cáo đồ án **StoryLens** (PA5 – bảo vệ cuối kỳ) cho môn **CSC10011 –
Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo**, HCMUS · GVHD: GS.TS Nguyễn
Văn Vũ, ThS. Trương Phước Lộc, ThS. Ngô Ngọc Đăng Khoa. Ngày báo cáo:
**10/07/2026** · thời lượng **15 phút (gồm demo) + 10 phút Q&A**.

> **Bám theo đúng thứ tự PA5:** slide đi theo chính xác 6 mục PA5 yêu cầu, theo
> thứ tự — **I. Vấn đề, định vị & người dùng** (slide 3–6) → **II. Quản lý dự án**:
> cơ cấu nhóm & trách nhiệm 6 thành viên (slide 7–8) → **III. Yêu cầu phần mềm**:
> mô hình use case + **sơ đồ use case** + NFR (slide 9–12) → **IV. Phân tích &
> Thiết kế**: kiến trúc, pipeline AI, RAG, công nghệ, bảo mật, triển khai
> (slide 13–18) → **V. Đánh giá**: kết quả mô hình ML + kiểm thử tự động
> (slide 19–20) → **VI. Demo** (slide 21–24) → **VII. Kết luận** (slide 25–28).
> Slide 20 nêu **Katalon Studio** — công cụ kiểm thử tự động bắt buộc của PA5
> phần (a): tối thiểu 2 use case (UC01, UC02) × ≥2 scenario, báo cáo Pass/Fail
> kèm test script (nộp thành **một tài liệu riêng**, chấm chung với phần trình bày).

| Tệp | Mô tả |
| --- | --- |
| `StoryLens_Presentation.pptx` | **Slide chính** (28 slide, 16:9, có logo HCMUS) — trình chiếu bằng PowerPoint |
| `StoryLens_Slides.pdf` | **Bản LaTeX/Beamer của slide** (28 trang, cùng nội dung & phong cách) — nộp/chiếu bằng PDF |
| `StoryLens_Slides.tex` | Bản nguồn LaTeX của slide (build: `xelatex StoryLens_Slides.tex` ×2) |
| `Script_Thuyet_Trinh.docx` | **Script thuyết trình A4** (9 trang) — chia sẵn cho **6 thành viên (đã điền tên)**, in ra cầm đọc |
| `Script_Thuyet_Trinh.md` | Bản nguồn của script (dễ sửa nội dung) |
| `QA_Bao_Ve.pdf` | **Bộ 64 câu hỏi & trả lời bảo vệ** — từ tài liệu PA + sản phẩm thật (in cầm theo) |
| `QA_Bao_Ve.tex` | Bản nguồn LaTeX của bộ Q&A (build: `xelatex QA_Bao_Ve.tex` ×2) |
| `build_slides.js` | Script sinh lại slide (Node + pptxgenjs) |
| `assets/` | `hcmus_logo.png` + nơi để ảnh chụp màn hình nếu muốn |

### Script thuyết trình (in A4, chia cho nhóm)
`Script_Thuyet_Trinh.docx` đã khổ **A4**, mỗi thành viên **một trang riêng** (in ra
là phát được ngay), **đã điền sẵn tên 6 bạn** và bám đúng **28 slide**. Lời để đọc
gần như nguyên văn nằm trong khung thụt lề; phần `[…]` là chỉ dẫn sân khấu (không
đọc); câu chuyển tiếp giữa các bạn có dấu ➡️. Cuối tài liệu có **phụ lục Hỏi–Đáp**
(13 câu thường gặp + gợi ý trả lời, ghi rõ ai trả lời mảng nào).

Phân công: **Minh** (1–5) · **Quý** (6–10) · **Phú Hòa** (11–14) · **Nguyên**
(15–19) · **Hà Dương** (20–23) · **Kiệt** (24–28).

Sửa nội dung script trong `Script_Thuyet_Trinh.md` rồi tạo lại DOCX:
`pandoc Script_Thuyet_Trinh.md -o Script_Thuyet_Trinh.docx` (rồi chỉnh khổ A4 bằng python-docx nếu cần).

Thiết kế theo phong cách **manga-editorial** đồng bộ với chính sản phẩm: góc vuông
sắc, viền 2px, bóng cứng lệch (panel-shadow), nhãn chữ hoa giãn ký tự, tông
mực đen + đỏ manga + vàng nhấn. Font an toàn (Arial + Calibri) hỗ trợ tiếng Việt.

---

## 1. Việc cần bạn tự làm — chèn ảnh chụp web

3 slide demo (**22, 23, 24**) có sẵn các **khung nét đứt** ghi
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

## 2. Cấu trúc 28 slide (đúng thứ tự 6 mục PA5)

| # | Slide | Mục PA5 |
| --- | --- | --- |
| 1 | Trang bìa | — |
| 2 | Nội dung (agenda) | — |
| 3 | Bối cảnh & Vấn đề | I. Problem statement |
| 4 | Giải pháp (định vị) | I. Product position statement |
| 5 | So sánh cạnh tranh | I. Product position statement |
| 6 | Người dùng (personas) | I. Users/market |
| 7 | Quy trình (RUP + Scrum) | II. Project management |
| 8 | **Tổ chức nhóm & phân công (6 TV)** | II. Team structure & responsibilities |
| 9 | Use case chính | III. Use-case model |
| 10 | **Sơ đồ use case** | III. Use-case model |
| 11 | Yêu cầu chức năng (F01–F09) | III. Use-case model |
| 12 | Yêu cầu phi chức năng | III. Non-functional requirements |
| 13 | Kiến trúc 3 dịch vụ | IV. Architecture |
| 14 | Pipeline dịch AI | IV. Architecture & technologies |
| 15 | RAG Q&A | IV. Architecture & technologies |
| 16 | Ngăn xếp công nghệ | IV. Technologies used |
| 17 | Bảo mật nhiều lớp | IV. Architecture & technologies |
| 18 | Triển khai | IV. Architecture & technologies |
| 19 | Mô hình ML & kết quả | V. Evaluation |
| 20 | Kiểm thử & CI/CD (Katalon) | V. Evaluation |
| 21 | Tính năng nổi bật | VI. Demo (giới thiệu) |
| 22 | **Demo A** — Trang chủ & Upload | VI. Demo |
| 23 | **Demo A** — Reader & Studio QC | VI. Demo |
| 24 | **Demo B** — Batch · Q&A · Thư viện | VI. Demo |
| 25 | Hạn chế & lỗi đã biết | VII. Kết luận (bổ sung) |
| 26 | Hướng phát triển | VII. Kết luận (bổ sung) |
| 27 | Kết luận | VII. Kết luận (bổ sung) |
| 28 | Cảm ơn & Q&A | — |

Mỗi slide đều có **ghi chú người trình bày** (Presenter Notes) — mở tab **View ▸
Notes** trong PowerPoint để xem gợi ý nói.

---

## 3. Cần chỉnh trước khi trình bày

- **Tên & MSSV 6 thành viên** đã điền sẵn (slide bìa + slide 8). Kiểm tra lại nếu có sai sót.
- Chèn ảnh chụp web vào **slide 22–24** (xem mục 1).
- Kiểm tra lại tên GVHD nếu khác.

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
