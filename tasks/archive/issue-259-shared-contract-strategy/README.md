# issue-259-shared-contract-strategy

## Purpose

Reduce drift between runtime response shapes, BFF runtime-client types, public mappings, and tests through a deliberate shared-contract strategy.

## Primary issue

- GitHub Issue: #259

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `apps/codex-runtime/README.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Evaluate the minimal shared package, schema export, or generated contract approach for current runtime/BFF boundaries.
- Document the chosen shared-contract decision in the maintained docs.
- If implementation proceeds, pilot the approach on one narrow v0.9 resource family only.
- Avoid broad contract migration or lockfile/workspace churn unless the planner proves it is necessary for the pilot.

## Exit criteria

- The repo has a documented shared-contract decision.
- Any implemented pilot is narrow, validated, and does not destabilize runtime or BFF tests.
- Evaluator review and dedicated pre-push validation pass before archive/PR follow-through.

## Work plan

1. Inspect existing runtime and BFF contract/type duplication.
2. Let the sprint planner choose the smallest viable decision/pilot slice.
3. Implement the approved slice.
4. Run targeted and app-level validation for touched areas.
5. Run evaluator review and dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint planner selected a maintained decision doc plus a narrow BFF-local runtime-boundary schema pilot for `GET /api/v1/workspaces/{workspace_id}/threads`.
- Added `docs/specs/codex_webui_shared_contract_strategy_v0_1.md`.
- Added `runtimeThreadSummarySchema` and `runtimeThreadListResponseSchema` in `apps/frontend-bff/src/runtime-types.ts`.
- Updated `listThreads` to validate runtime thread-list JSON before public mapping.
- Added `apps/frontend-bff/tests/runtime-thread-contract.test.ts` for valid thread-list mapping and drift rejection before mapping.
- Worker validation:
  - `git diff --check` passed.
  - `cd apps/frontend-bff && npm run check` passed.
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `cd apps/frontend-bff && node ./node_modules/vitest/vitest.mjs run tests/architecture-boundaries.test.ts tests/routes-workspace-home.test.ts tests/routes.test.ts tests/runtime-thread-contract.test.ts` passed, 4 files / 26 tests.
  - `cd apps/frontend-bff && npm test` passed, 15 files / 104 tests.
  - `cd apps/codex-runtime && npm run check` passed.
  - `cd apps/codex-runtime && npm test` passed, 6 files / 42 tests.
- Evaluator verdict: `approved`.
- Dedicated pre-push validation: passed `git diff --check`, BFF check, BFF tsc, targeted BFF tests, full BFF test, BFF build, runtime check, and runtime test.

## Status / handoff notes

- Status: locally complete; ready for PR and merge follow-through.
- Active branch: `issue-259-shared-contract-strategy`.
- Active worktree: `.worktrees/issue-259-shared-contract-strategy`.
- Completion tracking, PR merge, worktree cleanup, Project `Done`, and Issue close remain pending.

## Completion retrospective

### Completion boundary

Package archive before PR follow-through for Issue #259.

### Contract check

- Satisfied: the shared-contract decision is documented at `docs/specs/codex_webui_shared_contract_strategy_v0_1.md`.
- Satisfied: root workspace/shared package/generator work is explicitly deferred with promotion criteria instead of left ambiguous.
- Satisfied: the executable pilot is limited to `GET /api/v1/workspaces/{workspace_id}/threads` and validates runtime JSON before public mapping.
- Satisfied: runtime and BFF validation passed without package/workspace churn.

### What worked

- Planning narrowed a broad architecture issue into a decision plus one executable contract pilot.
- Keeping the pilot inside the BFF runtime boundary avoided cross-app imports and package manager changes.

### Workflow problems

- The worktree-local `node_modules` symlink was initially created one directory too shallow and had to be corrected before validation.

### Improvements to adopt

- For future worktree setup, use `../../../../apps/<app>/node_modules` from app directories inside `.worktrees/<branch>/`.

### Skill candidates or skill updates

None.

### Follow-up updates

None.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Completion retrospective is recorded.
- Package is moved to `tasks/archive/issue-259-shared-contract-strategy/` before PR completion tracking.
