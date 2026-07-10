# StoryLens — Sequence Diagrams (Detailed Design · dynamic view)

> **Mục đích:** bổ sung **biểu đồ tuần tự (sequence diagram)** cho phần *Detailed Design* của môn
> CNPM (LN02 §Design → SDD; LN03b §system design; LN06). Ba biểu đồ dưới mô tả **hành vi động** của
> 3 use case lõi, **suy ra trực tiếp từ code thật** (router + service), bổ sung cho class diagram
> (`storylens-sad.drawio` F1) vốn chỉ mô tả cấu trúc tĩnh.
>
> Nguồn code: `backend/app/routers/{upload,qa,narration}.py`,
> `services/{ai_pipeline,ai_module_client,rag,narration,vlm_client,tts,ai_telemetry}.py`.

---

## UC-01 — Upload & Translate a manga page

Actor tải ảnh; hệ thống dịch bất đồng bộ (background thread) và đẩy tiến độ qua WebSocket.

```mermaid
sequenceDiagram
    autonumber
    actor U as User (browser)
    participant FE as Frontend (api.ts)
    participant UP as upload router
    participant IV as image_validation
    participant CR as credit_service
    participant ST as Supabase Storage
    participant DB as Supabase DB
    participant PP as ai_pipeline (bg thread)
    participant AM as ai_module (YOLO·OCR·LaMa·Gemini)
    participant MM as model_monitor
    participant WS as WebSocket /ws/batch

    U->>FE: chọn ảnh, bấm Upload
    FE->>UP: POST /v1/upload (multipart, Idempotency-Key)
    UP->>IV: verify_image_bytes() (chống MIME-spoof)
    IV-->>UP: OK (jpg/png/webp thật)
    UP->>CR: check_has_credits() + check_batch_size()
    CR-->>UP: OK
    UP->>ST: upload_original()
    UP->>DB: insert manga_pages (status=pending)
    UP-->>FE: 200 {batch_id, page_ids}
    FE->>WS: subscribe /v1/ws/batch/{batch_id}

    Note over UP,PP: semaphore-limited background thread (MAX_PIPELINE_CONCURRENCY)
    UP->>PP: process_page(page_id)
    PP->>DB: update status=ocr_running
    PP->>WS: emit progress event
    PP->>AM: call_translate(image_url) [retry + circuit breaker]
    AM-->>PP: rendered PNG + bubbles[]
    PP->>ST: upload_translated_image()
    PP->>DB: insert bubble_data + translation_history + embeddings(pgvector)
    PP->>MM: log_pipeline_metrics(conf, latency, success)
    PP->>DB: update status=translated
    PP->>WS: emit complete event
    WS-->>FE: {status: translated}
    FE-->>U: hiển thị trang đã dịch

    Note over PP: nếu lỗi → status=failed, log_pipeline_metrics(success=0),<br/>cooperative cancel qua threading.Event tại checkpoint
```

---

## UC-02 — Ask a question (RAG Q&A)

Actor hỏi về nội dung truyện; hệ thống tìm ngữ cảnh bằng vector search rồi sinh câu trả lời có trích dẫn.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as Frontend (api.ts)
    participant QA as qa router
    participant CR as credit_service
    participant RAG as rag.answer_question
    participant GE as Gemini (embedding + LLM, key-pool)
    participant DB as pgvector (embeddings)
    participant TEL as ai_telemetry
    participant AC as achievements

    U->>FE: nhập câu hỏi
    FE->>QA: POST /v1/qa {question, page_id?}
    QA->>CR: check_has_credits(1)
    CR-->>QA: OK
    QA->>RAG: answer_question(question, page_id)
    RAG->>GE: embed_content(question)
    GE-->>RAG: query embedding (1536-d)
    RAG->>DB: cosine search top-k=5
    DB-->>RAG: bubble chunks + similarity
    RAG->>GE: generate_content(context + question)
    Note over RAG,GE: xoay vòng nhiều API key;<br/>ai_telemetry.track("gemini","qa.answer")
    GE-->>RAG: answer + usage_metadata(tokens)
    RAG->>TEL: record latency + tokens + cost
    alt Gemini rỗng / hết key
        RAG-->>QA: _context_fallback_answer(context)
    else thành công
        RAG-->>QA: answer + sources[]
    end
    QA->>CR: deduct(1, "qa")
    QA->>DB: insert qa_history
    QA->>AC: check_and_unlock()
    QA-->>FE: {answer, sources, confidence}
    FE-->>U: câu trả lời + trích dẫn click được
```

---

## UC-03 — Listen mode (AI narration + TTS)

Actor bấm "Nghe"; VLM mô tả trang + lồng thoại → TTS đọc thành audio. Có **fallback** khi VLM chết.

```mermaid
sequenceDiagram
    autonumber
    actor U as User (reader)
    participant FE as ListenMode.tsx
    participant NR as narrate router
    participant CR as credit_service
    participant NS as narration service
    participant DB as Supabase DB
    participant VLM as vlm_client (ollama qwen2.5vl)
    participant TTS as tts registry (edge/pyttsx3/coqui)
    participant ST as Storage (manga-audio)
    participant TEL as ai_telemetry

    U->>FE: bấm "Nghe", chọn engine + giọng
    FE->>NR: POST /v1/narrate/page/{id} {engine, voice}
    NR->>NR: _ensure_enabled() + _get_owned_page()
    NR->>CR: check_has_credits(NARRATION_CREDIT_COST)
    NR->>NS: narrate_page(page_id, engine, voice)
    NS->>DB: fetch page + bubble_data (thoại theo thứ tự đọc)
    NS->>ST: signed URL ảnh gốc → tải bytes
    NS->>VLM: describe_image(image, prompt) [retry + breaker]
    VLM->>TEL: record vlm.describe (latency + tokens)
    alt VLM lỗi / rỗng
        NS->>NS: dialogue_fallback = ghép thoại
        Note right of NS: source="dialogue_fallback"
    else VLM ok
        VLM-->>NS: script kể chuyện (VN)
    end
    NS->>TTS: synthesize(script, engine, voice)
    TTS->>TEL: record tts.synthesize (latency + chars)
    TTS-->>NS: mp3/wav bytes
    NS->>ST: upload_narration_audio() → signed URL
    NS-->>NR: {script, audio_url, source}
    NR->>CR: deduct(cost, "narration")
    NR-->>FE: NarrationResponse
    FE-->>U: audio player + phụ đề lời kể
```

---

### Ghi chú thiết kế (bám LN06)
- **Bất đồng bộ + cooperative cancel** (UC-01): tách UI khỏi pipeline nặng → đáp ứng NFR *performance*
  & *responsiveness*; huỷ tại checkpoint qua `threading.Event`.
- **Resilience** (UC-02, UC-03): mọi lời gọi model ngoài đều có **retry + circuit breaker + fallback**
  (Gemini key-rotation, VLM→đọc thoại) → NFR *dependability/availability*.
- **Observability** (mọi UC): `model_monitor` + `ai_telemetry` ghi latency/token/cost, không bao giờ
  ném lỗi vào luồng người dùng → NFR *maintainability/operability*.
