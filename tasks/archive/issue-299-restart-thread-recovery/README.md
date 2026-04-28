# Runtime restart thread recovery

## Purpose

- Fix Issue #299 by making persisted runtime threads behave correctly after `codex-runtime` restarts with a fresh `codex app-server` child.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/299

## Source docs

- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Implement the runtime open/load/recovery boundary for persisted-but-not-loaded threads.
- Make thread view and follow-up input paths handle restart-time native reachability consistently.
- Add regression coverage for the restart or native `thread not found` path.
- Keep the change scoped to `apps/codex-runtime` unless tests reveal a required BFF error-mapping adjustment.

## Exit criteria

- `POST /api/v1/threads/{thread_id}/open`, `GET /api/v1/threads/{thread_id}/view`, and `POST /api/v1/threads/{thread_id}/inputs` have consistent behavior for persisted threads that are not loaded by the native app-server.
- Follow-up input after runtime restart either succeeds through a supported open/load path or fails with an explicit recovery-aware WebUI error instead of an unclassified native failure.
- Runtime tests cover the selected restart/not-loaded behavior and raw native `thread not found` mapping.
- `apps/codex-runtime` validation for the touched slice passes.

## Work plan

- Inspect the native app-server gateway capabilities and current error mapping around `turn/start`.
- Define the smallest supported open/load behavior that is consistent with the v0.9 docs and current native evidence.
- Update runtime thread service/orchestrator logic for view and input admission.
- Extend fake app-server or targeted tests to reproduce the restart/not-loaded path.
- Run targeted runtime tests and app-local checks.

## Artifacts / evidence

- Sprint evaluator verdict: approved.
- Dedicated pre-push validation: passed.
- Validation evidence from `apps/codex-runtime`:
  - `npm run check`
  - `npm test -- tests/thread-routes.test.ts`
  - `npm test`
  - `npm run build`

## Status / handoff notes

- Status: `locally complete`
- Notes: Implemented recovery-aware input blocking for persisted threads whose native `turn/start` reports a missing thread. The slice marks the runtime session `recovery_pending`, prevents misleading follow-up sends, and adds runtime regression coverage. Remaining workflow before Issue close: commit/push, open PR, merge to `main`, sync parent checkout, remove active worktree, and final GitHub Project/Issue completion tracking.
- Completion retrospective:
  - Completion boundary: package archive after local implementation, evaluator approval, and dedicated pre-push validation.
  - Contract check: package exit criteria satisfied by runtime changes and tests; Issue close is not applicable until the work reaches `main`.
  - What worked: the planner kept the first sprint narrow enough to safely address the user-visible restart failure without inventing unsupported native reopen/load behavior.
  - Workflow problems: none requiring a repo skill or docs update.
  - Improvements to adopt: keep distinguishing full native reopen/load support from recovery-aware failure handling when app-server evidence is incomplete.
  - Skill candidates or skill updates: none.
  - Follow-up updates: publish the branch through PR workflow and keep #299 open/In Progress until merged and cleaned up.

## Archive conditions

- Archive this package when the exit criteria are met, dedicated pre-push validation has passed, completion retrospective has been performed, and handoff notes are updated.
