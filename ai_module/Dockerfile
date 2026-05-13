# HuggingFace Space — Docker SDK
# Free CPU Basic tier (16 GB RAM, 2 vCPU)
# Translator: Gemini (via API) — so we skip the 5 GB NLLB/M2M100 weights
# Local models needed: detection (~295 MB), inpainting LaMa-large (~217 MB), OCR 48px (~196 MB)

FROM python:3.11-slim

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.cache/huggingface \
    TRANSFORMERS_CACHE=/app/.cache/huggingface

WORKDIR /app

# System libs:
#  - libgl1/libglib2.0-0/libsm6/libxrender1/libxext6/ffmpeg → OpenCV
#  - libzbar0 → Pillow extras
#  - gcc/g++/build-essential → pydensecrf compile from source
#  - curl/ca-certificates → model download
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 libsm6 libxrender1 libxext6 ffmpeg libzbar0 \
        gcc g++ build-essential \
        curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first (smaller than default CUDA wheels)
RUN pip install --upgrade pip \
    && pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision

# Project Python deps
COPY requirements.txt .
RUN pip install -r requirements.txt

# Pre-download model checkpoints into the paths expected by manga_translator
# (BASE_PATH/models/<sub_dir>/<file>)
RUN mkdir -p models/detection models/inpainting models/ocr \
    && curl -fL -o models/detection/detect-20241225.ckpt \
        https://github.com/zyddnys/manga-image-translator/releases/download/beta-0.3/detect-20241225.ckpt \
    && curl -fL -o models/inpainting/lama_large_512px.ckpt \
        https://huggingface.co/dreMaz/AnimeMangaInpainting/resolve/main/lama_large_512px.ckpt \
    && curl -fL -o models/ocr/ocr_ar_48px.ckpt \
        https://github.com/zyddnys/manga-image-translator/releases/download/beta-0.3/ocr_ar_48px.ckpt \
    && curl -fL -o models/ocr/alphabet-all-v7.txt \
        https://github.com/zyddnys/manga-image-translator/releases/download/beta-0.3/alphabet-all-v7.txt

# Copy app code
COPY __init__.py main.py pyproject.toml setup.cfg ./
COPY manga_translator/ ./manga_translator/
COPY server/ ./server/
COPY fonts/ ./fonts/
COPY dict/ ./dict/

# Pre-cache manga-ocr model from HF Hub (~400 MB) so the first request is fast
RUN python -c "from manga_ocr import MangaOcr; MangaOcr()" || true

# HF Spaces require non-root UID 1000
RUN useradd -m -u 1000 user && chown -R user:user /app
USER user

EXPOSE 7860

# server.main spawns a worker subprocess on port+1 (localhost only), main app listens on $PORT
CMD ["python", "main.py", "--host", "0.0.0.0", "--port", "7860"]
