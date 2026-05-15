# Security Policy - StoryLens

## 1. Overview

This document defines the security policies and procedures for the StoryLens platform. It covers authentication, authorization, data protection, input validation, rate limiting, and incident response.

---

## 2. Information Classification

| Level | Description | Examples |
|-------|-------------|---------|
| **Public** | Freely accessible, no auth required | Landing page, plans page, health endpoint |
| **User** | Accessible by authenticated users | Uploaded pages, translations, Q&A history, profile |
| **Admin** | Accessible by admin role only | Analytics, user management, audit logs, app settings |
| **System** | Never exposed externally | Service-role key, Gemini API keys, refresh tokens |

---

## 3. Authentication

### 3.1 Session Management
- Authentication is performed via Supabase Auth (email/password)
- On login, the backend receives Supabase access + refresh tokens and stores them as **HTTP-only cookies** — they are never exposed to JavaScript or returned in JSON responses
- Access tokens expire (typically ~3600s); the backend silently refreshes them using the refresh cookie
- Logout clears both cookies and invalidates the Supabase session server-side

**Cookie security flags (production):**
```
HttpOnly: true
Secure: true              (HTTPS only)
SameSite: None            (cross-domain; required for Vercel frontend + Render backend)
Domain: .yourdomain.com   (optional, scoped to domain)
Max-Age: 2592000          (refresh cookie: 30 days)
```

**Local development (HTTP):**
```
HttpOnly: true
Secure: false
SameSite: Lax
```

### 3.2 Password Policy
- Minimum 8 characters (enforced by Supabase Auth)
- Passwords are hashed by Supabase (bcrypt); the backend never handles plaintext passwords directly
- No maximum password length restriction

### 3.3 Token Security
- Access and refresh tokens are never stored in `localStorage` or `sessionStorage`
- Tokens are never logged or returned in API responses
- The backend uses the service-role key for all DB operations — this key is never sent to or accessible from the frontend

---

## 4. Authorization

### 4.1 Role-Based Access Control (RBAC)
Two roles are defined in `profiles.role`:

| Role | Access |
|------|--------|
| `user` (default) | Own pages, series, Q&A history, credits, profile |
| `admin` | All user access + admin dashboard (`/v1/admin/*`) |

Admin role is assigned manually in the Supabase database. The admin check is enforced at the FastAPI router level.

### 4.2 Resource Ownership
- The backend uses the Supabase **service-role key** to bypass Row-Level Security for flexibility, and enforces ownership in Python application code
- Before any mutation, the backend verifies the resource belongs to the authenticated user
- Supabase **RLS policies** serve as a secondary safety layer for direct database access

### 4.3 Row-Level Security (Supabase)
RLS is enabled on all tables containing user data:
- `manga_pages`: Users can SELECT/UPDATE only their own pages
- `bubble_data`: Users can SELECT bubbles on their own pages
- `embeddings`: Users can SELECT embeddings for their own pages
- `qa_history`: Users can SELECT their own Q&A history

Admin RPCs (analytics functions) use `security definer` and are only callable with the service-role key.

---

## 5. API Security

### 5.1 Rate Limiting
SlowAPI rate limits are applied per IP/user (configurable via environment variables):

| Endpoint | Default Limit |
|----------|--------------|
| `POST /auth/register` | 5 per minute |
| `POST /auth/login` | 10 per minute |
| `POST /upload` | 30 per minute |

Rate limit violations return `429 Too Many Requests`.

### 5.2 Request Size Limits
- Body size limit middleware rejects requests exceeding `MAX_REQUEST_SIZE_MB` (default: 50 MB) with `413 Request Entity Too Large`
- Per-file size limit enforced in upload logic (`MAX_FILE_SIZE_MB`, default: 10 MB)

### 5.3 Input Validation
All inputs are validated at the API boundary:
- **File uploads:** Checked for MIME type (JPG/PNG/WebP only), file size, and non-empty content
- **Text fields:** Length bounds on all string fields (e.g., username 3–32 chars, question 1–2000 chars)
- **Enums:** Strict validation on role, locale, gender, target language, status fields (Pydantic)
- **UUIDs:** All ID parameters validated as valid UUID format before DB queries
- **Batch size:** Enforced against plan-tier limits before processing

