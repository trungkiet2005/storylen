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
import threading
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
# Dependencies — install from the bundled requirements.txt so we never drift
# from what the HF Spaces / Docker build uses. Two surgical workarounds:
#   * skip pydensecrf (builds from source, needs apt deps Kaggle doesn't have)
#   * pass --extra-index-url for the rusty-manga-image-translator wheel
# Idempotent: pip is a no-op when a wheel is already satisfied.
# ---------------------------------------------------------------------------

RUST_INDEX = "https://frederik-uni.github.io/manga-image-translator-rust/python/wheels/simple/"
# pydensecrf is mandatory (mask_refinement imports it at module level). The
# upstream PyPI package is unmaintained and fails to build on Python >=3.10
# (legacy Cython API). pydensecrf2 is a maintained fork with prebuilt wheels
# and identical `import pydensecrf` namespace -> drop-in replacement.
SKIP_PACKAGES: tuple[str, ...] = ("pydensecrf",)
EXTRA_PACKAGES = ("ngrok", "pydensecrf2")


def _filtered_requirements() -> list[str]:
    req_file = SERVICE_DIR / "requirements.txt"
    out: list[str] = []
    for raw in req_file.read_text().splitlines():
        # Strip inline comments first so 'protobuf<6 # note' becomes 'protobuf<6'.
        line = raw.split("#", 1)[0].strip()
        if not line or line.startswith("--"):
            continue
        if any(skip in line.lower() for skip in SKIP_PACKAGES):
            print(f"[pip] skipping {line}")
            continue
        out.append(line)
    return out


def install_deps() -> None:
    if os.environ.get("SKIP_PIP_INSTALL") == "1":
        print("[pip] SKIP_PIP_INSTALL=1, skipping")
        return

    packages = _filtered_requirements() + list(EXTRA_PACKAGES)
    cmd = [
        sys.executable, "-m", "pip", "install", "-q",
        "--extra-index-url", RUST_INDEX,
        *packages,
    ]
    print(f"[pip] installing {len(packages)} packages from requirements.txt "
          "(first run: 3-5 min)")
    rc = subprocess.run(cmd).returncode
    if rc != 0:
        print(f"[pip] returned {rc} — some packages may have failed, "
              "check above. Continuing anyway.")


# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------

def _tee_to_stdout_and_file(pipe, log_fh) -> None:
    """Drain a subprocess pipe to both the parent stdout and a log file.

    PYTHONUNBUFFERED in the child env ensures we see lines as they happen
    instead of waiting for the child's libc to flush its block buffer.
    """
    for raw in iter(pipe.readline, b""):
        try:
            line = raw.decode("utf-8", errors="replace")
        except Exception:
            line = repr(raw)
        sys.stdout.write(line)
        sys.stdout.flush()
        log_fh.write(line)
        log_fh.flush()
    pipe.close()


def start_server() -> subprocess.Popen:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    log_fh = open(LOG_FILE, "w", buffering=1, encoding="utf-8")

    cmd = [
        sys.executable,
        "-u",  # unbuffered stdout from the child interpreter
        str(SERVICE_DIR / "main.py"),
        "--host", HOST,
        "--port", str(PORT),
        "--use-gpu",
    ]
    print(f"[server] spawning: {' '.join(cmd)}")
    proc = subprocess.Popen(
        cmd,
        cwd=str(SERVICE_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        bufsize=1,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
    )
    tee = threading.Thread(
        target=_tee_to_stdout_and_file,
        args=(proc.stdout, log_fh),
        daemon=True,
    )
    tee.start()
    return proc


def wait_for_health(proc: subprocess.Popen, timeout: int = 600) -> bool:
    """Poll /health until the server is ready. Aborts immediately if the
    child process dies — no point waiting 10 minutes for a corpse."""
    import urllib.request
    import urllib.error

    url = f"http://127.0.0.1:{PORT}/health"
    deadline = time.time() + timeout
    while time.time() < deadline:
        if proc.poll() is not None:
            print(f"[health] server exited early with code {proc.returncode} — "
                  "see traceback above")
            return False
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
        if not wait_for_health(proc):
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
