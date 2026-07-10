# StoryLens — SAD Supplement: Process View (4+1) & Architecture Decision Records

> **Bổ sung cho** `Software Architecture Document (SAD) - StoryLens.md`. Lấp 2 khoảng trống so với
> chuẩn môn (LN06): (1) mô hình **4+1** thiếu **Process View** (góc nhìn runtime/đồng thời);
> (2) các quyết định kiến trúc đang ở dạng bảng "Key Design Decisions" — nâng lên **ADR chuẩn**
> (Issue / Status / Context / Decision / Alternatives / Consequences).
>
> Nội dung dưới đây **mô tả đúng hệ thống đang chạy** (theo `CLAUDE.md` + code backend), không thêm
> tính năng mới.

---

## 1. Vị trí trong mô hình 4+1 (Kruchten)

| View | Trả lời | Trong tài liệu nào |
|---|---|---|
| **Logical View** | Chức năng, thành phần nghiệp vụ | SAD §4 |
| **Development (Implementation) View** | Tổ chức mã nguồn | SAD §6 (source tree) |
| **Physical (Deployment) View** | Chạy ở đâu, node/protocol | SAD §5 + `deployment_diagram.png` |
| **Process View** ⟵ *bổ sung ở đây* | Tiến trình, luồng, đồng thời, đồng bộ | **§2 tài liệu này** |
| **+1 Scenarios (Use Cases)** | Ràng buộc các view | SAD §3 + `run_ucspec` |

---

## 2. Process View — Góc nhìn tiến trình & đồng thời

### 2.1 Các tiến trình / luồng thực thi (runtime processes)

| Tiến trình | Loại | Vai trò | Kênh giao tiếp |
|---|---|---|---|
| **Frontend (Next.js)** | Process (Vercel) | Render UI, gọi API qua `lib/api.ts` | HTTPS → Backend; WSS → Backend |
| **Backend API (FastAPI/uvicorn)** | Process (Render) | Router + service layer, điều phối pipeline | HTTP → AI Module, Gemini; TCP → Supabase |
| **AI Module (FastAPI + PyTorch)** | Process (HF Spaces) | YOLOv8 → manga-ocr → inpaint | HTTP (nhận ảnh, trả PNG dịch) |
| **Background worker threads** | Thread trong Backend | Xử lý dịch bất đồng bộ mỗi trang | `threading` + `BoundedSemaphore` |
| **WebSocket hub + event bus** | Thread/async trong Backend | Đẩy tiến độ realtime, replay khi reconnect | WSS `/v1/ws/batch/{id}` |

### 2.2 Luồng đồng thời — pipeline Upload → Translate (tuần tự hoá & song song)

```
Client ──POST /v1/upload──▶ Backend (main thread)
                              │  ghi ảnh gốc → Supabase Storage (manga-originals)
                              │  trả 202 + page_ids/batch_id  (KHÔNG chặn client)
                              ▼
                     spawn worker thread mỗi trang
                              │  acquire(BoundedSemaphore)   ← giới hạn N trang song song
                              ▼
        ai_pipeline.process_page(page):
            ├─ [checkpoint cancel?] ── threading.Event ──▶ nếu set → dừng sạch
            ├─ POST AI Module /translate/with-form/image   (YOLOv8→OCR→inpaint)
            ├─ Gemini translate (key-pool rotation)
            ├─ ghi manga_pages + bubble_data
            ├─ Gemini embedding → pgvector (embeddings)
            └─ emit event ──▶ event bus ──▶ WebSocket ──▶ Client (progress %)
                              │  release(semaphore)
```

**Điểm đồng thời đáng chú ý:**
- **Bounded concurrency:** `BoundedSemaphore` chặn số trang xử lý song song → bảo vệ RAM 512MB
  của Render free tier và tránh vượt quota Gemini (RPD).
- **Non-blocking upload:** client nhận `202 Accepted` ngay; tiến độ đẩy qua WebSocket, có
  **polling fallback** nếu WS rớt; **event bus replay** các event bị lỡ khi reconnect.
- **Cooperative cancellation:** `POST /v1/status/{page_id}/cancel` bật một `threading.Event`;
  pipeline kiểm tra Event ở các *safe checkpoint* → hủy mà không để lại trạng thái rác.
- **Idempotency:** `Idempotency-Key` (header từ `lib/api.ts`) chống double-submit khi client retry.

### 2.3 Đồng bộ & tài nguyên chia sẻ

| Cơ chế | Bảo vệ điều gì |
|---|---|
| `BoundedSemaphore` | Số worker dịch đồng thời (CPU/RAM/quota) |
| `threading.Event` (per page) | Tín hiệu hủy hợp tác |
| Gemini **key-pool rotation** | Chống cạn quota 1 key; `POST /v1/admin/health/gemini/reload` nạp key nóng |
| Postgres **triggers** (forum hot_score, counters) | Nhất quán số liệu, tránh race ở tầng app |
| TTL cache (`ai_module_source`) | Tránh đọc DB mỗi lần gọi translate; admin ghi → invalidate |
| Supabase connection pool | Giới hạn kết nối DB đồng thời |

### 2.4 Rủi ro runtime & giảm thiểu (liên kết Risk Register R2/R3/R8)

- **Cold start** (Render/HF free tier ngủ) → keep-alive workflow + retry cold-start trong `api.ts`.
- **AI module unreachable** → `/health/deep` báo `ai_module: degraded`, pipeline xuống nhã (graceful).
- **Gemini quota** → key-pool + caching (R2).

---

## 3. Architecture Decision Records (ADR)

