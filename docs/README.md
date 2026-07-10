# StoryLens — Bản đồ tài liệu (docs/)

> Điểm vào duy nhất cho toàn bộ tài liệu đồ án **StoryLens** — môn **CSC10011 Công nghệ phần mềm
> cho hệ thống Trí tuệ Nhân tạo** (HCMUS). Dùng file này để **điều hướng nhanh** và, khi **vấn đáp /
> bảo vệ**, mở thẳng mục 🎓 bên dưới.

---

## 🎓 VẤN ĐÁP / BẢO VỆ ĐỒ ÁN — mở cụm này khi lên bảo vệ

### 1. Bộ trình bày (in ra / trình chiếu)
| Cần | File |
|---|---|
| **Slide chính** (28 slide, PowerPoint) | [`presentation/StoryLens_Presentation.pptx`](presentation/StoryLens_Presentation.pptx) |
| Slide bản PDF (Beamer) | [`presentation/StoryLens_Slides.pdf`](presentation/StoryLens_Slides.pdf) |
| **Script thuyết trình** (A4, chia sẵn 6 thành viên) | [`presentation/Script_Thuyet_Trinh.docx`](presentation/Script_Thuyet_Trinh.docx) |
| **Bộ 64 câu hỏi–trả lời bảo vệ** (in cầm theo) | [`presentation/QA_Bao_Ve.pdf`](presentation/QA_Bao_Ve.pdf) |
| Q&A cá nhân + thuật ngữ | [`presentation/QA_DuyMinh.pdf`](presentation/QA_DuyMinh.pdf), [`QA_DuyMinh_ThuatNgu.pdf`](presentation/QA_DuyMinh_ThuatNgu.pdf) |
| Ghi chú ôn tập | [`on_tap_storylens_cnpm.md`](on_tap_storylens_cnpm.md), [`on_tap_nang_cao_storylens.md`](on_tap_nang_cao_storylens.md) |

### 2. Số liệu chốt (thầy hay hỏi — nhớ sẵn)
| Chỉ số | Giá trị | Nguồn |
|---|---|---|
| Bubble detection (YOLOv8) | **mAP@0.5 = 95.3%** | ML eval / PA4 |
| OCR (manga-ocr, fine-tune) | **CER = 6.1%** | ML eval / PA4 |
| Kiến trúc | **3 service** (Next.js · FastAPI · ai_module) | SAD |
| Model AI | YOLOv8 · manga-ocr · Gemini (dịch+RAG) · **qwen2.5vl** (kể chuyện) | SAD / config |
| Test tự động | **pytest 140 · Vitest 163 · Playwright E2E · Katalon (PA5)** | tests/ + PA4/PA5 |
| Test case thủ công | **61 case / 10 UC** | PA4 `test_cases.docx` |
| Credit | FREE 5/ngày · 1 credit = 1 dịch/Q&A/nghe | SRS / credit_service |
| Ràng buộc upload | ≤ 20 MB · jpg/png/webp | config |
| Giám sát MLOps | drift dashboard + per-model telemetry + `/metrics` + alert | model_monitor + ai_telemetry |

### 3. Đối chiếu môn học (LN01–LN12) → mở artifact nào khi bị hỏi
> Chi tiết đầy đủ: [`course-supplements/COURSE_COVERAGE_GAP_ANALYSIS.md`](course-supplements/COURSE_COVERAGE_GAP_ANALYSIS.md)

| Bài | Chủ đề | Artifact để mở |
|---|---|---|
| LN02/03 | Quy trình + Quản lý dự án | SDP (PA) · [`management/StoryLens_Project_Plan.xlsx`](management/StoryLens_Project_Plan.xlsx) (WBS/Gantt/Risk/RTM/Burndown) · [`course-supplements/MANAGEMENT_PLANS_SUPPLEMENT.md`](course-supplements/MANAGEMENT_PLANS_SUPPLEMENT.md) |
| LN04/05 | Requirements | SRS · UC spec (PA) · [`course-supplements/REQUIREMENTS_SUPPLEMENT.md`](course-supplements/REQUIREMENTS_SUPPLEMENT.md) (include/extend + validation) |
| LN06 | Kiến trúc | SAD · [`SAD-e-f-g.md`](SAD-e-f-g.md) · [`storylens-sad.drawio`](storylens-sad.drawio) · [`course-supplements/SAD_Supplement_ProcessView_and_ADR.md`](course-supplements/SAD_Supplement_ProcessView_and_ADR.md) (Process View + ADR) · [`course-supplements/SEQUENCE_DIAGRAMS.md`](course-supplements/SEQUENCE_DIAGRAMS.md) |
| LN07 | ML workflow | ML eval slides/script · PA4 model_evaluation · drift dashboard (model_monitor) |
| LN08 | Vibe engineering | CI (`.github/workflows/ci.yml`) · `CLAUDE.md`/`AGENTS.md` · specs [`superpowers/`](superpowers/) |
| LN09 | UI design | PA3 `ui_prototype.docx` · [`course-supplements/UI_EVALUATION.md`](course-supplements/UI_EVALUATION.md) (7 nguyên tắc + 5 usability) |
| LN10/11 | Testing | PA4 test_plan/cases/report · PA5 Katalon · [`course-supplements/TEST_DESIGN_SUPPLEMENT.md`](course-supplements/TEST_DESIGN_SUPPLEMENT.md) (EP/BVA/white-box) · [`course-supplements/DEFECT_LOG.md`](course-supplements/DEFECT_LOG.md) |
| LN12 | AI Ethics | [`course-supplements/RESPONSIBLE_AI_ETHICS.md`](course-supplements/RESPONSIBLE_AI_ETHICS.md) (T-F-P-S-A + bias) |

