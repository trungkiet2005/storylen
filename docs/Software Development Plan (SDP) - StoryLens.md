# Software Development Plan (SDP) - StoryLens

## 1. Project Overview

**Project Name:** StoryLens
**Version:** 1.0
**Last Updated:** 2025

StoryLens is an AI-powered manga translation and Q&A platform targeting Vietnamese readers. Users upload manga images; the platform runs OCR, contextual Japanese→Vietnamese translation, and a RAG-based Q&A system on top of the results. The product includes a credit/subscription system and a full admin dashboard.

---

## 2. Development Methodology

**Methodology:** Agile (Scrum)
**Sprint Length:** 1–2 weeks
**Key Practices:** Sprint planning, daily standups, sprint reviews, retrospectives, code reviews via pull requests

---

## 3. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js | 16.x |
| UI Framework | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Animations | Framer Motion | 12.x |
| Backend | FastAPI | 0.115.x |
| Runtime | Python | 3.10+ |
| Server | Uvicorn + Gunicorn | latest |
| Database | Supabase (PostgreSQL) | latest |
| Vector Search | pgvector (built into Supabase) | latest |
| File Storage | Supabase Storage | latest |
| Authentication | Supabase Auth + HTTP-only cookies | latest |
| AI – Text Detection | YOLOv8 (ultralytics) | latest |
| AI – OCR | Manga-OCR | latest |
| AI – Translation & QA | Google Gemini API | gemini-2.5-flash |
| AI – Embeddings | Sentence Transformers (all-MiniLM-L6-v2) | latest |
| Rate Limiting | SlowAPI | latest |
| Image Processing | Pillow | latest |
| Frontend Hosting | Vercel | — |
| Backend Hosting | Render.com (Docker) | — |
| AI Worker Hosting | HuggingFace Spaces (16 GB) | — |
| Version Control | Git / GitHub | — |

---

## 4. Project Phases

### Phase 1 – Inception & Planning (1 week)
- Define product requirements and user stories
- Design database schema and API contracts
- Set up repositories, CI/CD pipelines, and project tooling
- Provision Supabase project (DB + Storage + Auth)

### Phase 2 – Design (2 weeks)
- UI/UX wireframes and component design
- Architecture decisions: microservice split (API server + AI worker)
- Data model finalization with SQL migration files
- API specification (OpenAPI/Swagger)

### Phase 3 – Core Development (6–8 weeks)
- **Sprint 1:** Auth system (register/login/profile/avatar), Supabase integration, HTTP-only cookie sessions
- **Sprint 2:** Upload pipeline, image storage, background AI processing via HuggingFace Space
- **Sprint 3:** Manga reader UI, bubble overlay display, manual translation editing
- **Sprint 4:** RAG Q&A system (pgvector embeddings, Gemini generation, source chunks)
- **Sprint 5:** Credit/subscription system (plans, transaction ledger, daily reset trigger)
- **Sprint 6:** Series/chapter management, history page
- **Sprint 7:** Admin dashboard (analytics RPCs, user management, content moderation, audit log, app settings)

### Phase 4 – Testing (2 weeks)
- Unit tests for services (credit logic, auth, validation)
- Integration tests against real Supabase instance (no mocks)
- End-to-end UI testing (golden paths + edge cases)
- Performance testing: upload latency, AI pipeline throughput
- Security review: auth cookies, RLS policies, input validation, rate limits

### Phase 5 – Deployment & Maintenance
- Deploy frontend to Vercel (auto-deploy on push to `main`)
- Deploy backend to Render.com via Docker + `render.yaml` (Singapore region)
- Deploy AI module to HuggingFace Spaces (16 GB RAM tier)
- Configure custom domains, SSL/TLS, CORS origins
- Set up monitoring via Render dashboard and Supabase metrics
- Post-launch: bug fixes, credit system tuning, model upgrades, keep-alive pings

---

## 5. Team Structure

| Role | Responsibilities |
|------|----------------|
| Project Lead | Architecture decisions, sprint planning, code review |
| Backend Developer | FastAPI routers, services, Supabase integration |
| Frontend Developer | Next.js pages, components, API client |
| AI/ML Engineer | Manga-OCR, YOLOv8, Gemini integration, embedding pipeline |
| QA Engineer | Test plans, integration tests, regression testing |

---

## 6. Risk Management

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Gemini API quota exhaustion | HIGH | HIGH | Multi-key rotation (comma-separated `GEMINI_API_KEY`), graceful 429 handling |
| AI accuracy below target (OCR CER > 5%) | MEDIUM | HIGH | Model fine-tuning, fallback to manual correction UI |
| HuggingFace Space cold starts | MEDIUM | MEDIUM | Keep-alive GitHub Actions workflow, retry logic in backend |
| Render.com free tier cold starts (30–60s) | MEDIUM | MEDIUM | Frontend auto-retry on 503/timeout (8s, 15s delays) |
| Supabase RLS misconfiguration | LOW | HIGH | SQL migration review, service-role key isolation in backend Python |
| Copyright/DMCA issues | MEDIUM | HIGH | Clear ToS, content moderation tools in admin panel |
| Scope creep | MEDIUM | MEDIUM | Fixed sprint scope, backlog grooming |

---

## 7. Quality Assurance

- **Code Review:** All PRs require review before merge to `main`
- **Testing:** Integration tests hit real Supabase (no DB mocks)
- **Static Analysis:** TypeScript strict mode, ESLint, Python type hints throughout
- **Security Checks:** RLS policy validation, input sanitization, no hardcoded secrets
- **Performance Targets:**
  - UI interactive response < 3 seconds
  - Single-page AI processing < 30 seconds
  - Batch upload (10 images) enqueued within 5 seconds

---

## 8. Definition of Done

A feature is "done" when:
1. Code is reviewed and merged to `main`
2. All existing tests pass
3. New feature has integration test coverage
4. UI is tested in browser (golden path + edge cases)
5. Feature is deployed and verified in production environment
