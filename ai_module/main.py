"""Entrypoint for the self-contained ai_module backend service.

All imports are resolved from this ai_module directory first, so the copied
backend code in ai_module/server and ai_module/manga_translator is used
instead of the parent project folders.
"""

import os
import sys
from pathlib import Path


SERVICE_DIR = Path(__file__).resolve().parent
service_dir_str = str(SERVICE_DIR)

if service_dir_str not in sys.path:
    sys.path.insert(0, service_dir_str)

os.chdir(SERVICE_DIR)

from server import main as backend_main


app = backend_main.app


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai_module"}


def run() -> None:
    import uvicorn
    from server.args import parse_arguments

    args = parse_arguments()
    args.start_instance = True
    proc = backend_main.prepare(args)
    print("Nonce: " + backend_main.nonce)
    try:
        uvicorn.run(app, host=args.host, port=args.port)
    finally:
        procs = proc if isinstance(proc, list) else ([proc] if proc else [])
        for p in procs:
            try:
                p.terminate()
            except Exception:
                pass


if __name__ == "__main__":
    run()
