# StoryLens — Đối chiếu quy trình môn CNPM & Phân tích khoảng trống (Gap Analysis)

> **Mục đích:** rà toàn bộ artifact / bước quy trình mà môn **Công Nghệ Phần Mềm** (12 bài giảng
> LN01–LN12) yêu cầu, đối chiếu với những gì StoryLens đã có, chỉ ra chỗ **thiếu / mỏng**, và
> ghi rõ **đã bổ sung gì**. Nguồn đối chiếu: `OnThi/CNPM/legacy/CongNghePhanMem/lt_cnpm/LN*.tex`.
>
> **Chú thích trạng thái:** ✅ Đầy đủ · ⚠️ Có nhưng mỏng/chưa đúng chuẩn · ❌ Chưa có (đã/đang bổ sung)
>
> **Đã bổ sung trong đợt rà này** (in đậm ở cột *Bổ sung*):
> - `docs/management/StoryLens_Project_Plan.xlsx` — workbook 10 sheet: Team & RUP roles, WBS,
>   Sprint plan, Gantt, Staff allocation, **Risk register số hoá RE=P×L**, Traceability matrix,
>   Burndown, Scrum log.
> - `docs/SAD_Supplement_ProcessView_and_ADR.md` — bổ sung **Process View (4+1)** + **ADR chuẩn**.
>
> **Đợt 2 (bổ sung tiếp — lấp nốt các mục ⚠️/❌ còn lại):**
> - `docs/SEQUENCE_DIAGRAMS.md` — **3 biểu đồ tuần tự** (Upload/Q&A/Listen) suy từ code thật.
> - `docs/RESPONSIBLE_AI_ETHICS.md` — **AI Ethics LN12** đầy đủ (T‑F‑P‑S‑A + bias 3 loại + fairness).
> - `docs/DEFECT_LOG.md` — **defect log thật** (7 lỗi found→fixed→retested, có commit).
> - `docs/REQUIREMENTS_SUPPLEMENT.md` — UC **«include»/«extend»/generalization** + **Requirements Validation** 5 checks.
> - `docs/TEST_DESIGN_SUPPLEMENT.md` — **Equivalence Partitioning + Boundary Value + white‑box/path** (cyclomatic).
> - `docs/UI_EVALUATION.md` — **7 nguyên tắc UI + 5 chiều usability** (LN09).
> - `docs/MANAGEMENT_PLANS_SUPPLEMENT.md` — **Configuration + Quality + Acceptance/UAT plan** (LN03).
> - `docs/USER_MANUAL.md` — **hướng dẫn người dùng cuối** (LN02 deployment).
> - *Cập nhật thực tế:* **Monitoring/drift (LN07) nay ✅** — có `model_monitor` (dashboard drift + A/B) +
>   `ai_telemetry` (per‑model latency/token/cost) + Prometheus `/metrics` + alert webhook + `/health/deep` probe VLM/TTS.

---

## 0. Tóm tắt điều hành

StoryLens là một trong những đồ án **hoàn chỉnh nhất có thể** ở mức code + tài liệu: đủ PA1→PA5,
Vision/SRS/SAD/SDP, UC spec, test plan/cases/report, ML evaluation rất mạnh. Khoảng trống **không
nằm ở nội dung** mà ở **một số artifact quản lý dự án ở dạng chuẩn của môn** (Gantt, staff
allocation, RE số, RTM, burndown, scrum log) và **một vài mục kỹ thuật đúng khuôn** (Process View,
ADR). Tất cả các mục này đã được bổ sung, **dựa trên dữ liệu thật** trong SDP v2 / SRS / SAD —
không bịa số.

| Nhóm artifact | Trước | Sau khi bổ sung |
|---|---|---|
| Quản lý dự án (LN03) | Task list + risk **định tính** trong SDP | ✅ WBS + **Gantt** + **Staff allocation** + **RE số hoá** + Burndown + Scrum log (Excel) |
| Truy vết (LN05/LN10) | Chỉ liên kết không chính thức | ✅ **RTM** Req↔UC↔Module↔Test (Excel) |
| Kiến trúc (LN06) | 4+1 thiếu Process View; quyết định dạng bảng | ✅ **Process View** + **ADR chuẩn** (md) |
| Còn lại (Requirements, UI, Test, ML, Ethics) | Đã đủ | Giữ nguyên (điểm mạnh) |

