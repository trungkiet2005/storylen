"""Download and cache anime background images for the landing page."""
from __future__ import annotations

from pathlib import Path
from urllib.request import Request, urlopen


IMAGE_SOURCES: list[str] = [
    "https://cdn.pixabay.com/photo/2023/07/24/08/28/ai-generated-8146555_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/05/29/02/22/girl-8024881_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/07/24/08/21/ai-generated-8146529_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/09/16/09/28/ai-generated-8256308_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/10/02/09/16/ai-generated-8288828_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/08/11/04/28/ai-generated-8182792_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/08/17/02/19/ai-generated-8195314_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/06/27/03/15/ai-generated-8091289_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/06/29/03/02/ai-generated-8095540_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/09/16/09/27/ai-generated-8256306_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/08/11/04/22/ai-generated-8182788_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/10/14/03/17/ai-generated-8313863_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/10/02/09/18/ai-generated-8288833_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/05/29/02/20/girl-8024877_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/08/11/04/27/ai-generated-8182791_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/09/11/02/55/ai-generated-8245934_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/08/11/01/59/ai-generated-8182677_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/07/24/08/29/ai-generated-8146560_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/10/02/09/18/ai-generated-8288834_1920.jpg",
    "https://cdn.pixabay.com/photo/2023/06/27/03/06/ai-generated-8091278_1920.jpg",
]


def ensure_anime_images(target_dir: Path) -> list[Path]:
    target_dir.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []
    for idx, url in enumerate(IMAGE_SOURCES, start=1):
        filename = f"anime-{idx:02d}.jpg"
        out_path = target_dir / filename
        if out_path.exists() and out_path.stat().st_size > 0:
            saved.append(out_path)
            continue

        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        tmp_path = out_path.with_suffix(".part")
        try:
            with urlopen(req, timeout=20) as response:  # nosec - trusted HTTPS source
                data = response.read()
            tmp_path.write_bytes(data)
            tmp_path.replace(out_path)
            saved.append(out_path)
        except Exception:
            if tmp_path.exists():
                tmp_path.unlink(missing_ok=True)
    return saved
