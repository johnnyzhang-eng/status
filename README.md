# Project Status Board

A single self-contained web page that shows the live status of many projects as cards — one URL, easy on the eye, no build step and no dependencies.

- **Live URL (once published):** `https://johnnyzhang-eng.github.io/status/`
- **The whole site is one file:** `index.html` (HTML + CSS + data embedded).

## How to update it

Open `index.html`, edit the `PROJECTS` array near the top of the `<script>` block, and bump `LAST_REFRESH`. Each project is one object:

```js
{
  name: "Project name",
  status: "ontrack",      // ontrack | blocked | paused | shipped | planning  (drives the colour)
  progress: 80,           // 0–100, the progress bar
  updated: "2026-07-02",
  next: "The one next thing.",         // highlighted callout
  open:   ["item", "item"],            // in-flight / open list
  shipped:["thing", "thing"],          // recently-shipped chips
  link: ""                             // optional URL to the repo/docs
}
```

Add a project by copying the commented template block. That's the entire API.

## How it deploys

GitHub Pages serves this repo. **Any push to `main` auto-redeploys** — no Action needed. To (re)enable:
`Settings → Pages → Source: Deploy from a branch → main / root`.

## Visibility

This repo is **public** (GitHub Pages needs a paid plan to serve a private repo). Its content is therefore **intentionally sanitized** — high-level status only, no dollar costs, no internal blockers, no method internals. The page also carries a `noindex` tag so it won't show up in search results (but anyone with the link can open it).

The **full internal detail** lives privately elsewhere (`dash-ocr-research/docs/STATUS.md`). When updating this public board, keep it high-level.
