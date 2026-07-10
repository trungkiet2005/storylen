# StoryLens — Defect Log (real defects: found → fixed → retested)

> **Mục đích:** đáp ứng yêu cầu **defect log** của môn (LN02 core deliverable; LN10 test report;
> LN11 defect management). Test report chính thức (`PA4/test_report.docx`) là **61/61 Pass trên
> test case đóng gói** — nhưng một log "0 defect" là không thực tế. Bảng dưới là **các lỗi thật đã
> gặp và sửa** trong quá trình phát triển tính năng Narration + MLOps observability, mỗi lỗi ghi rõ
> **cách phát hiện → nguyên nhân gốc → cách sửa (commit) → kết quả kiểm thử lại**. Đây là bằng chứng
> quy trình *found → fixed → retested* mà LN10/LN11 yêu cầu.

**Quy ước severity:** S1 Critical (sập/mất dữ liệu) · S2 Major (chức năng hỏng) · S3 Minor (suy giảm/nhầm) · S4 Trivial.

| ID | Tiêu đề | Sev | Phát hiện ở (level) | Nguyên nhân gốc | Cách sửa (commit) | Kiểm thử lại | TT |
|----|---------|-----|---------------------|-----------------|-------------------|--------------|----|
| **D‑01** | Reader **sập trắng màn hình** khi reading‑stats thiếu trường | S1 | System / **E2E** (Playwright `narration.spec.ts`) | `stats.dailyHistory[today]` deref `undefined` khi API trả stats **thiếu `daily_history`** (version skew / dữ liệu mock) → `Cannot read properties of undefined (reading '2026‑07‑07')` | Optional chaining `stats.dailyHistory?.[today]` (2 chỗ, `WibuContext.tsx`) — `f2867fa` | Playwright **5/5 pass**; vitest WibuContext **29 pass** | ✅ Closed |
| **D‑02** | Listen mode **luôn rơi về fallback**, VLM trả rỗng | S2 | **Integration / E2E** (verify với pod GPU thật) | `qwen3‑vl` là model **"thinking"** — token suy luận ăn hết `num_predict=512` trước khi ra câu trả lời → `response` rỗng (`done_reason=length`) | Đổi default → **`qwen2.5vl:7b`** (trả thẳng) + nâng budget; `think=false`/`/no_think` bị ollama bỏ qua — `f2867fa` | `source=vlm`, mp3 thật 167 KB, ~10 s/trang | ✅ Closed |
| **D‑03** | Test recap **404** fail sau khi teammate refactor | S3 | **Regression** (full pytest sau khi pull 45 commit) | Teammate đảo thứ tự: recap check `ffmpeg` (503) **trước** check chương rỗng (404); test cũ assert 404 mà máy không có ffmpeg | Mock `ffmpeg_available()` trong test để tới nhánh empty — `f4cc35d` | pytest **140 pass** | ✅ Closed |
| **D‑04** | Unit test health‑check assert **tên model cũ** | S3 | **Unit** (sau khi đổi default VLM) | Test hardcode `"qwen3‑vl:8b"` trong khi default đã thành `qwen2.5vl` → `model_available=False` sai | Assert theo `settings.VLM_MODEL` thay vì hằng — `f4cc35d` | `test_vlm_client` **9 pass** | ✅ Closed |
| **D‑05** | VLM qua tunnel bị **403 rồi 530** (pod không reachable) | S2 | **Integration setup** | (a) ollama từ chối **Host header** lạ của trycloudflare (403); (b) pod **chặn QUIC/UDP** — giao thức mặc định của cloudflared (530); (c) process chết khi đóng SSH | `--http-host-header localhost:11434` + `--protocol http2` + **keeper `setsid` tự respawn** (`bin/vlm_tunnel_keeper.sh`) | Vision call qua public URL trả mô tả đúng ("red") | ✅ Closed (infra) |
| **D‑06** | Test double thiếu verb → **KeyError** aggregation | S4 | **Unit** (`test_ai_telemetry`) | `FakeSupabase` thiếu `.gte()/.range()` → `get_ai_call_summary` rơi nhánh except → `totals={}` → test `KeyError` | Thêm `gte/lte/range` vào `FakeQuery` (`conftest.py`) — `f4cc35d` | `test_ai_telemetry` **pass** (23 obs‑test) | ✅ Closed |
| **D‑07** | **Merge conflict** `api.ts` — thiếu dấu `}` đóng hàm | S3 | **Integration** (git rebase lên origin/main) | Teammate thêm `askQuestionStream` **cùng vị trí** mình thêm binding Narration → xung đột + mất `}` đóng `askQuestionStream` | Giữ **cả hai** khối + khôi phục `}` — resolve trong `f2867fa` | `tsc --noEmit` **clean** | ✅ Closed |

---

## Thống kê & bài học (LN10/LN11)

- **Tổng defect ghi nhận (đợt Narration + MLOps):** 7 — S1:1, S2:2, S3:3, S4:1. **Đã đóng 7/7.**
- **Phân bố theo test level:** phần lớn lỗi bị **E2E/Integration** bắt (D‑01, D‑02, D‑05, D‑07),
  minh hoạ đúng luận điểm LN10: *"test cho thấy sự hiện diện, không phải sự vắng mặt của lỗi"* — unit
  test xanh không đủ, phải drive end‑to‑end mới lộ D‑01/D‑02.
- **Regression matters:** D‑03/D‑04 chỉ lộ khi chạy **full suite sau khi merge** → khẳng định giá
  trị của **regression testing** trong CI (LN10 top‑down/bottom‑up integration).
- **Defect management (LN11 bước 6):** mỗi lỗi có ID · severity · nguồn · nguyên nhân gốc · commit
  fix · retest — đủ vòng đời quản lý lỗi; nguồn phát hiện = pytest/vitest/Playwright + verify thủ công.
- **Fix an toàn:** D‑01 là *defensive fix* (optional chaining) cũng bảo vệ **production** khi API
  đổi schema — không chỉ chữa test.

> Nguồn: git history `f2867fa` (Narration), `f4cc35d` (MLOps), + log chạy pytest/Playwright trong quá
> trình phát triển. Có thể mở rộng khi phát sinh lỗi mới trong các sprint sau.
