# Issue #42 Design

## Overview
Add a new frontend source tree under `codexbox/frontend/` and build it with Vite into a server-served directory under `codexbox/public/preact/`. Keep the existing legacy UI under `codexbox/public/` unchanged. Serve the built Preact app from `/app` and `/app/`, while the hashed bundle assets are served from `/static/preact/*`.

## Structure
- `codexbox/package.json`: frontend dependency and script entrypoint.
- `codexbox/frontend/`: Vite app source, HTML entry, TS config, and Vite config.
- `codexbox/public/preact/`: build output committed to the repo so the current Dockerfile/server layout can serve it.
- `codexbox/webui-server.js`: route and static serving additions for `/app` and built assets.

## Route Design
- `/` continues to serve the legacy `public/index.html`.
- `/app` and `/app/` serve `public/preact/index.html`.
- `/static/*` continues to serve the legacy assets from `public/`.
- `/static/preact/*` serves built hashed assets through the existing static asset guardrails because they live under `public/preact/`.

## Build Design
- Use `Vite + @preact/preset-vite + TypeScript`.
- Configure `base` to `/static/preact/` so the built HTML can be served from `/app` without path rewriting.
- Keep the app minimal: a shell page that proves `Preact + TypeScript` is wired, shows bridge status, and points to later migration work.
- Use `npm run dev` for Vite local dev and `npm run build` for production output.

## Server Integration
- Add a dedicated helper for serving the built frontend HTML if it exists.
- If `public/preact/index.html` is missing, return `503 Frontend build not found` for `/app` rather than falling back to the legacy UI.
- Reuse the existing `servePublicAsset` path validation for assets.

## Operational Concerns
- Commit build output so the current Dockerfile can continue copying `public/` without adding a container-side build stage in this issue.
- Later cutover work can change the default route to `/app` or replace the legacy files after parity is achieved.

## Validation Strategy
- Add a server test that checks `/app` serves the built HTML and references `/static/preact/` assets.
- Run `npm run build` to validate the toolchain itself.
- Run existing backend and frontend test suites to catch regressions in static serving.

## Risks
- Committing generated build output adds churn, but it keeps this issue focused on enabling the bridge without reworking the Docker build yet.
- The minimal scaffold is intentionally not feature-parity; later issues must replace it incrementally.
