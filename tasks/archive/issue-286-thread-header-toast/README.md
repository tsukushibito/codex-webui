# Issue 286 Thread Header Toast

## Purpose

- Remove user-visible thread-start implementation noise and simplify the selected Thread View header so normal read-and-reply flow stays focused on the Timeline.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/286

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/notes/codex_webui_thread_view_information_architecture_note_v0_1.md`
- `docs/notes/codex_webui_timeline_contextual_request_and_expansion_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Remove visible `Started thread <thread_id>.` success copy from the browser flow.
- Keep thread identifiers available only through details/debug-oriented surfaces.
- Remove or reduce the redundant desktop top header when Navigation and Thread View already expose the useful context.
- Preserve discoverability for exceptional global states such as reconnecting or errors.

## Exit criteria

- Starting a new thread no longer shows a visible success message containing the thread ID.
- The selected desktop Thread View does not show a redundant workspace/header row during the normal reading flow.
- Exceptional connection/problem states remain visible in an appropriate global or composer-adjacent surface.
- Focused tests and relevant validation pass for the changed frontend surface.

## Work plan

- Inspect the current thread-start status and selected-thread header rendering paths.
- Update the frontend state/rendering so thread-start success IDs are not user-visible.
- Simplify normal selected-thread header chrome without hiding exceptional states.
- Add or update focused coverage for the affected rendering behavior.
- Run the frontend validation commands appropriate for the change.

## Artifacts / evidence

- Sprint evaluator: approved Issue #286 implementation.
- Pre-push validation:
  - `npm run check`: passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `node ./node_modules/vitest/vitest.mjs run tests/chat-page-client.test.tsx tests/chat-view.test.tsx`: passed, 2 files / 33 tests.

## Status / handoff notes

- Status: `locally complete`
- Notes: Removed the visible thread-start ID status message, simplified the normal selected Thread View header chrome, kept Thread Details reachable, and preserved exceptional-state feedback through existing global/composer-adjacent surfaces.
- Completion retrospective:
  - Completion boundary: package archive, not final Issue close.
  - Contract check: package exit criteria satisfied by implementation diff, focused tests, evaluator approval, and pre-push validation evidence.
  - What worked: the issue was narrow enough for one sprint and the existing tests covered the relevant UI seams.
  - Workflow problems: none requiring docs or skill updates.
  - Improvements to adopt: keep future UI follow-ups similarly narrow when they come from screenshot review.
  - Skill candidates or skill updates: none.
  - Follow-up updates: publish via PR, merge to `main`, clean up the worktree, then close Issue #286 and mark Project `Done`.

## Archive conditions

- Archive this package when the exit criteria are met, pre-push validation has passed, and handoff notes are updated with validation evidence.
