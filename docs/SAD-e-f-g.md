# StoryLens - SAD Content for Sections e, f, g

## e) Software Architecture (15 points)

### Architectural style
- Main style: **N-tier architecture** (Client, API, Application, Data, ML tiers).
- Frontend follows **MVC-like separation** with View components, UI state/controller logic, and model data from API.
- Backend uses **Controller-Service-Repository** layering.

### Technology stack by component
- Client tier: React (JavaScript/TypeScript), HTML/CSS.
- API tier: FastAPI (Python), Pydantic for validation, JWT for auth.
- Application tier: Python services (`StoryService`, `OCRTranslationService`, `QAService`).
- Data tier: PostgreSQL (+ `pgvector`), Redis, object storage (S3 compatible).
- ML tier: PyTorch/Transformers-based inference services.

### Logical View (Section 4.x)

#### 4.1 Web UI
- Responsibility: render Home, Upload, Reader, Q&A, History; handle user actions; call REST API.
- Connected to: `4.2 API Gateway / Controller` via HTTPS JSON.

#### 4.2 API Gateway / Controller
- Responsibility: routing, request validation, authentication/authorization, DTO mapping.
- Connected to: `4.1` inbound, `4.3/4.4/4.5` outbound, external monitoring.

#### 4.3 Story Service
- Responsibility: story metadata, chapter/panel management, lifecycle status.
- Connected to: `4.2` (caller), `4.6` (repository).

#### 4.4 OCR/Translation Service
- Responsibility: OCR, language detection, translation, persistence of OCR and translated outputs.
- Connected to: `4.2`, `4.6`, `4.10 Object Storage`, ML tier.

#### 4.5 QA/RAG Service
- Responsibility: chunking, embedding, retrieval, answer generation, session logging.
- Connected to: `4.2`, `4.6`, `4.9 Vector DB`, ML tier.

#### 4.6 Data Access Layer (Repositories)
- Responsibility: persistence abstraction and standard CRUD/query methods.
- Connected to: `4.7 PostgreSQL`, `4.8 Redis`, `4.9 pgvector`.

#### 4.7 PostgreSQL
- Responsibility: source of truth for users, stories, panels, translations, QA sessions/messages.

#### 4.8 Redis
- Responsibility: cache for story metadata and session fragments.

#### 4.9 Vector DB (`pgvector`)
- Responsibility: semantic embedding storage and similarity retrieval for RAG.

#### 4.10 Object Storage
- Responsibility: uploaded manga images and OCR artifact storage.

---

## f) Detailed Design (20 points)

### OOP class diagrams (key components)
Main classes included in draw.io:
- `StoryController`: API endpoints for story ingestion and retrieval.
- `StoryService`: business logic for story lifecycle.
- `OCRTranslationService`: OCR + translation orchestration.
- `QAService`: retrieval and answer generation workflow.
- `EmbeddingService`: embedding/indexing helper.
- `StoryRepository`, `QARepository`: persistence abstraction.
- Entities: `Story`, `Panel`, `Translation`.

Relationships:
- Controller -> Service dependency.
- Services -> Repositories dependency.
- `Story` 1..* `Panel`, `Panel` 1..* `Translation`.

### Database design (ERD)
Key tables:
- `users`: account and role.
- `stories`: user-owned stories and processing status.
- `panels`: per-panel image and OCR raw output.
- `translations`: translated text and confidence.
- `qa_sessions`: Q&A sessions per user + story.
- `qa_messages`: dialogue logs and context references.
- `panel_chunks`: chunked text embeddings.

Key FK links:
- `users -> stories`, `stories -> panels`, `panels -> translations`.
- `users -> qa_sessions`, `stories -> qa_sessions`, `qa_sessions -> qa_messages`.
- `panels -> panel_chunks`.

### UI design (at least 5 screens)
Included screen set:
1. Home
2. Upload
3. Reader
4. Q&A
5. History/Batch

These are provided in draw.io page `F3-UI-5-Screens`.

---

## g) ML model design and analysis (15 points)

### Selected model set

1. OCR model: **PaddleOCR**
- How it works: detects text regions and recognizes text sequence from manga panels.
- Why chosen: practical performance on mixed comic layouts.
- Advantages: good speed/accuracy tradeoff and mature deployment.
- Limitations: stylized fonts and vertical text can reduce accuracy.

2. Translation model: **NLLB-200** (fallback: M2M100)
- How it works: multilingual sequence-to-sequence neural translation.
- Why chosen: broad language coverage and stable translation quality.
- Advantages: suitable for multilingual manga localization.
- Limitations: slang, sound effects, and culture-specific wording can degrade.

3. Embedding model: **BAAI/bge-m3**
- How it works: converts chunks/questions into vectors for semantic retrieval.
- Why chosen: strong multilingual retrieval quality.
- Advantages: better context recall than keyword search.
- Limitations: requires chunking and index tuning; non-trivial memory usage.

4. Answer model: **Llama 3.1 Instruct**
- How it works: generates grounded answers using retrieved context.
- Why chosen: good instruction-following performance in RAG flows.
- Advantages: high answer quality and flexible prompting.
- Limitations: latency/cost and hallucination risk if grounding is weak.

### End-to-end ML flow
- Input image -> OCR -> translation -> chunking -> embedding index -> retrieval -> LLM answer.
- Quality controls: OCR confidence threshold, translation confidence threshold, top-k retrieval tuning, answer grounding with snippet references.

---

## Diagram file mapping
- `E1-Architecture-NTier`: architecture style and technology placement.
- `E2-Logical-View-Components`: section 4.x responsibilities and connections.
- `F1-Class-Diagram-OOP`: key OOP classes and relations.
- `F2-ERD-Database`: entity relationship diagram.
- `F3-UI-5-Screens`: five required screens.
- `G1-ML-Models-Analysis`: model pipeline and pros/cons.
