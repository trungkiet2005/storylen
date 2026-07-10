# StoryLens — Responsible AI & Ethics (LN12)

> **Mục đích:** đối chiếu StoryLens với **AI Ethics (LN12)** — 5 nguyên tắc **T‑F‑P‑S‑A**, nhận diện
> **thiên vị (bias)**, và các định nghĩa **fairness** — gắn vào **module thật** của hệ thống. StoryLens
> là hệ "SE for AI systems": có 4 mô hình AI (YOLOv8 detect, manga‑ocr OCR, Gemini dịch/RAG, VLM
> qwen2.5‑vl kể chuyện) + dữ liệu người dùng, nên phần đạo đức là **bắt buộc**, không phải "nice to have".

---

## 1. Năm nguyên tắc T‑F‑P‑S‑A áp dụng vào StoryLens

| Nguyên tắc | Rủi ro trong StoryLens | Biện pháp ĐÃ có trong hệ thống | Còn hạn chế |
|---|---|---|---|
| **Transparency** (minh bạch) | Người đọc tưởng bản dịch/áp lời kể là "chính xác 100%" | ▸ Q&A trả về **trích dẫn click được** (`sources[]`, bubble→page). ▸ Reader hiện **OCR confidence** + `review_status` từng bong bóng. ▸ Listen mode gắn nhãn **"đọc thoại"** khi VLM fail (dialogue_fallback) — không giả vờ là AI mô tả. ▸ Bubble Dictionary hiện romaji + alt‑translation + nguồn. | Chưa hiện "độ tin cậy" tổng cho bản dịch cả trang |
| **Fairness / Justice** | Model dịch/OCR/VLM chạy tốt hơn với 1 phong cách vẽ / 1 nhóm ngôn ngữ | ▸ Cho phép **người dùng sửa bản dịch** (`translation_history` + review) → con người ghi đè máy. ▸ A/B testing hạ tầng để so model. | Chưa đo hiệu năng **theo sub‑population** (thể loại/tác giả) — xem §3 |
| **Privacy** (riêng tư) | Ảnh manga người dùng upload + lịch sử đọc/hỏi là dữ liệu cá nhân | ▸ Bucket `manga‑originals`/`manga‑thumbnails`/`manga‑audio` **private**, chỉ **signed URL** hết hạn. ▸ **Supabase RLS** service‑role‑only cho metrics. ▸ Auth token trong **HTTP‑only cookie** (JS không đọc được). ▸ **GDPR: `GET /auth/export-data`** (xuất toàn bộ dữ liệu) + **`delete_account`** (xoá vĩnh viễn). ▸ Cookie consent gate cho analytics. | Ảnh gửi sang Gemini/HF Space (bên thứ ba) — cần nêu rõ trong ToS |
| **Safety & Security** | Prompt injection, SSRF khi import, nội dung độc hại, model "bịa" | ▸ **SSRF allowlist** domain trong `scraper.py`. ▸ MIME‑spoof reject (`image_validation`). ▸ CSP + security headers + Turnstile captcha. ▸ RAG **fallback về context** khi Gemini rỗng → không bịa tự do. ▸ Rate limit mọi endpoint. | Chưa lọc nội dung NSFW/độc hại của manga |
| **Accountability** (trách nhiệm giải trình) | Ai chịu trách nhiệm khi AI sai? | ▸ **Human‑in‑the‑loop**: user duyệt/sửa bản dịch. ▸ **`audit_logs`** cho hành động admin. ▸ **Credit system** ghi vết mọi lượt dùng AI (`credit_transactions`, `reference_id`). ▸ **model_monitor + ai_telemetry**: drift alert, per‑model latency/cost → giám sát được. | Chưa có quy trình "appeal/redress" chính thức cho user |

---

## 2. Đối chiếu 11 vấn đề đạo đức AI (LN12) — cái nào chạm StoryLens

