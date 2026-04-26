# Issue 217 Navigation Return Surface

## Purpose

- Execute Issue #217 by making Navigation useful for identifying, resuming, and prioritizing threads without opening each thread.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/217

## Source docs

- `docs/notes/codex_webui_current_ui_gap_analysis_note_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Improve Navigation thread rows around title, relative time, activity summary, compact status badge, and selected state.
- Add or refine filters/counts for all, active, waiting approval, errors, and recent where current data supports it.
- Add unread/new-activity cues for background thread changes without automatic context switching.
- Keep workspace switching compact and secondary to current-workspace thread discovery.

## Exit criteria

- Users can identify what each thread is and why it matters from Navigation alone.
- Background updates are noticeable without automatic context switching.
- Raw thread refs are not the dominant row content.
- Focused frontend validation passes for the changed Navigation behavior.

## Work plan

- Inspect current Navigation rendering in `chat-view.tsx` and available thread list fields.
- Implement a bounded Navigation row/readability slice without changing backend contracts.
- Add supported filter/count or cue behavior from existing data only.
- Add focused tests for row content, selected/background cues, and counts.
- Run targeted frontend validation.

## Artifacts / evidence

- Planned: focused frontend test and validation command output in handoff notes.
- Planned if visually material: `artifacts/visual-inspection/issue-217-navigation-return-surface/`

## Status / handoff notes

- Status: `started`
- Active branch: `issue-217-navigation-return-surface`
- Active worktree: `.worktrees/issue-217-navigation-return-surface`
- Notes: Package created from #217 before implementation.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
