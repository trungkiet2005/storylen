# StoryLens — Test Design Supplement (LN10)

> **Mục đích:** bổ sung 3 kỹ thuật thiết kế test case môn CNPM yêu cầu tường minh (LN10):
> **Equivalence Partitioning (EP)**, **Boundary Value Analysis (BVA)**, và **White‑box / Path testing**
> (cyclomatic complexity). Các bảng dùng **field & hằng số thật** trong `config.py`/SRS và **map tới
> test thật** trong `backend/tests/` + `frontend/__tests__/`.

---

## 1. Black‑box: Equivalence Partitioning + Boundary Value

### 1.1 Upload — kích thước file (`MAX_FILE_SIZE_MB = 20`)
| Lớp tương đương | Loại | Đại diện | Kết quả kỳ vọng |
|---|---|---|---|
| 0 byte | Không hợp lệ | `0` | 400 "file rỗng" |
| 1 B … 20 MB | **Hợp lệ** | `5 MB` | 200, vào pipeline |
| > 20 MB | Không hợp lệ | `25 MB` | 413/400 "quá lớn" |

**Boundary values:** `0`, `1 B`, **`20 MB` (biên trong)**, **`20 MB + 1 B` (biên ngoài)** → test tại
các mốc, không chỉ giữa lớp.

### 1.2 Upload — đuôi file (`ALLOWED_EXTENSIONS = jpg,jpeg,png,webp`)
| Lớp | Đại diện | Kỳ vọng |
|---|---|---|
| Hợp lệ | `a.png`, `a.webp` | Chấp nhận (+ `verify()` Pillow) |
| Sai đuôi | `a.gif`, `a.bmp` | Từ chối |
| **MIME‑spoof** (đổi tên `.jpg` cho file script) | `evil.jpg` (bytes ≠ ảnh) | Từ chối (bug‑class D‑của security) |

### 1.3 Credit (FREE = 5/ngày, cost = 1)
| Lớp | Đại diện | Kỳ vọng | Test thật |
|---|---|---|---|
| Đủ credit (≥1) | `5` | 200, trừ 1 | `test_narrate_page_success` |
| **Hết credit (=0)** | `0` | **402** Payment Required | `test_narrate_page_insufficient_credits` |

**BVA:** `0` (chặn) · `1` (cho qua, còn 0). Test khẳng định credit được **gate TRƯỚC khi gọi model**
(`called["n"] is False`) — tránh tốn tài nguyên AI khi hết tiền.

### 1.4 Narration — số trang chương (`NARRATION_MAX_CHAPTER_PAGES = 60`)
| Lớp | Đại diện | Kỳ vọng | Test thật |
|---|---|---|---|
| Rỗng (0) | `0` | 404 | `test_recap_chapter_empty_returns_404` |
| 1 … 60 | `40` | 200, chạy job | `test_narrate_chapter_starts_job` |
| > 60 | `100` | 400 "quá dài" | `test_recap_chapter_too_many_pages_returns_400` |

**BVA:** `0`, `1`, **`60`**, **`61`**.

### 1.5 TTS rate — regex `^[+-]\d{1,3}%$`
| Lớp | Đại diện | Kỳ vọng |
|---|---|---|
| Hợp lệ | `+0%`, `-10%`, `+25%` | Dùng nguyên |
| Sai định dạng | `10`, `abc`, `+1000%` (4 digit) | Rơi về `+0%` (fail‑safe) |

### 1.6 Q&A — độ dài câu hỏi (SRS: 1..2000)
**BVA:** `0` (rỗng → 400) · `1` (min hợp lệ) · `2000` (max hợp lệ) · `2001` (vượt → 422).

---

## 2. White‑box: Path testing + Cyclomatic Complexity

Hàm mục tiêu (thật): `services/narration.py :: generate_script()` — quyết định VLM vs fallback.

```python
def generate_script(image_bytes, dialogue_lines, *, model=None, allow_fallback=True):
    prompt = build_narration_prompt(dialogue_lines)
    try:
        script = vlm_client.describe_image(image_bytes, prompt, model=model).strip()
        if script:                                   # D1
            return script, "vlm"
        raise vlm_client.VLMError("empty script")
    except vlm_client.VLMError as exc:               # D2 (nhánh except)
        if allow_fallback and dialogue_lines:        # D3, D4 (AND → 2 điều kiện)
            return _dialogue_fallback_script(dialogue_lines), "dialogue_fallback"
        raise NarrationError(...) from exc
```

### 2.1 Control‑flow & độ phức tạp
- **Điểm quyết định:** D1 (`if script`), D2 (except bắt VLMError), D3 (`allow_fallback`), D4 (`dialogue_lines`).
- **Cyclomatic Complexity** ≈ *predicates + 1* = **4 + 1 = 5** → cần **≥5 đường độc lập** để phủ path.

### 2.2 Các đường độc lập & test thật ánh xạ
| Path | Kịch bản | Kỳ vọng | Test thật (`test_narration_service.py`) |
|---|---|---|---|
| **P1** | VLM trả script non‑rỗng | `("...", "vlm")` | `test_generate_script_uses_vlm` |
| **P2** | VLM raise → có fallback + có thoại | `(joined, "dialogue_fallback")` | `test_generate_script_falls_back_to_dialogue_on_vlm_error` |
| **P3** | VLM raise → `allow_fallback` nhưng **không thoại** | raise `NarrationError` | `test_generate_script_raises_when_no_fallback_available` |
| **P4** | VLM trả rỗng → raise nội bộ → fallback path | như P2/P3 tuỳ thoại | phủ bởi P2 + retry/CB test `test_vlm_client` |
| **P5** | VLM raise, `allow_fallback=False` | raise `NarrationError` | (bổ sung 1 assert `allow_fallback=False`) |

> Kết quả: 3/5 path đã có test đích danh; P4 phủ gián tiếp; **P5** là gợi ý bổ sung 1 test (đã ghi).
> Đây là minh hoạ *structural/path testing* + *cyclomatic complexity* mà LN10 yêu cầu.

---

## 3. Bản đồ test level ↔ artifact (LN10/LN11)

| Test level | Công cụ | Nơi | Vai trò |
|---|---|---|---|
| Unit/Component | pytest · Vitest+RTL | `backend/tests`, `frontend/__tests__` | Bắt lỗi logic sớm (đáy pyramid) |
| Integration | pytest + `respx` + FakeSupabase + TestClient | `test_*_router.py`, `test_observability_router.py` | Ghép router↔service↔model (mock ngoài) |
| System / E2E | Playwright | `frontend/e2e` | Drive thật trên browser (bắt D‑01, D‑02) |
| Acceptance (UAT) | Katalon + kịch bản người dùng | `PA5` | Khách nghiệm thu theo tiêu chí (xem MANAGEMENT_PLANS) |

**Test pyramid:** unit/component (≫) > integration > E2E — đúng khuyến nghị LN11.
