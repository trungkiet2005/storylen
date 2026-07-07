# RAG Q&A với trích dẫn nguồn — Design Spec

**Ngày:** 2026-07-07
**Nhánh:** `feature/rag-qa-citations`
**Mục tiêu demo:** làm chức năng Hỏi–đáp (Q&A) "chín" end-to-end, không nửa vời.

---

## 1. Bối cảnh & vấn đề

Trang `/qa` hiện tại **về cơ bản luôn trả lời rỗng**. Ba mắt xích RAG đều đứt:

1. **Bảng `embeddings` không bao giờ được ghi.** Pipeline gọi `call_translate`
   (ai_module `/translate/storylens`) — response **không có** field `embedding`.
   Nên `ai_pipeline.py:199` `embedding = b.get("embedding")` **luôn None** →
   `db_embedding_rows` rỗng. Code duy nhất trả embedding (`hf_client.call_process`)
   không ai gọi.
2. **Embed câu hỏi trỏ vào service khác, đã chết.** `rag.py` gọi `call_embed` →
   `HF_SPACE_URL/embed` (mặc định `localhost:7860`) — khác `AI_MODULE_URL`.
3. **UI luôn hỏi "toàn cục".** `qa/page.tsx` gọi `askQuestion({ question })` không
   kèm phạm vi → nhánh general + bảng rỗng → luôn "không tìm thấy thông tin".

Ngoài ra: bảng thực tế là `vector(384)` (CLAUDE.md ghi sai 1536); RPC
`match_embeddings` **không lọc theo ngưỡng** và **không lọc theo chủ sở hữu**
(backend dùng service-role key → bỏ qua RLS → IDOR: hỏi được page của người khác).

## 2. Kết quả mong muốn ("definition of done")

| # | Hạng mục |
|---|----------|
| 1 | `embeddings` được ghi thật khi dịch xong + script backfill cho data đã dịch |
| 2 | Embed câu hỏi **cùng model** với embed tài liệu (cosine đúng) |
| 3 | Vector search có **ngưỡng similarity** (`RAG_MIN_SIMILARITY`) |
| 4 | Trích dẫn có ý nghĩa: mỗi câu trả lời hiện bubble/trang đã dùng (gốc→dịch, % khớp), **bấm nhảy vào `/reader?page=`** |
| 5 | UI chọn phạm vi hỏi: Tất cả truyện của tôi / 1 bộ |
| 6 | States (rỗng/loading/lỗi) + gợi ý + **fallback trung thực** (không giả vờ hoạt động) |

Kèm theo (hệ quả tự nhiên, không phải "task bảo mật riêng"): mọi truy vấn RAG
**lọc theo `user_id`** → đóng luôn IDOR.

## 3. Quyết định kiến trúc

**Nguồn embedding = Backend gọi Gemini Embedding API** (Approach A).
- Model: `gemini-embedding-001`, `output_dimensionality=768`, L2-normalize.
- `task_type`: `RETRIEVAL_DOCUMENT` khi ghi, `RETRIEVAL_QUERY` khi hỏi (bất đối xứng → retrieval tốt hơn).
- Dùng lại `GEMINI_API_KEY` (có sẵn) + key rotation. Không load model trên Render
  (chỉ gọi API — không vi phạm "no ML in backend"). Không phụ thuộc HF Space/GPU
  có thức hay không → demo ổn định.
- Bảng `embeddings` đang **rỗng** → đổi cột sang `vector(768)` **không mất data**.

## 4. Luồng dữ liệu

```
GHI (dịch xong / backfill):
  translated_text → embed_documents() [768-d, normalized] → bảng embeddings
HỎI:
  câu hỏi → embed_query() → match_embeddings(top_k, min_similarity,
            filter_user_id, filter_series_id|filter_page_id)
          → bubbles liên quan → enrich (gốc + page_number)
          → Gemini sinh answer → { answer, sources[] }
UI /qa:
  [Phạm vi ▾] + chat → answer + thẻ trích dẫn (gốc→dịch, %khớp, link reader)
```

## 5. Thay đổi cụ thể

### Backend
1. `supabase_migration_v7_rag.sql` (mới): đổi `embeddings.embedding` → `vector(768)`
   (drop + add vì bảng rỗng); `match_embeddings` viết lại: thêm `min_similarity FLOAT`,
   `filter_user_id UUID`, trả thêm `bubble_id`; lọc `similarity >= min_similarity`
   và `page_id ∈ pages của user`; index ivfflat cosine.
2. `config.py`: `GEMINI_EMBED_MODEL="gemini-embedding-001"`, `EMBED_DIM=768`,
   `RAG_MIN_SIMILARITY=0.55`.
3. `services/embedding.py` (mới): pool client Gemini (giống pattern rag), hàm
   `embed_documents(list[str]) -> list[list[float]]`, `embed_query(str) -> list[float]`,
   L2-normalize, key rotation, batch.
4. `services/rag.py`: thay `call_embed` → `embed_query`; thêm `user_id` bắt buộc;
   truyền `min_similarity`; **enrich sources** (query `bubble_data` lấy gốc +
   `manga_pages.page_number`); build `QASource`. Fallback DB cũng lọc `user_id`.
5. `models/schemas.py`: thêm `QASource`; `QAResponse.sources: list[QASource] = []`
   (giữ `source_chunks` để tương thích ngược).
6. `routers/qa.py`: truyền `user_id=user.id` vào `answer_question`; nếu có `page_id`,
   verify ownership.
7. `services/ai_pipeline.py`: sau khi dựng bản dịch, `embed_documents` toàn bộ bubble
   của trang trong 1 lượt → `db_embedding_rows`. Best-effort (lỗi embed không làm hỏng
   bản dịch, chỉ log).
8. `scripts/backfill_embeddings.py` (mới): duyệt bubble đã dịch mà chưa có embedding,
   embed + upsert. Chạy tay để demo có data.

### Frontend
9. `lib/api.ts`: thêm `QASource`; `QAResponse.sources`; `askQuestion` giữ `series_id`.
10. `app/qa/page.tsx`: bộ chọn phạm vi (nạp từ `listSeries()`), thẻ trích dẫn (gốc→dịch,
    %khớp, link `/reader?page=`), gợi ý/loading/empty + fallback rõ ràng.

### Docs
11. Sửa CLAUDE.md: `embeddings` 384→768; mô tả lại luồng RAG cho đúng.

## 6. Kiểm thử

- **Backend unit** (`tests/test_rag.py`): monkeypatch `embed_query`, `get_supabase`,
  `_generate_answer` — assert:
  - lọc theo ngưỡng (chunk dưới ngưỡng bị loại),
  - sources được enrich đúng (gốc + reader_url),
  - fallback khi embed lỗi / không có chunk,
  - `filter_user_id` được truyền vào RPC.
- **Frontend**: `tsc --noEmit` xanh; vitest cho component nếu thêm.
- **Demo verify tay**: upload→dịch 1 trang → hỏi → thấy answer có trích dẫn click được.

## 7. Ngoài phạm vi (giữ gọn)

Không đụng ai_module/HF Space; không làm cross-page glossary; không sửa các vấn đề
bảo mật/perf/CI khác; chat Q&A trong reader để nguyên (chỉ nâng trang `/qa`).

## 8. Rủi ro

- Cần `GEMINI_API_KEY` thật để chạy end-to-end (embed + answer). Unit test mock,
  không cần key. Demo thật cần key trong `backend/.env`.
- `output_dimensionality` cần google-genai đủ mới; nếu SDK cũ không hỗ trợ → fallback
  dùng dim mặc định của model và migration chỉnh theo (ghi rõ trong embedding.py).
