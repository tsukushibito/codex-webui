# codex-runtime

This directory contains the private runtime service for the MVP implementation described in the maintained v0.9 specifications.

## Current scope

- App-server supervisor lifecycle wired into runtime startup and shutdown
- SQLite-backed workspace registry and app-owned persistence
- Internal v0.9 workspace, thread, request-helper, timeline, and stream routes
- Thread/request projections over the native `codex app-server` thread lifecycle
- Recovery-oriented helper state that can be rebuilt from native facts plus minimal app-owned metadata

## SQLite persistence boundary

The v0.9 direction is native-first: SQLite rows are candidates, helper metadata, and compatibility state for the WebUI, not proof of native thread existence, readability, sendability, status, or transcript truth. A DB-only `sessions` row must not prove that a native thread still exists or can be resumed. Persisted `messages` rows and full `session_events` history must not be treated as the authoritative native transcript or event history.

Current table classification in [`src/db/schema.ts`](./src/db/schema.ts):

- `workspaces`: WebUI-owned canonical data. This is app-owned workspace metadata and local directory identity.
- `workspace_session_mappings`: WebUI-owned canonical index data. This maps local workspaces to native thread IDs, but the mapping is still an app-owned lookup and not proof that the native thread currently exists.
- `thread_input_requests`: short-lived helper and idempotency metadata. This binds the first accepted workspace input to a generated thread ID so retries do not create duplicate native threads.
- `sessions`: mixed table. Retain only helper metadata such as workspace association, created/updated timestamps, `app_session_overlay_state`, `current_turn_id`, `pending_assistant_message_id`, `active_approval_id`, and similar recovery/reconnect fields. Treat `title`, `status`, `started_at`, and `last_message_at` as duplicate native conversation state or compatibility cache that must eventually be read from native-backed facts instead of trusted from SQLite.
- `messages`: duplicate native conversation state plus compatibility cache. Keep only bounded idempotency/helper fields such as the user-input replay key (`client_message_id`) while moving transcript and history reads to native-backed sources.
- `approvals`: retained bounded request-helper retention. This is the allowed app-owned helper surface for request detail completion, request lifecycle tracking, and recovery-oriented lookup/index data when native payloads are incomplete.
- `session_events`: rebuildable cache plus duplicate native conversation state. Keep only minimal ordering/reconnect helper metadata if needed; persisted full event payload history is not authoritative transcript/history.

Retained SQLite surface for this runtime:

- WebUI-owned workspace metadata in `workspaces`
- Workspace-to-native-thread mapping and lookup/index data in `workspace_session_mappings`
- First-input idempotency records in `thread_input_requests`
- Bounded request-helper retention in `approvals`
- Recovery, reconnect, and ordering helper metadata such as `app_session_overlay_state`, `current_turn_id`, `pending_assistant_message_id`, `active_approval_id`, and event sequence helpers
- UI-only helper state where present, as long as it is explicitly treated as overlay/helper state rather than native truth

Current DB-only paths that follow-up issues must replace or constrain:

- Issue `#323`: replace DB-only thread/session summary reads in [`src/domain/threads/thread-service.ts`](./src/domain/threads/thread-service.ts) and [`src/domain/sessions/session-service.ts`](./src/domain/sessions/session-service.ts). This includes `listThreads`, `getThread`, `getThreadView`, `openThread`, `listSessions`, `getSession`, and the route surfaces in [`src/routes/threads.ts`](./src/routes/threads.ts) and [`src/routes/workspaces.ts`](./src/routes/workspaces.ts) that currently project `sessions` rows as if they were native-backed thread facts.
- Issue `#323`: replace DB-only transcript/history reads in [`src/domain/sessions/session-service.ts`](./src/domain/sessions/session-service.ts) `listMessages` and in [`src/domain/threads/thread-service.ts`](./src/domain/threads/thread-service.ts) `listThreadFeed` / `listTimeline`. The affected read surfaces are `/api/v1/threads/:threadId/feed` and `/api/v1/threads/:threadId/timeline`, and any session message/event route that still reads `messages` or `session_events` as transcript truth.
- Issue `#324`: constrain persistence writes in [`src/domain/threads/thread-input-orchestrator.ts`](./src/domain/threads/thread-input-orchestrator.ts), [`src/domain/sessions/session-event-publisher.ts`](./src/domain/sessions/session-event-publisher.ts), and [`src/domain/sessions/session-service.ts`](./src/domain/sessions/session-service.ts) so `sessions`, `messages`, and `session_events` retain only bounded helper state, idempotency data, and recovery metadata instead of growing into the canonical native conversation record.
- Issue `#324`: keep [`src/domain/workspaces/workspace-registry.ts`](./src/domain/workspaces/workspace-registry.ts) and [`src/domain/threads/thread-request-persistence.ts`](./src/domain/threads/thread-request-persistence.ts) inside the retained surface. `workspaces`, `workspace_session_mappings`, `thread_input_requests`, and bounded `approvals` retention remain valid app-owned persistence; `approvals` should stay a helper/detail store rather than become proof of full native event history.

Until those follow-ups land, read every `sessions`, `messages`, and `session_events` row as a local helper candidate. Native app-server reads and native-backed projections are the source for thread existence, sendability, current status, and transcript/history truth.

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