---

## 1. LN01 — Introduction
| Artifact/khái niệm | Trạng thái | Nơi có / Ghi chú | Bổ sung |
|---|---|---|---|
| Phần mềm = code + **documentation** | ✅ | Toàn bộ `docs/` + code 3 service | — |
| Danh sách **references / trích dẫn** | ✅ | ML eval trích Manga109-s; slide có nguồn | — |
| Ý thức đạo đức nghề nghiệp | ✅ | Security Policy + phần AI ethics (LN12) | — |

## 2. LN02 — Software Processes
| Artifact | Trạng thái | Nơi có | Bổ sung |
|---|---|---|---|
| **Chọn mô hình quy trình + biện luận** | ✅ | SDP: RUP + Scrum-like, sprint 2 tuần | — |
| **Product/Sprint Backlog** | ⚠️→✅ | Trello (ngoài repo) | Sprint Plan + WBS sheet là backlog tường minh |
| **Increment / Definition of Done** | ✅ | SDP §8 DoD; 3 Build | — |
| **Burndown chart** | ❌→✅ | SDP có nhắc, không có artifact | **Sheet 8. Burndown** (ideal vs actual) |
| Ghi nhận 5 sự kiện Scrum (daily…) | ⚠️→✅ | Chỉ weekly report | **Sheet 9. Scrum Log** (3 câu hỏi × 12 tuần) |
| Thực hành XP (CI, code review, refactor) | ✅ | `.github/workflows/ci.yml`, PR review bắt buộc | — |
| Per-phase deliverables (SRS, SDD, test…) | ✅ | Đủ theo PA1–PA5 | — |

## 3. LN03 — Project Management  ★ trọng tâm yêu cầu
| Artifact | Trạng thái | Nơi có | Bổ sung |
|---|---|---|---|
| **SDP** (budget/schedule/staffing/risk) | ✅ | `rup_sdpln_sp_v2.docx` | — |
| **WBS / breakdown ≥20 task** | ✅ (31 task) | SDP §4.2.3 | **Sheet 2. WBS** (chuẩn hoá, có point) |
| **Gantt / activity timeline** | ❌→✅ | Chỉ bảng tuần | **Sheet 4. Gantt** (task × 12 tuần + ◆milestone) |
| **Staff allocation chart** | ❌→✅ | Không có | **Sheet 5. Staff Allocation** (6 người × 12 tuần) |
| **Milestones / releases** | ✅ | Build 1/2/3 | Hiển thị trên Gantt + Sprint Plan |
| **Risk register RE = Probability × Loss** | ⚠️→✅ | SDP có bảng **định tính** (Cao/TB) | **Sheet 6. Risk** — số hoá RE theo bảng LN03, rank, +R7–R9 |
| Ước lượng effort/cost | ✅ | SDP §4.1 (zero-budget) | Story point trong WBS |
| Brooks's Law / đúng người-việc-lúc | ✅ (ngầm) | Staff allocation phản ánh cân tải | — |

## 4. LN04 — Software Requirements
| Artifact | Trạng thái | Nơi có | Bổ sung |
|---|---|---|---|
| **SRS** (cấu trúc IEEE/Sommerville) | ✅ | `SRS - StoryLens.md` (F01–F09) | — |
| **Functional req "shall"** | ✅ | SRS §2 | — |
| **Non-functional 3 nhánh, đo được** | ✅ | SRS §3.1–3.7 (CER≤5%, <3s…) | — |
| **Vision document** | ✅ | `rup_vision_sp_vn_v2.docx` | — |
| User vs System requirements | ✅ | Vision (user) + SRS (system) | — |

## 5. LN05 — Requirements Engineering  ★
| Artifact | Trạng thái | Nơi có | Bổ sung |
|---|---|---|---|
| **Use Case Diagram** | ✅ | `usecase_diagram.png`, SAD §3.2 | — |
| **Use Case Specification** (Name/Actor/Pre/Post/Main/Alt/Exception) | ✅ | `run_ucspec_v1.docx` (UC01–UC05) | — |
| Quan hệ **include / extend / generalization** | ⚠️ | Chỉ nói trong on_tap, chưa ghi vào spec | Ghi chú trong SAD Supplement §4 |
| Elicitation evidence (interview…) | ⚠️ | Personas trong Vision; không có biên bản phỏng vấn | (chấp nhận được cho đồ án) |
| Requirements validation (5 checks) | ⚠️ | Ngầm qua review; không có checklist riêng | Có thể thêm mục ở SRS (khuyến nghị) |
| **Requirements traceability matrix (RTM)** | ❌→✅ | Chỉ liên kết rời | **Sheet 7. Traceability Matrix** |
| Change management / change request | ⚠️→ | Revision history + Configuration Mgmt | R7 (scope creep) trong risk register |

