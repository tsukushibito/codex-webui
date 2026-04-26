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

- Sprint validation:
  - `npm run check`: passed
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed
  - `npm test -- tests/chat-view.test.tsx tests/chat-page-client.test.tsx`: passed, 25 tests
- Dedicated pre-push validation:
  - `npm run check`: passed
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed
  - focused Vitest: 2 files passed, 25 tests passed
  - full `npm test`: 11 files passed, 84 tests passed

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-217-navigation-return-surface`
- Active worktree: `.worktrees/issue-217-navigation-return-surface`
- Notes: Implemented client-local Navigation filters/counts, title-first thread rows, selected/background notice cues, compact status/cue display, and removal of dominant raw thread refs. Evaluator approved after `Recent` was corrected to use current API list ordering and existing state cues instead of a synthetic resume-cue value.
- Completion retrospective:
  - Completion boundary: package archive after local completion and pre-push validation.
  - Contract check: Issue #217 acceptance criteria are satisfied locally; Issue close still requires PR merge to `main`, parent checkout sync, worktree cleanup, and GitHub tracking update.
  - What worked: evaluator caught a production-data mismatch in the initial `Recent` filter before publication.
  - Workflow problems: early tests used a synthetic `recent` resume cue that current BFF mapping does not emit.
  - Improvements to adopt: filter/cue tests should include mapped-production-like fixtures for values derived from BFF mappers.
  - Skill candidates or skill updates: none required.
  - Follow-up updates: none required before archive; publish-oriented GitHub handoff remains required.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