> Định dạng chuẩn LN06: mỗi quyết định gồm **Issue, Status, Context, Decision, Alternatives,
> Consequences**. Rút gọn từ mục "Key Design Decisions" và hiện thực thực tế.

### ADR-001 — Tách AI Module thành service riêng
- **Issue:** Model ML nặng (~4GB) có nên nằm trong backend?
- **Status:** Accepted (đã triển khai).
- **Context:** Backend deploy Render free tier 512MB RAM, không tải nổi YOLOv8 + manga-ocr + inpaint.
- **Decision:** Tách `ai_module/` (FastAPI + PyTorch) chạy riêng trên HuggingFace Spaces; backend gọi qua HTTP.
- **Alternatives:** (a) nhét model vào backend — vượt RAM; (b) chạy model client-side — không khả thi cho OCR tiếng Nhật.
- **Consequences:** ✅ backend nhẹ, scale độc lập, đổi nguồn AI runtime qua `app_settings`. ⚠️ thêm 1 network hop + rủi ro service ngủ (bù bằng graceful degradation).

### ADR-002 — Xác thực bằng HTTP-only cookie (không lưu token ở localStorage)
- **Issue:** Lưu access token ở đâu?
- **Status:** Accepted.
- **Context:** Cần chống XSS đánh cắp token; SPA cross-domain (Vercel ↔ Render).
- **Decision:** Backend phát **HTTP-only cookie** sau login; JS không đọc được token. Prod: `Secure=true`, `SameSite=none`.
- **Alternatives:** JWT trong localStorage (dễ bị XSS); session server-side thuần (khó cross-domain).
- **Consequences:** ✅ an toàn XSS, tự refresh. ⚠️ phải cấu hình CORS + cookie cross-site cẩn thận.

### ADR-003 — Vector store: pgvector thay cho ChromaDB/FAISS
- **Issue:** Lưu embedding cho RAG ở đâu?
- **Status:** Accepted (đổi từ kế hoạch ban đầu ChromaDB — xem SDP revision).
- **Context:** Đã dùng Supabase Postgres; muốn 1 nguồn dữ liệu, có RLS + owner-scoping.
- **Decision:** Dùng **pgvector** (768-dim, cosine) + RPC `match_embeddings` **owner-scoped** (đóng luôn lỗ IDOR).
- **Alternatives:** ChromaDB/FAISS (thêm hạ tầng, khó scale — R4); Pinecone/Weaviate (tốn phí/khoá nhà cung cấp).
- **Consequences:** ✅ 1 DB, bảo mật theo owner, `min_similarity` floor. ⚠️ phụ thuộc Postgres cho cả vector search.

### ADR-004 — Sinh embedding ở BACKEND (không ở AI Module)
- **Issue:** Ai tạo embedding cho RAG?
- **Status:** Accepted.
- **Context:** Ràng buộc "không load model ML trên Render"; muốn cùng model cho cả chunk lẫn query.
- **Decision:** `services/embedding.py` gọi **Gemini embedding API** (`gemini-embedding-001`, L2-norm, task_type DOCUMENT/QUERY). AI Module **không** trả embedding.
- **Alternatives:** Embedding cục bộ (vi phạm ràng buộc RAM); embedding ở AI Module (lệch model chunk vs query).
- **Consequences:** ✅ đồng nhất không gian vector, backend không cần GPU. ⚠️ mỗi lần embed là 1 API call (bù bằng batch + backfill script).

### ADR-005 — Đồng thời có chặn + hủy hợp tác cho pipeline dịch
- **Issue:** Xử lý nhiều trang song song mà không sập RAM/quota, và cho phép hủy.
- **Status:** Accepted.
- **Context:** Batch upload nhiều trang; Render RAM thấp; Gemini có RPD.
- **Decision:** Worker thread + **`BoundedSemaphore`** giới hạn song song; **`threading.Event`** cho cancel ở safe checkpoint; tiến độ qua WebSocket + event bus (replay).
- **Alternatives:** Xử lý tuần tự (chậm); message queue/Celery (thừa cho quy mô đồ án).
- **Consequences:** ✅ ổn định, realtime, hủy sạch. ⚠️ logic đồng bộ trong-tiến-trình phải cẩn thận (checkpoint đúng chỗ).

### ADR-006 — Gemini API key-pool rotation
- **Issue:** 1 key Gemini free tier = 500 RPD, không đủ.
- **Status:** Accepted.
- **Context:** Dịch + Q&A + embedding đều gọi Gemini; zero-budget.
- **Decision:** `GEMINI_API_KEY` nhận **danh sách key**; xoay vòng khi cạn; nạp nóng qua `POST /v1/admin/health/gemini/reload`.
- **Alternatives:** Trả phí (vượt ngân sách 0đ); giảm tính năng.
- **Consequences:** ✅ ~4 key ≈ 2000 RPD, không downtime khi 1 key cạn. ⚠️ phải quản lý nhiều secret; theo dõi usage (Risk R2).

---

## 4. Ghi chú quan hệ Use Case (include / extend)

Bổ sung ngắn cho `run_ucspec` (LN05) — nên ghi rõ vào spec khi có dịp:

| Quan hệ | Ví dụ trong StoryLens |
|---|---|
| `<<include>>` (bắt buộc) | UC01 Upload **include** "Trừ 1 credit"; UC03 Q&A **include** "Trừ 1 credit" |
| `<<include>>` | UC01 Upload **include** "Chạy AI pipeline (OCR→dịch→embed)" |
| `<<extend>>` (điều kiện) | UC02 Reader **extend** "Sửa bản dịch bubble" (chỉ owner); UC03 **extend** "Xem citation nguồn" |
| `generalization` | Actor *Content Creator* kế thừa *Registered User* |
