---
title: AI STORYLEN
emoji: 🖼️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# AI Module

Thu muc nay la backend FastAPI tach rieng cho frontend goi.

`ai_module` da chua ban copy cua backend project:

- `server/`: FastAPI routes, queue, streaming, result APIs.
- `manga_translator/`: pipeline dich anh, OCR, inpainting, rendering, translators.
- `models/`: model files hien co.
- `fonts/`, `dict/`, `pip-modules/`: assets/backend support files.
- `requirements.txt`: dependency backend.

Entrypoint `ai_module/main.py` ep Python import code trong folder `ai_module` truoc, nen service khong can import `server` hoac `manga_translator` o folder ngoai.

## Cai dependency

```powershell
pip install -r ai_module/requirements.txt
```

## Chay backend service

Chay tu root repo:

```powershell
python -m ai_module.main --host 127.0.0.1 --port 8001
```

Hoac chay trong folder `ai_module`:

```powershell
cd ai_module
python main.py --host 127.0.0.1 --port 8001
```

Docs:

```text
http://127.0.0.1:8001/docs
```

Health check:

```text
http://127.0.0.1:8001/health
```

## API frontend hay dung

- `POST /translate/with-form/image`
- `POST /translate/with-form/json`
- `POST /translate/with-form/image/stream`
- `POST /translate/with-form/image/stream/web`
- `POST /translate/json`
- `POST /translate/image`
- `POST /translate/batch/json`
- `POST /translate/batch/images`
- `GET /results/list`
- `GET /result/{folder_name}/final.png`

## Vi du frontend

```ts
const form = new FormData();
form.append("image", file);
form.append("config", JSON.stringify({
  translator: {
    translator: "google",
    target_lang: "ENG"
  }
}));

const res = await fetch("http://127.0.0.1:8001/translate/with-form/image", {
  method: "POST",
  body: form
});

const blob = await res.blob();
const url = URL.createObjectURL(blob);
```
