# Issue 218 Feedback Recovery

## Purpose

- Execute Issue #218 by making post-action progress, scroll behavior, and degraded-state recovery actions explicit in Thread View.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/218

## Source docs

- `docs/notes/codex_webui_current_ui_gap_analysis_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Show clearer post-submit state progression for accepted, opening/connecting, running, completed, or blocked states where current client state supports it.
- Define bounded scroll anchoring for open, send, live streaming, approval, and recovery without disrupting users reading older context.
- Add action-oriented CTAs for degraded states where supported by existing actions.

## Exit criteria

- Users can tell whether input was accepted and what the UI is waiting for.
- New live content is reachable without disruptive scroll jumps.
- Failure and degraded states show a clear next action in thread context.
- Focused frontend validation passes for the changed feedback/recovery behavior.

## Work plan

- Inspect `chat-page-client.tsx` and `chat-view.tsx` state/status handling.
- Implement one bounded feedback/recovery slice from existing state and actions only.
- Add focused tests for progression text, recovery CTAs, and scroll anchoring behavior where testable.
- Run targeted frontend validation.

## Artifacts / evidence

- Sprint validation:
  - `npm run check`: passed
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed
  - `npm test -- chat-view.test.tsx chat-page-client.test.tsx`: passed, 29 tests
- Dedicated pre-push validation:
  - `npm run check`: passed
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed
  - focused Vitest: 2 files passed, 29 tests passed
  - full `npm test`: 11 files passed, 88 tests passed

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-218-feedback-recovery`
- Active worktree: `.worktrees/issue-218-feedback-recovery`
- Notes: Implemented Thread View feedback/recovery states, supported CTAs, and bounded scroll anchoring with a latest-activity CTA. Evaluator approved after same-row live assistant content growth was added to the scroll-follow trigger.
- Completion retrospective:
  - Completion boundary: package archive after local completion and pre-push validation.
  - Contract check: Issue #218 acceptance criteria are satisfied locally; Issue close still requires PR merge to `main`, parent checkout sync, worktree cleanup, and GitHub tracking update.
  - What worked: evaluator caught a live-stream scroll anchoring gap that jsdom tests could target directly.
  - Workflow problems: none requiring durable workflow changes.
  - Improvements to adopt: scroll anchoring tests should include same-row content growth, not only appended rows.
  - Skill candidates or skill updates: none required.
  - Follow-up updates: none required before archive; publish-oriented GitHub handoff remains required.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
