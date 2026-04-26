# Issue 219 Contextual Details

## Purpose

- Execute Issue #219 by replacing generic timeline detail affordances with contextual inspection for task artifacts and operational risk.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/219

## Source docs

- `docs/notes/codex_webui_current_ui_gap_analysis_note_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Reserve visible detail actions for timeline rows with meaningful contextual content.
- Keep raw payload inspection behind an explicit debug affordance.
- Extract available commands, file paths, tests, diffs, request IDs, issue/PR links, and generated outputs into scannable detail content.
- Improve approval, error, failure, and request detail layouts around operation, target, consequence, and supporting artifacts.

## Exit criteria

- Detail Surface is useful for selected-item inspection without being required for basic notification.
- Timeline rows use contextual detail actions instead of a full-width generic detail button on every item.
- Coding artifacts are visible as first-class content rather than buried in prose or raw JSON.
- Focused frontend validation passes for contextual detail rendering and timeline action gating.

## Work plan

- Inspect current `chat-view.tsx` timeline/detail rendering and display-model detail action metadata.
- Define a small artifact extraction helper from existing row payload, summary, and content fields.
- Render contextual detail sections and debug payload access without changing public API contracts.
- Add focused tests for detail action visibility, artifact extraction, and debug payload gating.
- Run targeted frontend validation before pre-push validation.

## Artifacts / evidence

- Sprint validation:
  - `npm run check`: passed
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed
  - `node ./node_modules/vitest/vitest.mjs run tests/timeline-display-model.test.ts tests/chat-view.test.tsx tests/chat-page-client.test.tsx`: passed, 3 files / 47 tests
- Sprint evaluator: approved

## Status / handoff notes

- Status: `locally complete pending pre-push validation`
- Active branch: `issue-219-contextual-details`
- Active worktree: `.worktrees/issue-219-contextual-details`
- Notes: Implemented contextual timeline detail inspection for stored event rows. Detail actions are gated by extracted contextual signals, visible action labels are contextual, structured artifact/operation sections render before raw debug data, and raw payload JSON is available only behind a collapsed debug affordance. Keep #220 mobile density, #221 visual language, and #222 broader validation out of this slice except for tests directly covering #219 behavior.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
