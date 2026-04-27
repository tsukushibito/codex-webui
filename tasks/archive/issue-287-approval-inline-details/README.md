# Issue 287 Approval Inline Details

## Purpose

- Make pending approval/request Timeline rows actionable by showing the request summary, reason, and operation in context without requiring Thread Details for the common decision path.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/287

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/notes/codex_webui_timeline_contextual_request_and_expansion_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Render request summary/message inline on the matching Timeline approval row.
- Render `Reason` inline when request detail data is available.
- Render `Operation` inline when `operation_summary` is available.
- Keep approve/deny actions visible and text-labeled for pending approval rows.
- Keep Details as the secondary surface for audit/debug metadata and longer structured fields.
- Preserve compact fallback behavior when no contextual Timeline row can be matched.

## Exit criteria

- Pending approval rows provide enough visible information for the common approve/deny decision path.
- Inline rows show summary, reason, and operation when the public request detail payload provides them.
- `Request detail` is no longer required for ordinary approval decisions.
- Long operation text wraps or truncates without overlapping row actions.
- Resolved approval rows remain compact and do not show approve/deny actions.
- Focused frontend tests and pre-push validation pass.

## Work plan

- Inspect request row context rendering and selected request detail plumbing.
- Extend the matched pending request row rendering to include detail summary, reason, and operation.
- Preserve resolved-row compactness and fallback request behavior.
- Add or update focused tests for inline request details and resolved-row action behavior.
- Run targeted frontend validation.

## Artifacts / evidence

- Sprint evaluator: approved Issue #287 implementation.
- Pre-push validation:
  - `npm run check`: passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `node ./node_modules/vitest/vitest.mjs run tests/chat-view.test.tsx tests/chat-view-timeline.test.tsx`: passed, 2 files / 20 tests.

## Status / handoff notes

- Status: `locally complete`
- Notes: Matched pending approval rows now render request summary, reason, and operation inline in the timeline row while keeping approve/deny actions and the secondary `Request detail` affordance visible. Resolved rows remain compact and action-free.
- Completion retrospective:
  - Completion boundary: package archive, not final Issue close.
  - Contract check: package exit criteria satisfied by implementation diff, focused tests, evaluator approval, and pre-push validation evidence.
  - What worked: existing request row context made the slice small and avoided runtime/API changes.
  - Workflow problems: none requiring docs or skill updates.
  - Improvements to adopt: continue threading UI-only follow-ups through display context objects when contracts already expose the needed data.
  - Skill candidates or skill updates: none.
  - Follow-up updates: publish via PR, merge to `main`, clean up the worktree, then close Issue #287 and mark Project `Done`.

## Archive conditions

- Archive this package when the exit criteria are met, pre-push validation has passed, and handoff notes are updated with validation evidence.
