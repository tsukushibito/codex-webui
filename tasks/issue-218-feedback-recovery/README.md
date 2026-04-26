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

- Planned: focused frontend validation command output in handoff notes.

## Status / handoff notes

- Status: `started`
- Active branch: `issue-218-feedback-recovery`
- Active worktree: `.worktrees/issue-218-feedback-recovery`
- Notes: Package created from #218 before implementation.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
