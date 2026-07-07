# RAG Q&A → "Trợ lý đọc truyện" (streaming + multi-turn + inline citations)

**Ngày:** 2026-07-07 · **Nhánh:** `feature/rag-assistant-streaming`

## Mục tiêu
Nâng RAG Q&A (đã live) trong `QAChatPanel` (reader chương) thành trợ lý hội thoại:
1. **Streaming** — câu trả lời chạy chữ dần (Gemini `generate_content_stream`).
2. **Multi-turn** — hỏi tiếp hiểu ngữ cảnh (truyền lịch sử hội thoại).
3. **Inline citations `[n]`** — trong câu trả lời có số nguồn click được → nhảy + highlight bong bóng.

## Backend
- **`POST /v1/qa/stream`** → `StreamingResponse` NDJSON (hợp POST + cookie; SSE chỉ GET).
  Sự kiện: `{"type":"sources","sources":[...]}` → nhiều `{"type":"token","text":...}` → `{"type":"done"}` / `{"type":"error"}`.
- **`rag.answer_question_stream(question, user_id, history, page_id, series_id)`** (generator):
  - Retrieval query = **`lượt hỏi trước + câu hỏi hiện tại`** (nối chuỗi — không tốn thêm 1 LLM call).
  - embed → `_search()` (owner-scoped RPC, tách helper dùng chung với `answer_question`) → `_enrich_sources` → yield `sources`.
  - `_stream_answer()`: prompt (context đánh số + ~6 lượt gần nhất + "chèn [n] khi dùng nguồn") → `generate_content_stream` yield token. Key-rotation **chỉ khi chưa yield token nào** (tránh lặp).
  - Fallback trung thực: embed lỗi → page context (nếu có page) / thông báo; search lỗi vs rỗng phân biệt.
- **Credit:** `check_has_credits` trước; **trừ 1 credit ở cuối stream** khi có `done` (stream đứt giữa chừng → không trừ). Lưu `qa_history` sau khi xong.
- `schemas`: `QAMessage{role,content}`, `QAStreamRequest{question,page_id,series_id,history[]}`.
- Giữ nguyên `/v1/qa` (non-stream) cho trang `/qa` + tương thích.

## Frontend
- **`api.ts` `askQuestionStream(payload, {onSources,onToken,onDone,onError})`** — `fetch` + `response.body.getReader()`, parse NDJSON theo dòng, `credentials: "include"`. Pattern streaming đầu tiên của repo, hàm riêng (không phá `request()`).
- **`QAChatPanel`**: gửi kèm `history` (map từ messages); render token khi tới (message assistant "đang chạy"); **parse `[n]`** trong text → chip đỏ click → `onOpenSource(sources[n-1])`.
- Chỉ làm ở `QAChatPanel` (reader chương). Trang `/qa` standalone giữ non-stream.

## Test & verify
- `tests/test_rag_stream.py`: mock `embed_query` + supabase + `generate_content_stream` → assert thứ tự event (sources → token* → done), fallback, và retrieval-query nối chuỗi.
- tsc + pytest xanh. Verify local: script gọi generator + chạy server + test trên browser. Rồi mới push (flow cũ).

## Ngoài phạm vi
Không đụng ai_module/HF Space. Không "condense câu hỏi bằng LLM" (nâng cấp sau). Không đụng translation.

## Rủi ro
- Streaming qua threadpool (route `def` + `StreamingResponse` sync gen) — Gemini stream blocking chạy trong threadpool, OK.
- Trừ credit cuối stream: nếu client ngắt kết nối giữa chừng, generator có thể không chạy tới `done` → không trừ (chấp nhận được).
