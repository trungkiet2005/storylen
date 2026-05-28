"""Kaggle launcher for ai_module.

Why a separate launcher: deploy targets (HuggingFace Spaces, local, Kaggle)
need different model locations and process supervision. Keeping this file
isolated means main.py / Dockerfile / HF Space config stay untouched — when
Kaggle GPU quota runs out we just fall back to HF Spaces without reverting
anything.

Usage on Kaggle (one cell):

    !python /kaggle/working/storylen/ai_module/run_kaggle.py

Required Kaggle Secrets (Add-ons -> Secrets):
    GEMINI_API_KEY    - https://aistudio.google.com (comma-separated for rotation)
    NGROK_AUTHTOKEN   - optional; if absent, Cloudflare quick tunnel is used
    HF_TOKEN          - optional, for gated HuggingFace models

Pick a tunnel provider explicitly with env TUNNEL_PROVIDER=ngrok|cloudflare.
Cloudflare quick tunnels (TryCloudflare) need no account or domain — they
return a random https://*.trycloudflare.com URL valid for the session.

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

# manga_translator's shared mode writes per-session logs here. We tail every
# file that appears so the worker's tracebacks (which never reach uvicorn's
# stdout) are surfaced in the Kaggle cell output.
WORKER_LOG_DIR = SERVICE_DIR / "result"
# Dedicated stdout/stderr capture for the shared subprocess (the grandchild
# that actually loads YOLO/manga-ocr/lama). Exported to the env so
# ai_module/server/main.py:start_translator_client_proc redirects there.
SHARED_LOG_FILE = Path(
    os.environ.get("SHARED_LOG_FILE", str(WORKER_LOG_DIR / "shared.log"))
)
os.environ["SHARED_LOG_FILE"] = str(SHARED_LOG_FILE)

# manga_ocr/weights/ on Kaggle is a symlink into /kaggle/input/... (read-only),
# so any in-place fixup (e.g. writing preprocessor_config.json for older
# transformers) fails with EROFS. Point the cache to /kaggle/working/ so the
# resolver in model_manga_ocr.py can materialise a writable mirror there.
MOCR_CACHE_DIR = Path(
    os.environ.get("MOCR_CACHE_DIR", "/kaggle/working/mocr_weights_cache")
)
os.environ["MOCR_CACHE_DIR"] = str(MOCR_CACHE_DIR)

VERBOSE_WORKER = os.environ.get("AI_MODULE_VERBOSE", "1") not in ("0", "false", "")


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

def _tail_worker_logs(stop_event: threading.Event) -> None:
    """Watch result/log_*.txt and stream new lines to stdout.

    manga_translator's `shared` worker writes its own per-session log file
    instead of using uvicorn's stdout. Without this tailer, model-loading
    tracebacks are invisible — only the trailing uvicorn ``500`` line shows
    up in the Kaggle cell. We poll the directory cheaply and follow every
    file we haven't started yet, surfacing each line with a ``[worker]``
    prefix so it's easy to grep.
    """
    WORKER_LOG_DIR.mkdir(parents=True, exist_ok=True)
    handles: dict[Path, int] = {}  # path -> next byte offset to read

    def _watched_files():
        yield from WORKER_LOG_DIR.glob("log_*.txt")
        if SHARED_LOG_FILE.exists():
            yield SHARED_LOG_FILE

    while not stop_event.is_set():
        try:
            for entry in _watched_files():
                if entry not in handles:
                    handles[entry] = 0
                    sys.stdout.write(f"[worker-log] following {entry.name}\n")
                    sys.stdout.flush()
                try:
                    size = entry.stat().st_size
                except FileNotFoundError:
                    continue
                if size <= handles[entry]:
                    continue
                try:
                    with open(entry, "rb") as fh:
                        fh.seek(handles[entry])
                        chunk = fh.read(size - handles[entry])
                    handles[entry] = size
                    for line in chunk.decode("utf-8", errors="replace").splitlines():
                        sys.stdout.write(f"[worker] {line}\n")
                    sys.stdout.flush()
                except OSError as exc:
                    sys.stdout.write(f"[worker-log] read failed for {entry}: {exc}\n")
                    sys.stdout.flush()
        except Exception as exc:  # never let the tailer crash the launcher
            sys.stdout.write(f"[worker-log] tailer error: {exc}\n")
            sys.stdout.flush()
        time.sleep(0.5)


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
    if VERBOSE_WORKER:
        cmd.append("--verbose")
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
# Tunnel — ngrok or Cloudflare quick tunnel (TryCloudflare).
# Cloudflare quick tunnels are anonymous, free, and don't need an account or
# domain — they hand out a random `https://*.trycloudflare.com` URL.
# Default provider: ngrok if NGROK_AUTHTOKEN is set, else cloudflare.
# Force a provider via env TUNNEL_PROVIDER=ngrok|cloudflare.
# ---------------------------------------------------------------------------

_cloudflared_proc: subprocess.Popen | None = None


def _print_url_banner(url: str) -> None:
    print("=" * 60)
    print(f"  AI_MODULE_URL = {url}")
    print("=" * 60)
    print("Set this in your backend .env:")
    print(f"  AI_MODULE_URL={url}")
    print("  AI_MODULE_TOKEN=")


def _open_ngrok() -> str | None:
    token = os.environ.get("NGROK_AUTHTOKEN")
    if not token:
        print("[ngrok] NGROK_AUTHTOKEN not set")
        return None
    try:
        import ngrok  # type: ignore
    except ImportError:
        print("[ngrok] python package missing — pip install ngrok")
        return None
    listener = ngrok.forward(PORT, authtoken=token)
    url = listener.url()
    _print_url_banner(url)
    return url


def _open_cloudflare() -> str | None:
    import re

    global _cloudflared_proc
    binary = Path("/kaggle/working/cloudflared")
    if not binary.exists():
        print("[cloudflare] downloading cloudflared binary")
        rc = subprocess.run(
            ["wget", "-q", "-O", str(binary),
             "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"],
        ).returncode
        if rc != 0 or not binary.exists():
            print("[cloudflare] download failed")
            return None
        binary.chmod(0o755)

    log_path = LOG_FILE.parent / "cloudflared.log"
    log_fh = open(log_path, "w", buffering=1, encoding="utf-8")
    print(f"[cloudflare] launching tunnel -> http://127.0.0.1:{PORT}")
    _cloudflared_proc = subprocess.Popen(
        [str(binary), "tunnel", "--no-autoupdate",
         "--url", f"http://127.0.0.1:{PORT}"],
        stdout=log_fh,
        stderr=subprocess.STDOUT,
    )

    url_re = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")
    deadline = time.time() + 90
    while time.time() < deadline:
        if _cloudflared_proc.poll() is not None:
            print(f"[cloudflare] cloudflared exited early — see {log_path}")
            return None
        try:
            text = log_path.read_text(encoding="utf-8", errors="replace")
            m = url_re.search(text)
            if m:
                url = m.group(0)
                _print_url_banner(url)
                print(f"[cloudflare] tunnel log: {log_path}")
                return url
        except FileNotFoundError:
            pass
        time.sleep(1)
    print(f"[cloudflare] no URL emitted within 90s; check {log_path}")
    return None


def open_tunnel() -> str | None:
    provider = os.environ.get("TUNNEL_PROVIDER", "").lower().strip()
    if not provider:
        provider = "ngrok" if os.environ.get("NGROK_AUTHTOKEN") else "cloudflare"

    print(f"[tunnel] provider = {provider}")
    if provider == "ngrok":
        return _open_ngrok()
    if provider in ("cloudflare", "cf", "trycloudflare"):
        return _open_cloudflare()
    print(f"[tunnel] unknown provider '{provider}'")
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def _dump_latest_worker_log(tail_lines: int = 80) -> None:
    files = []
    try:
        files = sorted(WORKER_LOG_DIR.glob("log_*.txt"), key=lambda p: p.stat().st_mtime)
    except FileNotFoundError:
        pass
    candidates = []
    if files:
        candidates.append(("worker", files[-1]))
    if SHARED_LOG_FILE.exists():
        candidates.append(("shared", SHARED_LOG_FILE))
    if not candidates:
        return
    for label, path in candidates:
        try:
            text = path.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError as exc:
            print(f"[{label}-log] could not read {path}: {exc}")
            continue
        print(f"\n[{label}-log] last {tail_lines} lines of {path}:")
        print("-" * 60)
        for line in text[-tail_lines:]:
            print(line)
        print("-" * 60)


def main() -> int:
    print(f"[env] kaggle={is_kaggle()} service_dir={SERVICE_DIR}")

    load_secrets()
    link_models()
    install_deps()

    tailer_stop = threading.Event()
    tailer = threading.Thread(target=_tail_worker_logs, args=(tailer_stop,), daemon=True)
    tailer.start()

    proc = start_server()
    try:
        if not wait_for_health(proc):
            _dump_latest_worker_log()
            return 1

        open_tunnel()

        print("\n[run] server alive — Ctrl+C or stop the cell to terminate")
        print(f"[run] launcher log: tail -f {LOG_FILE}")
        print(f"[run] worker logs: ls {WORKER_LOG_DIR}")
        print(f"[run] shared log : tail -f {SHARED_LOG_FILE}")
        print(f"[run] mocr cache : {MOCR_CACHE_DIR}")
        # Block the foreground so the Kaggle cell stays alive and the tunnel
        # keeps serving. Exits when the uvicorn child dies.
        proc.wait()
        if proc.returncode not in (0, None):
            print(f"[server] exited with code {proc.returncode}")
            _dump_latest_worker_log()
        return proc.returncode or 0
    finally:
        tailer_stop.set()
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()
        if _cloudflared_proc and _cloudflared_proc.poll() is None:
            _cloudflared_proc.terminate()
            try:
                _cloudflared_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                _cloudflared_proc.kill()


if __name__ == "__main__":
    raise SystemExit(main())