| Vấn đề | Có liên quan? | Ghi chú |
|---|---|---|
| Privacy & Surveillance | ✅ Cao | Ảnh + hành vi đọc; đã có RLS/signed URL/GDPR (xem §1). |
| Bias (thiên vị) | ✅ Cao | Dataset + model — phân tích ở §3. |
| Opacity ("hộp đen") | ✅ Vừa | Giảm nhờ citation + confidence + fallback badge. |
| Security | ✅ Vừa | SSRF/MIME/CSP/rate‑limit/captcha. |
| Manipulation | ⚠️ Thấp | Lời kể VLM có thể "kịch hoá"; đã gắn nhãn nguồn. |
| Artificial Stupidity (dễ bị đánh lừa) | ⚠️ Thấp | OCR/VLM sai trên ảnh mờ → có confidence + human review. |
| Unemployment / Inequality / Evil genies / Robot rights / Singularity | ❌ Không | Ngoài phạm vi đồ án. |

---

## 3. Phân tích thiên vị (bias) — 3 loại theo LN12

### 3.1 Preexisting bias (có sẵn trong dữ liệu/xã hội)
- **Dataset huấn luyện detector/OCR = Manga109‑s**: 100% **manga Nhật**, phong cách vẽ & bố cục bong
  bóng đặc thù Nhật → detect/OCR **kém hơn** với manhwa (Hàn, khung dọc), manhua (Trung), webtoon,
  hay truyện vẽ tay phi chuẩn. Đây là *preexisting bias* của nguồn dữ liệu.
- **Gemini (dịch + RAG)**: huấn luyện trên web → có thể mang **định kiến giới/văn hoá** khi dịch
  đại từ nhân xưng, kính ngữ (Nhật ⇄ Việt), tên riêng.

### 3.2 Technical bias (do lựa chọn kỹ thuật)
- Ngưỡng detector (`box_threshold=0.3`) + `RAG_TOP_K=5` là hằng số → tối ưu cho *đa số* trang, có
  thể bỏ sót SFX/furigana nhỏ hoặc ngữ cảnh dài.
- VLM `qwen2.5vl` sinh lời kể có thể **áp đặt diễn giải** nhân vật (giới, cảm xúc) từ nét vẽ ⇒
  technical bias khi mô tả.

### 3.3 Emergent bias (nảy sinh khi dùng thực tế)
- Nếu người dùng chủ yếu upload 1 thể loại, dữ liệu `translation_history`/feedback lệch → vòng
  lặp cải thiện (nếu có) sẽ **khuếch đại** thiên vị về thể loại đó.

### 3.4 Fairness definitions (LN12) & "Fairness by Unawareness thất bại"
- StoryLens **không dùng thuộc tính nhạy cảm** của người dùng để ra quyết định model → nhưng lưu ý
  **proxy variable**: *thể loại/nguồn truyện* có thể là proxy cho *ngôn ngữ/khu vực* → "unawareness"
  không đủ. Cần đo theo **Equality of Opportunity** *giữa các sub‑population* (xem §4).

---

## 4. Hành động đề xuất (đo được, bám môn)
1. **Đo hiệu năng theo sub‑population**: tách CER/mAP theo *nguồn* (manga Nhật vs manhwa vs manhua)
   trong `ml_evaluation` → phát hiện fairness gap (Equality of Opportunity).
2. **Nhãn phạm vi model**: hiện cảnh báo UI khi ảnh không giống phân bố huấn luyện (out‑of‑distribution).
3. **Điều khoản dữ liệu**: nêu rõ trong ToS rằng ảnh được gửi tới Gemini/HF Space; cho **opt‑out**.
4. **Redress**: nút "báo cáo bản dịch sai" → hàng đợi review (mở rộng từ `translation_feedback` đã có).

---

## 5. Tổng kết
StoryLens **đã hiện thực hoá** phần lớn 5 trụ T‑F‑P‑S‑A ở mức **kỹ thuật thật** (không chỉ tuyên bố):
human‑in‑the‑loop, citation/confidence, RLS + signed URL + **GDPR export/delete**, SSRF/MIME/CSP,
audit log + credit ledger + drift monitoring. Khoảng trống còn lại chủ yếu là **đo bias theo
sub‑population** và **quy trình redress** — đã ghi rõ ở §4 để có hướng cải thiện.

> Tham chiếu module: `services/{rag,dictionary,scraper,image_validation,ai_pipeline}.py`,
> `routers/auth.py` (export‑data/delete‑account), `middleware.py` (CSP), `services/captcha.py`,
> `model_monitor.py` + `ai_telemetry.py`, bucket policy `supabase_migration_v8/v9`.
