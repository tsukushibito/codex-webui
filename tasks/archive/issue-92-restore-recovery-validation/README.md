# Issue 92 Restore Recovery Validation

## Purpose

- Execute the Phase 5 restore/recovery validation slice for `#92` and capture any blocking mismatches against the maintained MVP recovery contract.

## Primary issue

- Issue: `#92 https://github.com/tsukushibito/codex-webui/issues/92`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_public_api_v0_8.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md`

## Scope for this package

- Validate browser reload restoration for session, message, and approval state using the current runtime and BFF behavior.
- Validate SSE disconnect to reconnect to REST reacquire convergence where repo-local evidence can exercise it.
- Validate pending approval redisplay and stop-time approval consistency.
- Record concrete reproduction notes for recovery mismatches and link any required follow-up issues.

## Exit criteria

- Restore/recovery checks for the MVP-target paths have been executed against the current implementation.
- Blocking findings are enumerated with reproduction notes and linked follow-up issues where needed.
- The package notes identify what remains for `#63` after this validation slice.

## Work plan

- Review the maintained recovery and reconnection contract for session, message, and approval state.
- Exercise runtime and BFF behavior for reload, reconnect, pending approval redisplay, and stop-time consistency.
- Record findings and open or link follow-up issues for any blocking mismatches.
- Summarize the validation outcome and update issue tracking for the next Phase 5 slice.

## Artifacts / evidence

- Runtime recovery validation:
  - `cd apps/codex-runtime && npm test -- --run tests/session-routes.test.ts -t 'cancels a pending approval when the session is stopped|surfaces resolved approval mismatches as recovery_pending and reconciles them|repairs a missing active approval id by relinking the pending approval'`
  - `cd apps/codex-runtime && npm test -- --run tests/workspace-routes.test.ts -t 'reconciles a stale active session pointer to the persisted active session|relinks a missing active session and recomputes pending approval count'`
- BFF validation:
  - `cd apps/frontend-bff && npm test`
- BFF restore/reconnect implementation reviewed:
  - `apps/frontend-bff/src/chat-page-client.tsx`
  - `apps/frontend-bff/src/approval-page-client.tsx`
  - `apps/frontend-bff/src/chat-data.ts`
  - `apps/frontend-bff/src/approval-data.ts`
- Current findings:
  - No blocking restore/recovery contract mismatch was observed in the runtime reconcile paths, stop-time approval cancellation path, or BFF REST reacquire implementations exercised in this slice.
  - Residual risk: reconnect and reload behavior is exercised here through repo-local tests plus code-path inspection, but not yet through a real browser session. That browser-path validation remains for `#93`.

## Status / handoff notes

- Status: `ready to archive`
- Notes: `Completion retrospective: package archive boundary reached for the restore/recovery validation slice. Exit criteria check: runtime reconcile and stop-time recovery tests passed, BFF tests passed, and the reconnect/reacquire code paths align with the maintained contract for session/messages/events and pending approvals. What worked: existing runtime recovery coverage made it straightforward to confirm server-side restore guarantees before checking BFF reacquire paths. Workflow problems: the worktree node_modules symlink pattern copied from the package skill was one directory too shallow for apps/<app>/node_modules, so test execution initially failed for environment reasons. Improvements to adopt: fix the shared-node_modules symlink recipe in the repo skill so new worktrees resolve dependencies correctly. Remaining follow-up: archive this package, push the tracking-only branch, and leave real browser reconnection validation to #93.`

## Archive conditions

- Archive this package when the restore/recovery exit criteria are met, the handoff notes are updated, and the active slice is ready to move to `tasks/archive/`.