## 6. LN06 — Software Architecture  ★
| Artifact | Trạng thái | Nơi có | Bổ sung |
|---|---|---|---|
| **Architecture diagram** (component/connector) | ✅ | SAD §4 Logical, `storylens-sad.drawio` | — |
| **Chọn style + biện luận theo NFR** | ✅ | SAD (layered + client-server + agentic AI) | — |
| **4+1 views** | ⚠️→✅ | Có Logical/Deployment/Implementation/Use-Case; **thiếu Process View** | **SAD Supplement §2 — Process View** |
| **ADR** (Issue/Decision/Rationale/Alt/Implication) | ⚠️→✅ | Chỉ bảng "Key Design Decisions" | **SAD Supplement §3 — 6 ADR chuẩn** |
| Deployment diagram | ✅ | `deployment_diagram.png`, SAD §5 | — |
| DB schema / ERD | ✅ | `Database Schema.md`, SAD-e-f-g F2-ERD | — |
| NFR → architecture mapping | ✅ | SAD; chi tiết thêm trong ADR | — |

## 7. LN07 — ML Workflow  ★ (điểm mạnh)
| Artifact | Trạng thái | Nơi có |
|---|---|---|
| Pipeline 8 bước (data→eval→deploy→monitor) | ✅ | `ml_evaluation_script.md`, SAD §7 |
| Dataset + split (train/val/test) | ✅ | Manga109-s, split-by-title seed 42 |
| Metrics: IoU/Precision/Recall/mAP, CER | ✅ | mAP@0.5=0.9525, CER=0.0611 |
| Model evaluation plan + ablation | ✅ | `model_evaluation.docx` (PA2 vs PA3) |
| Deployment (REST vs external API) | ✅ | Gemini API + HF Space; SAD §5 |
| Monitoring / drift | ⚠️ | Đề cập; chưa có dashboard drift | (chấp nhận được) |

## 8. LN08 — Vibe Coding & Vibe Engineering
| Mục | Trạng thái | Nơi có |
|---|---|---|
| Guardrails tự động (CI/linter/typecheck) | ✅ | `ci.yml` 5 jobs |
| Rules file cho AI (CLAUDE.md/AGENTS.md) | ✅ | `CLAUDE.md`, `frontend/AGENTS.md` |
| Version control / PR review | ✅ | Git + branch strategy |
| Spec-driven | ✅ | `docs/superpowers/specs/` |

## 9. LN09 — User Interface Design
| Artifact | Trạng thái | Nơi có |
|---|---|---|
| **UI prototype / wireframe** | ✅ | `ui_prototype.docx` (6 màn hình, live app) |
| UI spec theo 7 nguyên tắc | ⚠️ | Ngầm qua design language (sharp/editorial); không có bảng 7 nguyên tắc | *khuyến nghị thêm 1 mục ngắn* |
| Đánh giá 5 chiều usability | ⚠️ | UAT có feedback; chưa chấm theo 5 chiều | (UAT report bù đắp phần nào) |

## 10. LN10 — AI-Powered Software Testing  ★
| Artifact | Trạng thái | Nơi có |
|---|---|---|
| V&V, test levels (unit/integration/system/acceptance) | ✅ | test_plan.docx; pytest+vitest+Playwright+Katalon+UAT |
| **Test cases từ use case** (Steps/Input/Output/Expected) | ✅ | `test_cases.docx` (61 case/10 UC) |
| Test report + defect log | ✅ / ⚠️ | `test_report.docx` (61/61 Pass); **defect log rỗng (0 defect)** |
| Equivalence/Boundary tables | ⚠️ | Có test data biên; chưa có bảng EP/BVA tường minh | (khuyến nghị 1 bảng minh hoạ) |
| CI quality gate | ✅ | `ci.yml` |

