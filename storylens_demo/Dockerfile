# ── Build stage ───────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Runtime stage ──────────────────────────────────────────
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    APP_PORT=8000

WORKDIR /app

# Copy installed packages
COPY --from=builder /install /usr/local

# Copy app code (secrets/ is gitignored and NOT copied here)
COPY control_plane/ ./control_plane/
COPY web/ ./web/

# Create runtime dirs
RUN mkdir -p artifacts chromadb

EXPOSE 8000

CMD ["uvicorn", "control_plane.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
