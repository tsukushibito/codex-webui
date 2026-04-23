# Issue 182 Thread View Composer

## Purpose

- Implement the v0.9 thread view shell and single composer flow for Issue #182.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/182

## Source docs

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Implement thread header and current activity presentation in the browser thread surface.
- Replace separate thread-creation and chat composers with one composer path for new-thread start and existing-thread continuation.
- Implement composer availability states for accepting input, approval pending, interrupt recommended, and recovery pending.
- Keep the composer visible and understandable while streaming or blocked, without adding a standalone approval flow.

## Exit criteria

- The UI no longer exposes separate thread-creation and chat composers.
- First workspace-context send starts a thread through the v0.9 path.
- Opening a thread makes current state and available action clear without leaving thread context.
- Focused frontend validation covers the changed thread view and composer behavior.

## Work plan

- Inspect the current `apps/frontend-bff` UI structure, view-model helpers, and tests for thread view, Navigation, composer, and request-state behavior.
- Plan a bounded implementation slice around existing component and route patterns.
- Update the thread shell, header/current activity display, and composer state handling.
- Add or update focused tests for single-composer behavior, first-input thread start, existing-thread continuation, and blocked/streaming states.
- Run targeted validation first, then app-level validation required by `apps/frontend-bff/README.md` as scope permits.

## Artifacts / evidence

- 2026-04-23 worker sprint validation:
  - `npm run check` in `apps/frontend-bff` passed.
  - `npm test -- tests/chat-view.test.tsx tests/chat-page-client.test.tsx tests/chat-data.test.ts tests/routes.test.ts` passed: 4 files, 40 tests.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
- 2026-04-23 sprint evaluator approved the planner-defined implementation slice.
- 2026-04-23 dedicated pre-push validation passed:
  - `npm run check` passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - Targeted Vitest passed: 4 files, 40 tests.
  - Full Vitest passed: 10 files, 60 tests.
  - `npm run build` passed.

## Status / handoff notes

- Status: `sprint evaluator approved; dedicated pre-push validation passed; package archived pending publish follow-through`
- Active branch: `issue-182-thread-view-composer`
- Active worktree: `.worktrees/issue-182-thread-view-composer`
- Retrospective:
  - Completion boundary: package archive only; Issue close is not yet eligible because the work is not reachable on `main`.
  - Contract check: package exit criteria are satisfied by evaluator approval and pre-push validation; Issue close conditions are not applicable at this boundary.
  - What worked: the sprint evaluator and pre-push gates gave clear local completion evidence before archive.
  - Workflow problems: none requiring a separate artifact.
  - Improvements to adopt: keep archive notes explicit that package completion is separate from PR, merge, sync, cleanup, and final Issue/Project completion.
  - Skill candidates or skill updates: none.
  - Follow-up updates: commit and PR, merge to `main`, sync the parent checkout, clean up the active worktree, then close Issue #182 and set the Project item to `Done` only after the repo is clean and synced.
- Notes: Implemented the planner-approved single Thread View composer slice for Issue #182. This package is being archived now; no commit was created, no PR was opened, no GitHub Project state was changed, and no server was started.

## Archive conditions

- Archive this package after the exit criteria are met, dedicated pre-push validation passes, completion retrospective is recorded, and handoff notes are updated.
