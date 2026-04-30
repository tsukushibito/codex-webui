# Runtime Native Thread Reachability

## Purpose

- Make runtime thread read/list/view sendability depend on native app-server reachability instead of SQLite-only `sessions` rows.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/323

## Source docs

- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `apps/codex-runtime/README.md`
- `apps/codex-runtime/src/domain/threads/thread-service.ts`
- `apps/codex-runtime/src/domain/app-server/codex-app-server-gateway.ts`

## Scope for this package

- Add or extend the native app-server gateway boundary needed to read, resume, or check a thread by native `thread.id`.
- Update runtime thread list/read/view paths so SQLite mappings are candidates, not proof of native thread existence.
- Ensure missing-rollout or native thread-not-found responses become explicit WebUI unavailable/not-found/recovery states.
- Cover stale DB-only threads that exist in SQLite but cannot be loaded by app-server.

## Exit criteria

- `GET /api/v1/workspaces/{workspace_id}/threads`, `GET /api/v1/threads/{thread_id}`, and `GET /api/v1/threads/{thread_id}/view` do not present stale DB-only threads as normally sendable.
- Runtime tests cover SQLite-containing/native-missing thread read or view behavior.
- Behavior remains aligned with #321 and the runtime README persistence boundary.

## Work plan

- Inspect native gateway capabilities and fake app-server fixtures.
- Plan and implement one bounded native reachability slice through the sprint workflow.
- Run targeted runtime tests and app-local validation.

## Artifacts / evidence

- Planned evidence: runtime test output and app-local validation in handoff notes.

## Status / handoff notes

- Status: `locally complete`
- Notes: Implemented read-side native reachability checks for waiting-input/open thread summaries.
- Sprint evidence: planner selected the read-side reachability gate; worker updated runtime thread service/input helper/tests; evaluator verdict was `approved`.
- Pre-push validation: passed with `npm run check`, focused `tests/thread-routes.test.ts`, `npm run build`, and `git diff --check`.
- Completion retrospective:
  - Completion boundary: package archive only; Issue close still requires PR publication, merge to `main`, parent checkout sync, and worktree cleanup.
  - Contract check: package scope satisfied by list/read/view stale DB-only coverage and missing `thread/resume` recovery mapping.
  - What worked: reusing the shared missing-native-thread classifier kept input and read-side behavior aligned.
  - Workflow problems: none beyond the still-active GitHub GraphQL quota pressure during broad Project reads.
  - Improvements to adopt: keep using narrow Issue/API reads while Project GraphQL quota is constrained.
  - Skill candidates or updates: none.
  - Follow-up updates: continue with PR publication and completion tracking for #323, then resume #321 through #324.

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate has passed, and handoff notes are updated.
