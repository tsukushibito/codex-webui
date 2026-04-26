# issue-250-chat-page-hooks

## Purpose

Extract state/effect orchestration from `apps/frontend-bff/src/chat-page-client.tsx` into focused hooks while keeping the rendered chat experience unchanged.

## Primary issue

- GitHub Issue: #250

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Extract a bounded subset of chat page state/effect logic into named hooks.
- Keep visual JSX behavior unchanged.
- Preserve chat-page-client tests or update focused tests only when the extracted behavior needs clearer coverage.

## Exit criteria

- Render logic is smaller and selected state transitions live in named hooks.
- Existing chat-page-client coverage remains meaningful and passes, or any baseline drift is explicitly resolved in this Issue.
- BFF check, TypeScript, focused tests, build, evaluator, and pre-push validation pass.

## Work plan

1. Map current state/effect clusters in `chat-page-client.tsx`.
2. Let the sprint planner choose a small hook-extraction slice.
3. Implement the approved hook extraction from this worktree.
4. Run focused UI validation and evaluator review.
5. Run dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint planner selected a narrow selected-thread bundle hook extraction.
- Worker extracted `useSelectedThreadBundle` into `apps/frontend-bff/src/use-selected-thread-bundle.ts` and wired `apps/frontend-bff/src/chat-page-client.tsx` to consume it.
- Worker repaired two stale `Selected` assertions by checking `button[aria-current="page"]` selection state instead of visible copy.
- First evaluator verdict: changes required. Clearing selection did not invalidate an in-flight selected-thread bundle refresh.
- Follow-up worker fix advanced the selected-thread refresh generation during clear and added a regression test for clearing via Ask Codex while an initial selected-thread bundle load is pending.
- Final evaluator verdict: approved.
- Validation evidence before pre-push:
  - `cd apps/frontend-bff && npm run check`: pass.
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: pass.
  - `cd apps/frontend-bff && npm test -- --run tests/chat-page-client.test.tsx`: pass, 19 tests.
  - `cd apps/frontend-bff && npm test`: pass, 99 tests across 11 files.
  - `cd apps/frontend-bff && npm run build`: pass.
  - `git diff --check`: pass.
- Dedicated pre-push validation evidence:
  - `cd apps/frontend-bff && npm run check`: pass.
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: pass.
  - `cd apps/frontend-bff && npm test -- --run tests/chat-page-client.test.tsx`: pass, 19 tests.
  - `cd apps/frontend-bff && npm test`: pass, 99 tests across 11 files.
  - `cd apps/frontend-bff && npm run build`: pass.
  - `rg` checks confirm `useSelectedThreadBundle`, the selected-thread refresh id, and ARIA-based selected-thread assertions are present.
  - `git diff --check`: pass.

## Status / handoff notes

- Status: locally complete; ready for archive and PR follow-through.
- Active branch: `issue-250-chat-page-hooks`.
- Active worktree: `.worktrees/issue-250-chat-page-hooks`.
- Completion tracking, PR merge, worktree cleanup, Project `Done`, and Issue close remain pending.
- Completion retrospective:
  - Completion boundary: package archive before PR publication.
  - Contract check: selected-thread bundle state/effects now live in `useSelectedThreadBundle`, the page client render/orchestration stayed intact, stale load clearing is covered by regression test, and chat-page/full BFF tests pass.
  - What worked: the evaluator caught a real stale-clear bug before publish, and the follow-up regression test made the hook boundary safer.
  - Workflow problems: none beyond the expected multi-pass review cycle for stateful UI extraction.
  - Improvements to adopt: when extracting hooks around async state, include a clear/unmount stale-response case in the initial acceptance tests.
  - Skill candidates or skill updates: none.
  - Follow-up updates: publish PR, merge to `main`, remove the worktree, clear Issue execution links, set Project status to `Done`, and close #250.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Package is moved to `tasks/archive/issue-250-chat-page-hooks/` before PR completion tracking.
