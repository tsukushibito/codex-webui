# Issue 289 Active Codex Progress

## Purpose

- Show normal Codex running/streaming progress in the active Codex Timeline row instead of as distant global chrome.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/289

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/notes/codex_webui_timeline_contextual_request_and_expansion_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Render a compact in-row progress indicator for active live Codex/assistant rows.
- Keep accessible working status text for screen readers.
- Avoid showing normal running state as prominent global/header copy.
- Preserve exceptional reconnect/error/global states.
- Avoid layout shifts between running and completed assistant rows.

## Exit criteria

- Active Codex rows show an in-context progress indicator while streaming/running.
- Completed Codex rows do not show the running indicator.
- Reconnect/error states remain discoverable outside the normal progress indicator.
- Focused frontend tests and pre-push validation pass.

## Work plan

- Inspect active assistant row rendering and live row model state.
- Add compact progress indicator for live Codex rows.
- Add focused tests for live versus completed row behavior.
- Run targeted frontend validation.

## Artifacts / evidence

- Local frontend validation:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `npm test -- chat-view-timeline.test.tsx chat-view.test.tsx`
- Sprint evaluator: approved.
- Pre-push validation:
  - `npm run check` passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `npm test -- chat-view-timeline.test.tsx chat-view.test.tsx` passed with 26 tests.

## Status / handoff notes

- Status: `pre-push-validated`
- Notes: Live Codex progress now renders inside active assistant timeline rows with accessible streaming status text, including an empty placeholder row before the first assistant delta arrives. Normal running feedback no longer appears as the inline thread feedback card when a live assistant row is present, while reconnecting and error states remain on the thread feedback surface. Sprint evaluator and pre-push validation passed in the worktree.

## Archive conditions

- Archive this package when the exit criteria are met, pre-push validation has passed, and handoff notes are updated with validation evidence.
