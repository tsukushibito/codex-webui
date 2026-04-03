# codex-runtime

This directory contains the first implementation slice of the MVP runtime described in the maintained specifications.

## Scope in this slice

- App-server supervisor foundation
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

Run the runtime locally:

```bash
npm run dev
```

## Runtime directories

- `src/`: application source
- `tests/`: targeted unit and integration coverage

By default the runtime expects an existing workspace root directory. Set `CODEX_WEBUI_WORKSPACE_ROOT` before starting the service if you want to point it at a non-default location.