### 5.4 CORS
- `ALLOWED_ORIGINS` is explicitly configured (not `*`) and includes production frontend URL(s)
- `allow_credentials=True` is required for cookie-based auth
- CORS origins are logged on startup for verification

---

## 6. Data Security

### 6.1 Data in Transit
- All production traffic over HTTPS/TLS (Vercel, Render, HuggingFace all enforce HTTPS)
- Supabase connections use TLS by default
- HTTP allowed only for local development

### 6.2 Data at Rest
- PostgreSQL data encrypted at rest by Supabase (AES-256)
- Supabase Storage encrypted at rest
- No sensitive data stored in logs

### 6.3 Secrets Management
- All secrets (API keys, DB credentials) stored as environment variables — never hardcoded in source code
- `.env` files are in `.gitignore` and never committed
- Production secrets set in Render Dashboard and Vercel project settings
- Gemini API keys support rotation: multiple keys in `GEMINI_API_KEY` (comma-separated); backend auto-rotates on quota exhaustion

### 6.4 Credit Transactions
- `credit_transactions` is an append-only ledger: no UPDATE or DELETE operations
- Any credit adjustment (positive or negative) is recorded with type, reference, and note
- Admin grants are logged in both `credit_transactions` and `admin_audit_log`

---

## 7. Admin Security

### 7.1 Admin Audit Log
All admin actions are recorded in `admin_audit_log` with:
- Actor ID and email (snapshot at time of action)
- Action type and target entity
- Human-readable summary
- Client IP address and User-Agent
- Timestamp

The audit log is append-only and cannot be modified via the API.

### 7.2 Admin Access Control
- Admin endpoints return `403 Forbidden` for any user with `role != 'admin'`
- Admin role is assigned only via direct Supabase database access (not via API)
- All admin actions trigger an audit log entry

---

## 8. Content Security

### 8.1 File Upload Restrictions
- Accepted formats: JPG, PNG, WebP only (MIME type + extension validated)
- Max size: 10 MB per file (configurable)
- Files are stored in private Supabase buckets; access is controlled by signed URLs or service-role key

### 8.2 Copyright
- Terms of Service inform users they are responsible for ensuring they have rights to upload content
- Admin dashboard provides content moderation tools to review and remove flagged content

### 8.3 Content Moderation
- Admin can view uploaded pages and delete violating content
- Admin actions on content are recorded in the audit log

---

## 9. Dependency Security

- Python dependencies pinned in `requirements.txt`; regular updates via Dependabot or manual review
- Node.js dependencies in `package.json`; `npm audit` run as part of CI
- Docker base images from official sources; updated regularly

---

## 10. Incident Response

### 10.1 Compromised API Key
1. Immediately revoke compromised key in Google AI Studio / Supabase
2. Add replacement key to `GEMINI_API_KEY` or update Supabase credentials in Render Dashboard
3. Review `admin_audit_log` for unusual activity during the compromise window
4. Notify affected users if their data was accessed

### 10.2 Unauthorized Admin Access
1. Immediately revoke the admin user's role in Supabase (`UPDATE profiles SET role = 'user' WHERE id = '...'`)
2. Invalidate their sessions via Supabase Auth admin API
3. Review `admin_audit_log` for all actions taken during the compromised period

### 10.3 Data Breach
1. Immediately rotate all service-role keys and API credentials
2. Assess scope via Supabase audit logs
3. Notify affected users within 72 hours (GDPR requirement)
4. Review and patch the vulnerability before restoring normal service

---

## 11. Compliance

| Requirement | Implementation |
|-------------|---------------|
| GDPR – Right to deletion | Users can delete their account; associated pages, series, and history are deleted |
| GDPR – Data minimization | Only necessary fields collected; optional profile fields are truly optional |
| GDPR – Breach notification | 72-hour notification policy (see Incident Response) |
| Cookie consent | HTTP-only session cookies are strictly necessary; no tracking cookies |
| CCPA | User data deletion honored on request |
