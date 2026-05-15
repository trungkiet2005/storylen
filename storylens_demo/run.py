"""
StoryLens Demo — dev launch script.
Run: python run.py
"""
import subprocess
import sys
import webbrowser
import time
import threading

PORT = 8000
URL = f"http://localhost:{PORT}"


def open_browser():
    time.sleep(1.5)
    webbrowser.open(URL)


if __name__ == "__main__":
    print(f"Starting StoryLens Demo at {URL}")
    threading.Thread(target=open_browser, daemon=True).start()
    subprocess.run(
        [
            sys.executable, "-m", "uvicorn",
            "control_plane.app:app",
            "--reload",
            "--host", "0.0.0.0",
            "--port", str(PORT),
            "--log-level", "info",
        ],
        cwd=__file__[: __file__.rfind("\\")],
    )
