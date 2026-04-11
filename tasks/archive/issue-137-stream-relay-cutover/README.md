# Issue 137 Stream Relay Cutover

## Purpose

- Implement the Phase 4A stream-relay slice so the browser-visible SSE surface uses v0.9 thread and notifications streams.

## Primary issue

- Issue: `#137` `Phase 4A-3: Cut over frontend-bff thread and notifications stream relays`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Replace the public BFF SSE relay routes with `GET /api/v1/threads/{thread_id}/stream` and `GET /api/v1/notifications/stream`
- Update browser-facing stream consumers and focused tests that still depend on the old session/approval stream paths
- Keep legacy REST and non-stream browser-surface retirement out of scope for this package and leave it to `#138`

## Exit criteria

- `frontend-bff` exposes thread and notifications SSE relays aligned with the maintained v0.9 public API
- Browser-facing stream consumers no longer depend on `/api/v1/sessions/{session_id}/stream` or `/api/v1/approvals/stream`
- Focused validation covers the new relay paths and browser-side stream hookup

## Work plan

- Audit the current relay handlers, browser stream consumers, and test fixtures that still reference the old public stream surface
- Implement the v0.9 thread and notifications stream relay routes and update the stream event mapping as needed
- Cut over the browser-side EventSource usage and focused test coverage to the new public endpoints
- Run targeted validation, then the dedicated pre-push validation gate before archive or publish-oriented follow-through

## Artifacts / evidence

- Planned validation: `npm run check`
- Planned validation: `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
- Planned validation: `npm test -- tests/routes.test.ts tests/chat-page-client.test.tsx tests/approval-page-client.test.tsx`
- Planned validation: `npm run build`
- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-11T00-00-00Z-issues-137-138-close/events.ndjson`

## Status / handoff notes

- Status: `locally complete`
- Notes: Added public v0.9 SSE relay routes for `GET /api/v1/threads/{thread_id}/stream` and `GET /api/v1/notifications/stream` without retiring the legacy browser paths. Focused validation passed with `npm test -- tests/routes.test.ts`, `npm run check`, `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`, and `npm run build`. `#138` remains parked until this slice is merged and post-handoff intake confirms the remaining legacy-surface work.

## Archive conditions

- Archive this package when the stream-relay slice is locally complete, the dedicated pre-push validation gate has passed, and the handoff notes are updated.
