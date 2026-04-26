# Issue 216 Timeline Chronology

## Purpose

- Execute Issue #216 by making the selected-thread timeline read as a useful work chronology rather than raw event plumbing.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/216

## Source docs

- `docs/notes/codex_webui_current_ui_gap_analysis_note_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Collapse stored and live assistant deltas into logical assistant rows where available.
- Demote routine status transitions that do not add user-facing value.
- Introduce role-specific timeline rendering for high-value user, assistant, command/tool, approval, resolution, error, and recovery content where the current model exposes enough data.
- Remove repeated generic `Timeline item detail` buttons from low-value rows.

## Exit criteria

- Selected-thread timelines foreground useful user/Codex work content over status noise.
- Assistant streaming and completion do not produce duplicate or per-delta cards.
- Routine implementation events are hidden, compact, or folded into meaningful row metadata.
- Focused frontend validation passes for the changed timeline display model and rendering.

## Work plan

- Inspect current `timeline-display-model.ts`, `chat-view.tsx`, and focused tests.
- Define the smallest timeline display model change that collapses low-value assistant deltas/status noise without broadening into artifact inspection.
- Update timeline rendering to avoid generic detail buttons on low-value rows.
- Add focused tests for assistant delta/status collapse and preserved high-value rows.
- Run targeted validation and capture visual evidence if the UI structure changes materially.

## Artifacts / evidence

- Sprint validation:
  - `npm test -- --run tests/timeline-display-model.test.ts tests/chat-view.test.tsx`: passed, 22 tests
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed
  - `npm run check`: passed
- Dedicated pre-push validation:
  - `npm run check`: passed
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed
  - focused Vitest: 2 files passed, 22 tests passed
  - full `npm test`: 11 files passed, 82 tests passed

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-216-timeline-chronology`
- Active worktree: `.worktrees/issue-216-timeline-chronology`
- Notes: Implemented timeline display-model normalization for assistant delta/completion collapse, REST/stream convergence, routine status suppression, failure/recovery preservation, and detail-button gating. Evaluator approved after regressions covered public REST assistant shape, live REST/SSE overlap, and canonical `to_status` failure/recovery payloads.
- Completion retrospective:
  - Completion boundary: package archive after local completion and pre-push validation.
  - Contract check: Issue #216 acceptance criteria are satisfied locally; Issue close still requires PR merge to `main`, parent checkout sync, worktree cleanup, and GitHub tracking update.
  - What worked: evaluator passes caught important real-shape convergence gaps that synthetic tests initially missed.
  - Workflow problems: the sprint required several rejection cycles because early tests used idealized assistant identifiers rather than the mapped public REST shape.
  - Improvements to adopt: timeline display-model tests should include public-mapped REST fixtures whenever behavior depends on payload identity.
  - Skill candidates or skill updates: consider adding evaluator prompt guidance for UI model changes to inspect public mapping shape before approval.
  - Follow-up updates: none required before archive; publish-oriented GitHub handoff remains required.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
