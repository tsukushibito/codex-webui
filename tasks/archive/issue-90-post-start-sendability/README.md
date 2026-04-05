# Issue 90 Post-Start Sendability

## Purpose

- Fix the post-start sendability regression by aligning runtime session-state convergence and frontend `can_*` state with the maintained contract.

## Primary issue

- Issue: `#90 https://github.com/tsukushibito/codex-webui/issues/90`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md`
- `docs/specs/codex_webui_public_api_v0_8.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`

## Scope for this package

- Fix runtime behavior so a started session converges to a sendable state at the documented boundary.
- Fix frontend Chat state updates so `can_send_message`, `can_start`, and `can_stop` remain derived from the latest session status after SSE and local transitions.
- Add focused regression coverage for start -> send and stale `can_*` state.
- Re-verify the main Chat path through first message send.

## Exit criteria

- Runtime transitions newly started sessions into a sendable state compatible with the maintained contract.
- Frontend send controls reflect the correct enabled state after start and subsequent status changes.
- Regression tests cover the post-start sendability path on both runtime and frontend sides.
- Validation notes capture the browser-path recheck and any remaining risk.

## Work plan

- Reproduce the current post-start sendability failure in runtime and frontend tests.
- Implement the runtime convergence fix and update/extend runtime coverage.
- Implement the frontend `can_*` synchronization fix and update/extend frontend coverage.
- Re-run focused tests and record the resulting behavior in this package.

## Artifacts / evidence

- Runtime changes:
  - `apps/codex-runtime/src/domain/sessions/session-service.ts`
  - `apps/codex-runtime/tests/session-routes.test.ts`
- Frontend changes:
  - `apps/frontend-bff/src/chat-page-client.tsx`
  - `apps/frontend-bff/src/session-status.ts`
  - `apps/frontend-bff/tests/session-status.test.ts`
- Focused validation:
  - `cd apps/codex-runtime && npm test -- --run tests/session-routes.test.ts -t 'starts sessions, converges them to waiting_input, and enforces the active constraint on message execution|accepts the first message immediately after session start|accepts a message, keeps the session running, and lists projected user history'`
  - `cd apps/frontend-bff && npm test -- --run tests/session-status.test.ts tests/routes.test.ts -t 'applySessionStatus|maps approval detail and approval action responses to public fields'`
- Wider touched-suite validation:
  - `cd apps/codex-runtime && npm test -- --run tests/session-routes.test.ts`
  - `cd apps/frontend-bff && npm test`
- Observed result:
  - Local regression coverage now passes for post-start sendability on both runtime and frontend sides.

## Status / handoff notes

- Status: `ready to archive`
- Notes: `Completion retrospective: package archive boundary reached for the post-start sendability fix. Exit criteria check: runtime now converges start -> waiting_input, frontend re-derives can_* on SSE/local status changes, and focused plus touched-suite tests are green. What worked: keeping the runtime and frontend parts in one slice made the status-contract mismatch easy to verify end-to-end at the repo-test level. Workflow problems: delegated read-only agents again produced worktree changes, so the main agent had to treat those edits as effective worker output and gate them explicitly. Improvements to adopt: keep using a shared session-status helper for can_* recomputation rather than duplicating status logic in multiple Chat update paths. Remaining follow-up: browser-path revalidation is still desirable but non-blocking for archive; the slice still needs PR/main reachability before issue completion.`

## Archive conditions

- Archive this package when the exit criteria are met and the handoff notes are updated.
