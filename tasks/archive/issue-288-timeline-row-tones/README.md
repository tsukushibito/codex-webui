# Issue 288 Timeline Row Tones

## Purpose

- Improve Timeline scanability by giving major row categories restrained semantic visual treatment.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/288

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/notes/codex_webui_timeline_contextual_request_and_expansion_note_v0_1.md`
- `docs/notes/codex_webui_thread_view_information_architecture_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Add semantic row classes or display-model tones for user messages, Codex responses, request/approval rows, tool/output/log rows, error rows, and muted system/status rows.
- Use restrained borders, badges, or subtle backgrounds without heavy full-card color blocks.
- Keep conversation rows readable and dominant.
- Preserve existing expansion-default behavior.
- Add focused tests where practical.

## Exit criteria

- Major Timeline categories have distinguishable but restrained visual treatment.
- Color is used for operational meaning rather than decoration.
- Existing expansion-default behavior remains intact.
- Focused tests cover semantic row classification or rendering.
- Frontend validation and pre-push validation pass.

## Work plan

- Inspect Timeline display model roles and row rendering classes.
- Extend semantic classification where needed without changing API contracts.
- Add restrained CSS row treatments.
- Update focused tests for semantic class assignment/rendering.
- Run targeted frontend validation.

## Artifacts / evidence

- Local review result: no discrete regressions found for the tone-classification slice.
- Validation evidence:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `npm test -- tests/timeline-display-model.test.ts tests/chat-view-timeline.test.tsx`
  - `npm test -- tests/timeline-display-model.test.ts tests/chat-view-timeline.test.tsx tests/chat-view-details.test.tsx`

## Status / handoff notes

- Status: `implemented`
- Notes: Added additive Timeline row tone classes and display-model tone mapping for user, Codex, request, tool, error, and muted rows. Local checks passed in the worktree. Pre-push validation still remains before any archive or merge-oriented handoff.

## Archive conditions

- Archive this package when the exit criteria are met, pre-push validation has passed, and handoff notes are updated with validation evidence.
