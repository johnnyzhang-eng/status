# Project Status Board

A premium, self-updating multi-project status board. One URL, all projects as cards, sorted by health so the one needing attention stands out.

- **Live URL:** https://johnnyzhang-eng.github.io/status/
- **Stack:** Vite + React + TypeScript + Tailwind (static build, no server).
- **Data:** `public/data.json` — the single source of truth the UI renders. (Phase 1 will have a GitHub Action regenerate this from real repo activity.)

## Run locally

```bash
npm install
npm run dev      # dev server
npm run build    # static build → dist/
npm run preview  # preview the build
```

## Update the board

Today (Phase 0): edit `public/data.json`. Each project object drives one card + its detail view (see `src/types.ts` for the full shape): `name, blurb, status, health, version, next, momentum, rubric, shipped[], inFlight[], owners[], tags[]`.

Phase 1 (next): a GitHub Action on a 6h cron + on push runs a generator that reads each repo's git log / `version.json` / PRs, computes the health rubric, and rewrites `public/data.json` automatically — with a **tested denylist gate** that fails the build if any customer name / infra id / SQL would reach this public site.

## How it deploys

GitHub Actions (`.github/workflows/deploy.yml`) builds the Vite app and publishes `dist/` to GitHub Pages on every push to `main` (and via manual dispatch). Pages source = **GitHub Actions**.

## Visibility

This repo is **public** (private Pages needs GitHub Enterprise). Content is **sanitized** — high-level status only, no dollar costs / infra ids / customer names — and the page is `noindex`. Full internal detail lives privately in `dash-ocr-research/docs/STATUS.md`. A per-project `internal` flag (Phase 2) blurs any sensitive project to name+status only.
