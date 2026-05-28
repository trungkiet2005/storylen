"""Kaggle launcher for ai_module.

Why a separate launcher: deploy targets (HuggingFace Spaces, local, Kaggle)
need different model locations and process supervision. Keeping this file
isolated means main.py / Dockerfile / HF Space config stay untouched — when
Kaggle GPU quota runs out we just fall back to HF Spaces without reverting
anything.

Usage on Kaggle (one cell):

    !python /kaggle/working/storylen/ai_module/run_kaggle.py

Required Kaggle Secrets (Add-ons -> Secrets):
    NGROK_AUTHTOKEN   - https://dashboard.ngrok.com
    GEMINI_API_KEY    - https://aistudio.google.com (comma-separated for rotation)
    HF_TOKEN          - optional, for gated HuggingFace models

Pre-uploaded model dataset layout (read-only mount):
    /kaggle/input/datasets/trungkiet/storylen-models/models/
        manga_yolo/best.pt
        manga_ocr/weights/...
        detection/...
        inpainting/...
        ocr/...
        translators/...
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path


SERVICE_DIR = Path(__file__).resolve().parent
KAGGLE_MODELS_SRC = Path(
    os.environ.get(
        "KAGGLE_MODELS_DIR",
        "/kaggle/input/datasets/trungkiet/storylen-models/models",
    )
)
LOCAL_MODELS_DIR = SERVICE_DIR / "models"
LOG_FILE = Path(os.environ.get("AI_MODULE_LOG", "/kaggle/working/ai_module.log"))
HOST = os.environ.get("AI_MODULE_HOST", "0.0.0.0")
PORT = int(os.environ.get("AI_MODULE_PORT", "8001"))


# ---------------------------------------------------------------------------
# Environment detection
# ---------------------------------------------------------------------------

def is_kaggle() -> bool:
    return (
        os.environ.get("KAGGLE_KERNEL_RUN_TYPE") is not None
        or Path("/kaggle/input").exists()
    )


# ---------------------------------------------------------------------------
# Secrets — Kaggle UserSecretsClient on Kaggle, plain env elsewhere
# ---------------------------------------------------------------------------

def load_secrets() -> None:
    if not is_kaggle():
        return
    try:
        from kaggle_secrets import UserSecretsClient  # type: ignore
    except ImportError:
        print("[secrets] kaggle_secrets not importable; relying on env vars")
        return

    client = UserSecretsClient()
    for name in ("NGROK_AUTHTOKEN", "GEMINI_API_KEY", "HF_TOKEN", "GROQ_API_KEY"):
        if os.environ.get(name):
            continue
        try:
            os.environ[name] = client.get_secret(name)
            print(f"[secrets] loaded {name}")
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Model linking — bind read-only dataset into the location code expects.
# Non-destructive: only creates symlinks for entries that don't already exist.
# ---------------------------------------------------------------------------

def link_models() -> None:
    if not KAGGLE_MODELS_SRC.exists():
        print(f"[models] {KAGGLE_MODELS_SRC} not found; using bundled models in repo")
        return

    LOCAL_MODELS_DIR.mkdir(parents=True, exist_ok=True)

    for entry in KAGGLE_MODELS_SRC.iterdir():
        target = LOCAL_MODELS_DIR / entry.name
        if target.exists() or target.is_symlink():
            print(f"[models] keep existing {target}")
            continue
        try:
            target.symlink_to(entry, target_is_directory=entry.is_dir())
            print(f"[models] linked {target} -> {entry}")
        except OSError as e:
            print(f"[models] symlink failed for {entry}: {e}; falling back to copy")
            import shutil
            if entry.is_dir():
                shutil.copytree(entry, target)
            else:
                shutil.copy2(entry, target)


# ---------------------------------------------------------------------------
# Dependencies — only the deltas vs the Kaggle base image.
# Idempotent: pip is a no-op when the wheel is already satisfied.
# ---------------------------------------------------------------------------

EXTRA_PACKAGES = [
    "numpy==1.26.4",
    "ngrok",
    "manga-ocr",
    "ultralytics",
    "google-genai",
    "groq",
    "deepl",
    "pyclipper",
    "shapely",
    "freetype-py",
    "editdistance",
    "arabic-reshaper",
    "pyhyphen",
    "py3langid==0.2.2",
    "open_clip_torch",
    "ctranslate2",
    "tiktoken",
    "httpx==0.27.2",
    "nest-asyncio",
    "aioshutil",
    "aiofiles",
    "protobuf>=3.20.2,<6.0.0",
    "python-bidi",
    "langcodes",
    "ImageHash",
    "kornia",
    "tensorboardX",
]


def install_deps() -> None:
    if os.environ.get("SKIP_PIP_INSTALL") == "1":
        print("[pip] SKIP_PIP_INSTALL=1, skipping")
        return
    cmd = [sys.executable, "-m", "pip", "install", "-q", *EXTRA_PACKAGES]
    print("[pip] installing extras (this may take 2-3 min on first run)")
    subprocess.run(cmd, check=False)


# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------

def start_server() -> subprocess.Popen:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    log_fh = open(LOG_FILE, "w", buffering=1)

    cmd = [
        sys.executable,
        str(SERVICE_DIR / "main.py"),
        "--host", HOST,
        "--port", str(PORT),
        "--use-gpu",
    ]
    print(f"[server] spawning: {' '.join(cmd)}")
    proc = subprocess.Popen(
        cmd,
        cwd=str(SERVICE_DIR),
        stdout=log_fh,
        stderr=subprocess.STDOUT,
        env={**os.environ},
    )
    return proc


def wait_for_health(timeout: int = 600) -> bool:
    import urllib.request
    import urllib.error

    url = f"http://127.0.0.1:{PORT}/health"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                if r.status == 200:
                    print(f"[health] ready: {r.read().decode()}")
                    return True
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            pass
        time.sleep(5)
    return False


# ---------------------------------------------------------------------------
# ngrok tunnel
# ---------------------------------------------------------------------------

def open_tunnel() -> str | None:
    token = os.environ.get("NGROK_AUTHTOKEN")
    if not token:
        print("[ngrok] NGROK_AUTHTOKEN not set; tunnel disabled")
        return None
    try:
        import ngrok  # type: ignore
    except ImportError:
        print("[ngrok] python package not installed, run pip install ngrok")
        return None

    listener = ngrok.forward(PORT, authtoken=token)
    url = listener.url()
    print("=" * 60)
    print(f"  AI_MODULE_URL = {url}")
    print("=" * 60)
    print("Set this in your backend .env:")
    print(f"  AI_MODULE_URL={url}")
    print(f"  AI_MODULE_TOKEN=")
    return url


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    print(f"[env] kaggle={is_kaggle()} service_dir={SERVICE_DIR}")

    load_secrets()
    link_models()
    install_deps()

    proc = start_server()
    try:
        if not wait_for_health():
            print("[health] server did not become ready, tailing log:")
            subprocess.run(["tail", "-200", str(LOG_FILE)])
            return 1

        open_tunnel()

        print("\n[run] server alive — Ctrl+C or stop the cell to terminate")
        print(f"[run] logs: tail -f {LOG_FILE}")
        # Block the foreground so the Kaggle cell stays alive and the tunnel
        # keeps serving. Exits when the uvicorn child dies.
        proc.wait()
        return proc.returncode or 0
    finally:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()


if __name__ == "__main__":
    raise SystemExit(main())
