# codex-runtime

This directory contains the private runtime service for the MVP implementation described in the maintained v0.9 specifications.

## Current scope

- App-server supervisor lifecycle wired into runtime startup and shutdown
- SQLite-backed workspace registry and app-owned persistence
- Internal v0.9 workspace, thread, request-helper, timeline, and stream routes
- Thread/request projections over the native `codex app-server` thread lifecycle
- Recovery-oriented helper state that can be rebuilt from native facts plus minimal app-owned metadata

Use the maintained v0.9 internal API spec and roadmap for current behavior boundaries:

- `../../docs/specs/codex_webui_internal_api_v0_9.md`
- `../../docs/codex_webui_mvp_roadmap_v0_1.md`

## Stack

- `Node.js 22+`
- `TypeScript`
- `Fastify`
- `better-sqlite3`
- `Drizzle ORM`
- `Zod`
- `Vitest`

## Commands

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Run Biome lint/style checks:

```bash
npm run check
```

Recommended local validation order for routine changes:

```bash
npm run check
npm test
npm run build
```

In this app `npm run build` already runs TypeScript-only validation with `tsc --noEmit`, so it should usually come after the faster Biome and targeted test steps rather than first.

Apply Biome formatting:

```bash
npm run format
```

Run the runtime locally:

```bash
npm run dev
```

## Runtime directories

- `src/`: application source
- `tests/`: targeted unit and integration coverage

This app uses the shared repo-level [`biome.json`](../../biome.json) configuration.

By default the runtime expects an existing workspace root directory. Set `CODEX_WEBUI_WORKSPACE_ROOT` before starting the service if you want to point it at a non-default location.

When the Fastify app becomes ready, it starts the managed `codex app-server` process. Closing the runtime stops the managed process before shutting down the app.