## 11. LN11 — Test Automation
| Artifact | Trạng thái | Nơi có |
|---|---|---|
| **Test plan & strategy** | ✅ | test_plan.docx |
| Automated test scripts | ✅ | pytest (54), vitest (143), Playwright e2e, **Katalon (PA5)** |
| Test pyramid (nhiều unit, ít UI) | ✅ | 197 unit/component > E2E |
| Defect management system | ⚠️ | GitHub Issues/Trello; 0 defect ghi nhận |

## 12. LN12 — AI Ethics
| Artifact | Trạng thái | Nơi có |
|---|---|---|
| Phần **AI ethics / responsible-AI** | ⚠️ | on_tap có bàn; chưa có mục riêng trong SAD/report | *khuyến nghị thêm mục T-F-P-S-A + bias dataset* |
| Bias & fairness của dataset/model | ⚠️ | ML eval nói limitations; chưa phân tích bias theo LN12 | *khuyến nghị bổ sung* |

---

## 13. Danh sách hành động — **ĐÃ HOÀN THÀNH (đợt 2)**

Toàn bộ 6 mục "mỏng" trước đây nay đã có artifact riêng:

1. ✅ **UC «include»/«extend»/generalization** → `REQUIREMENTS_SUPPLEMENT.md §A` (bảng quan hệ + sơ đồ mermaid).
2. ✅ **Requirements Validation** (5 checks) → `REQUIREMENTS_SUPPLEMENT.md §B` (+ ví dụ sửa yêu cầu mơ hồ).
3. ✅ **UI Principles + 5 usability** → `UI_EVALUATION.md` (7 nguyên tắc + 5 chiều, chấm màn Reader).
4. ✅ **Equivalence Partitioning + Boundary Value + white‑box/path** → `TEST_DESIGN_SUPPLEMENT.md` (field thật + cyclomatic của `generate_script`, map test thật).
5. ✅ **Responsible AI (LN12)** → `RESPONSIBLE_AI_ETHICS.md` (T‑F‑P‑S‑A + bias Manga109‑s/Gemini/VLM + fairness).
6. ✅ **Defect log thật** → `DEFECT_LOG.md` (7 lỗi found→fixed→retested, có commit `f2867fa`/`f4cc35d`).

Thêm ngoài danh sách cũ:
7. ✅ **Sequence diagrams** (thiết kế động) → `SEQUENCE_DIAGRAMS.md`.
8. ✅ **Configuration/Quality/Acceptance plan** + **User Manual** → `MANAGEMENT_PLANS_SUPPLEMENT.md`, `USER_MANUAL.md`.
9. ✅ **Monitoring/drift (LN07)** — nay có dashboard drift + telemetry per‑model + `/metrics` + alert (không còn ⚠️).

> Các bảng §A/§B/§UI ở dạng sẵn để **dán vào SRS/UC‑spec/report** (do bản gốc là `.docx`). Việc còn
> lại thuần tuý là copy nội dung vào file `.docx` tương ứng khi nộp.

---

## 14. Bản đồ file mới tạo

```
docs/
├── README.md                                    ← bản đồ tổng + hub Vấn đáp (mở khi bảo vệ)
├── course-supplements/                          ← thư mục này (gom bổ sung đối chiếu môn)
│   ├── COURSE_COVERAGE_GAP_ANALYSIS.md          ← file này (index)
│   ├── SAD_Supplement_ProcessView_and_ADR.md    ← Process View (4+1) + 6 ADR chuẩn
│   ├── SEQUENCE_DIAGRAMS.md                      ← 3 sequence diagram (Upload/Q&A/Listen)
│   ├── RESPONSIBLE_AI_ETHICS.md                  ← LN12: T-F-P-S-A + bias + fairness
│   ├── DEFECT_LOG.md                            ← 7 defect thật found→fixed→retested
│   ├── REQUIREMENTS_SUPPLEMENT.md                ← include/extend + Requirements Validation
│   ├── TEST_DESIGN_SUPPLEMENT.md                 ← EP + BVA + white-box/path
│   ├── UI_EVALUATION.md                         ← 7 UI principles + 5 usability
│   ├── MANAGEMENT_PLANS_SUPPLEMENT.md            ← Config/Quality/Acceptance plan
│   └── USER_MANUAL.md                           ← hướng dẫn người dùng cuối
└── management/
    └── StoryLens_Project_Plan.xlsx              ← 10 sheet PM: WBS/Gantt/Risk/RTM/Burndown/Scrum
```
