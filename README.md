# StoryLens — Manga Reader AI

Static prototype UI for StoryLens, a manga reader with AI-assisted features.

## Stack
- React 18 (UMD via CDN)
- Babel Standalone (in-browser JSX)
- Three.js (optional 3D hero)
- Vanilla CSS

No build step — pure static files.

## Run locally
Open `StoryLens UI.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy (Vercel)
The included `vercel.json` rewrites `/` to `StoryLens UI.html`.

```bash
vercel
```

Or import the repo at https://vercel.com/new — no build command needed, output directory is the repo root.

## Files
- `StoryLens UI.html` — entry page
- `design-canvas.jsx`, `primitives.jsx`, `tweaks-panel.jsx`, `ui-features.jsx`
- `screens-home.jsx`, `screens-home-3d.jsx`, `screens-upload.jsx`, `screens-reader-qa.jsx`
- `fuji-3d.jsx` — Three.js scene
- `styles.css`
