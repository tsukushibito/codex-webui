# frontend-bff

This directory contains the first public API BFF slice for Phase 4A.

## Scope in this slice

- Next.js 15 Route Handlers for the public REST facade
- Runtime client wiring to `codex-runtime`
- Public-to-internal schema mapping for workspace, session, message, event, and approval REST routes
- Public error passthrough and runtime-unavailable handling
- `can_*` derivation in the BFF

## Stack

- `Node.js 22+`
- `TypeScript`
- `Next.js 15`
- Route Handlers
- `Vitest`

## Commands

Install dependencies:

```bash
npm install
```

For branch worktrees under `.worktrees/`, prefer installing once in the parent checkout and reusing it with a worktree-local symlink:

```bash
ln -s ../../../apps/frontend-bff/node_modules .worktrees/<branch>/apps/frontend-bff/node_modules
```

Only do this when the worktree and parent checkout are on the same lockfile state.

Run the BFF locally:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run Biome lint/style checks:

```bash
npm run check
```

Run TypeScript-only validation before the full Next.js build:

```bash
node ./node_modules/typescript/bin/tsc --noEmit --pretty false
```

Recommended local validation order for routine changes:

```bash
npm run check
node ./node_modules/typescript/bin/tsc --noEmit --pretty false
npm test
npm run build
```

Prefer this order over starting with `npm run build` so lint/style and TypeScript failures surface before the heavier Next.js build step.

Apply Biome formatting:

```bash
npm run format
```

## Configuration

- `CODEX_WEBUI_RUNTIME_BASE_URL`: base URL of the private `codex-runtime` service
  - default: `http://127.0.0.1:3001`

## Directories

- `app/api/`: public REST route handlers
- `src/`: runtime client, mappings, and handler logic
- `tests/`: focused route and mapping coverage

This app uses the shared repo-level [`biome.json`](../../biome.json) configuration.
