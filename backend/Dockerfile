# Render Web Service — Lightweight API Gateway
# No ML models — all AI work is delegated to HuggingFace Space.
# Final image ~150 MB (vs ~4 GB with torch/ultralytics).

FROM python:3.11-slim

WORKDIR /app

# Pillow needs libzbar0 (PNG); ffmpeg powers the optional chapter recap
# video export (services/recap_video.py) — hidden via ffmpeg_available()
# when absent, so this is safe to skip on constrained hosts if ever needed.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libzbar0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# Non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# Render sets PORT env var automatically
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
