# frontend-bff

This directory contains the public BFF and browser UI for the MVP implementation described in the maintained v0.9 specifications.

## Current scope

- Next.js 15 Route Handlers for the public v0.9 REST facade
- Runtime client wiring to private `codex-runtime`
- Public shaping for workspace, thread, thread view, timeline, request helper, and notification stream data
- Browser-facing SSE relay responsibilities for thread and notification streams
- Thread-first browser UI surfaces for navigation, timeline, details, request response, and composer workflows
- Public error passthrough and runtime-unavailable handling

Use the maintained v0.9 public API and UI layout specs for current behavior boundaries:

- `../../docs/specs/codex_webui_public_api_v0_9.md`
- `../../docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `../../docs/codex_webui_mvp_roadmap_v0_1.md`

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