### 4. Checklist mang theo khi bảo vệ
- [ ] Laptop demo chạy được (backend + frontend), có mạng tới pod VLM nếu demo Nghe truyện.
- [ ] In: `Script_Thuyet_Trinh.docx` (mỗi người 1 trang) + `QA_Bao_Ve.pdf`.
- [ ] Mở sẵn: slide PDF, `COURSE_COVERAGE_GAP_ANALYSIS.md`, `storylens-sad.drawio`.
- [ ] Thuộc số liệu mục 2. Phân công câu hỏi theo mảng (Minh/Quý/Phú Hòa/Nguyên/Hà Dương/Kiệt).

---

## 📁 Bản đồ thư mục docs/

### Tài liệu SE cốt lõi (bản chính, theo mẫu môn)
- [`Software Requirements Specification (SRS) - StoryLens.md`](Software%20Requirements%20Specification%20(SRS)%20-%20StoryLens.md) — SRS (F01–F09 + NFR)
- [`Software Architecture Document (SAD) - StoryLens.md`](Software%20Architecture%20Document%20(SAD)%20-%20StoryLens.md) — SAD (4+1)
- [`SAD-e-f-g.md`](SAD-e-f-g.md) — SAD phần e/f/g (kiến trúc, detailed design, ML)
- [`Software Development Plan (SDP) - StoryLens.md`](Software%20Development%20Plan%20(SDP)%20-%20StoryLens.md) — SDP
- [`API Specification (OpenAPI_Swagger) - StoryLens.md`](API%20Specification%20(OpenAPI_Swagger)%20-%20StoryLens.md) — API spec
- [`Database Schema - StoryLens.md`](Database%20Schema%20-%20StoryLens.md) — schema DB
- [`Deployment Guide - StoryLens.md`](Deployment%20Guide%20-%20StoryLens.md) — hướng dẫn triển khai (vận hành)
- [`Security Policy - StoryLens.md`](Security%20Policy%20-%20StoryLens.md) — chính sách bảo mật
- [`storylens-sad.drawio`](storylens-sad.drawio) — nguồn diagram (usecase/class/ERD/architecture/UI)

### 🎓 Bổ sung đối chiếu môn học → [`course-supplements/`](course-supplements/)
Gom các artifact lấp khoảng trống LN04/05/06/09/10/12 (sequence diagram, ethics, defect log,
requirements/test/UI supplement, process-view/ADR, user manual). Index: `COURSE_COVERAGE_GAP_ANALYSIS.md`.

### Bài nộp PA1–PA5 → [`PA/`](PA/)
Vision/SDP (PA1) · UC spec/SAD (PA2) · SAD v2/UI prototype (PA3) · test + model eval (PA4) · Katalon (PA5).

### Trình bày & bảo vệ → [`presentation/`](presentation/)
Slide (pptx/pdf/tex), script 6 người, bộ Q&A 64 câu, Q&A cá nhân. (README riêng trong thư mục.)

### Quản lý dự án → [`management/`](management/)
`StoryLens_Project_Plan.xlsx` — workbook 10 sheet (Team/WBS/Sprint/Gantt/Staff/Risk/RTM/Burndown/Scrum).

### Đánh giá ML → `ml_evaluation_*`
`ml_evaluation_script.md` (nội dung) + slides (`.tex`/`.pdf`/`.html`).

### Ghi chú ôn tập → `on_tap_*.md`
### Thiết kế spec-driven → [`superpowers/`](superpowers/) (plans + specs: RAG streaming, citations, chapter recap)

---

> **Quy ước:** file `.docx/.pdf/.pptx` là **bản nộp**; `.md` là **bản nguồn dễ sửa**. Rác build LaTeX
> (`.aux/.log/.toc/.luabridge`…) đã được `.gitignore` — không commit.
