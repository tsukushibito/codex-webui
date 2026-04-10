# codex-runtime

This directory contains the first implementation slice of the MVP runtime described in the maintained specifications.

## Scope in this slice

- App-server supervisor lifecycle wired into runtime startup and shutdown
- SQLite-backed workspace registry
- `workspace_id <-> session_id` correspondence storage helpers
- Internal `GET /api/v1/workspaces`, `POST /api/v1/workspaces`, and `GET /api/v1/workspaces/{workspace_id}`

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
