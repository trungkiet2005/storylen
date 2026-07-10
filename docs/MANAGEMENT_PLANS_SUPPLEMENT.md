# StoryLens — Management Plans Supplement (LN03)

> **Mục đích:** bổ sung 3 kế hoạch quản lý mà LN03 liệt kê SDP nên có nhưng SDP hiện chỉ mạnh ở
> Budget/Schedule/Staffing/Risk: **Configuration Management Plan**, **Quality Management Plan**, và
> **Software Acceptance (UAT) Plan**. Tất cả bám **thực hành thật** trong repo (git, CI, RLS, test).

---

## 1. Configuration Management Plan (CM)

| Hạng mục | Quy định | Bằng chứng thật |
|---|---|---|
| **Version control** | Git; nhánh `main` là trunk; feature‑branch/worktree cho việc song song | Repo `trungkiet2005/storylen`; nhánh `duong`, `worktree-chapter-recap*` |
| **Branching & merge** | PR vào `main`; **fetch + rebase trước push**; giải quyết conflict thủ công (không force) | Quy trình đã dùng: rebase 45 commit, resolve `api.ts` (Defect D‑07) |
| **Baseline / release** | Build 1/2/3 = baseline; tag theo milestone; `APP_VERSION` trong config | `config.py :: APP_VERSION`; SDP §Build |
| **Change control** | Thay đổi qua PR + review bắt buộc; scope creep là rủi ro R7 trong risk register | `.github/workflows/ci.yml` (gate), RTM để đánh giá tác động |
| **CI items dưới quản lý** | Source, test, IaC (`render.yaml`), migration SQL đánh số **tăng dần** (v1→v9), docs | `supabase_migration_v1..v9_*.sql` (không sửa migration đã ship — chỉ thêm mới) |
| **Config phân môi trường** | `.env` (không commit) + `.env.example` (commit); secret trong Render/Vercel/HF | `.gitignore` chặn `.env`; `config.py` Pydantic validate |
| **Artifact nhị phân** | Không commit `node_modules`, build, `storylens_demo/secrets/` | `.gitignore` |

**Nguyên tắc migration (quan trọng):** migration đã phát hành **không sửa tại chỗ** — fix out‑of‑band
đi qua `supabase_patch.sql`, thay đổi schema mới = file `v{n+1}` mới. Đây là *change management* cho DB.

---

## 2. Quality Management / QA Plan

| Cơ chế QA | Nội dung | Bằng chứng |
|---|---|---|
| **Automated quality gate (CI)** | 5 job **song song**: tsc, ESLint, production build, Playwright E2E, backend pytest — FAIL ⇒ chặn merge | `.github/workflows/ci.yml` |
| **Test pyramid** | Nhiều unit/component (pytest 140 + Vitest 163) > integration > E2E | `backend/tests`, `frontend/__tests__`, `frontend/e2e` |
| **Code review** | PR review bắt buộc; AI review qua rules file | GitHub PR; `CLAUDE.md`, `frontend/AGENTS.md` |
| **Coding standards** | ESLint + tsc strict; "no fetch() trực tiếp", App Router only, design token | `frontend/AGENTS.md`, `eslint.config.mjs` |
| **Static/security** | CSP + security headers + Turnstile + SSRF allowlist + MIME verify | `middleware.py`, `services/{captcha,scraper,image_validation}.py` |
| **NFR đo được** | CER≤5%, p95<3s, upload≤20MB… — mỗi NFR có số + cách đo | SRS §3; ML eval |
| **Observability (vận hành)** | model‑monitor (drift) + ai_telemetry (latency/token/cost) + `/metrics` + alert webhook + `/health/deep` | `services/{model_monitor,ai_telemetry,metrics,alerting}.py` |
| **DoD (Definition of Done)** | code + test pass + review + CI green + doc cập nhật | SDP §8 |

---

## 3. Software Acceptance (UAT) Plan

**Mục tiêu:** khách (giảng viên/đại diện người dùng) xác nhận hệ thống **đáp ứng yêu cầu** trước bàn giao.

### 3.1 Tiêu chí nghiệm thu (Acceptance Criteria) — suy từ NFR/FR
| # | Tiêu chí | Ngưỡng đạt | Cách kiểm |
|---|---|---|---|
| AC‑1 | Dịch 1 trang manga JP/CN→VI đúng luồng | Bản dịch hiển thị overlay, sửa được | Kịch bản UAT‑01 |
| AC‑2 | OCR đạt chất lượng | **CER ≤ 5%** trên tập chuẩn | ML eval report |
| AC‑3 | Thời gian phản hồi | Trang đã cache mở **< 3 s** | Đo thủ công/perf |
| AC‑4 | Q&A trả lời có trích dẫn | Có `sources[]` click ra đúng trang | UAT‑03 |
| AC‑5 | Listen mode phát audio | Có audio + phụ đề; fallback khi VLM chết | UAT‑05 |
| AC‑6 | Bảo mật & quyền | Không xem được dữ liệu người khác (RLS/ownership 403) | UAT‑security |
| AC‑7 | Ổn định | Không crash trên luồng chính; lỗi có thông báo | Regression + E2E |

### 3.2 Quy trình UAT
1. Chuẩn bị môi trường **Staging** (giống production, dữ liệu mẫu).
2. Chạy **kịch bản UAT** theo use case (đã tự động hoá 1 phần bằng **Katalon** — `PA5`).
3. Ghi nhận **UAT result + defect** (nếu có) → `PA5 test report`.
4. **Sign‑off:** đại diện khách ký chấp nhận khi mọi AC *bắt buộc* đạt; AC còn thiếu → điều kiện/known‑issue.

> **Trạng thái:** PA5 đã có automated test report (Katalon) + `StoryLens-Test-Report.html`. Mục 3.1
> (bảng tiêu chí) + 3.2 (quy trình + sign‑off) là phần bổ sung để hoàn thiện *Acceptance Plan* của LN03.
