# Issue #200 Timeline Thread View

## Purpose

- Refresh timeline rendering and opening/recovery states so the browser reads as a user-facing thread chronology rather than a raw event viewer.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/200

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `.tmp/codex_webui_v0_9_ux_improvement_plan.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Merge assistant deltas into stable visible assistant messages where the existing display model has enough information.
- Remove raw event labels and raw IDs from primary timeline presentation.
- Treat not-loaded, opening, retry, and temporary unavailable states inside `thread_view`.
- Keep recovery and background-priority behavior selection-driven rather than auto-opening detail.
- Align current activity copy with user-facing work summaries and recovery actions.

## Exit criteria

- Timeline reads as thread chronology rather than raw event log.
- Opening and recovery states stay in `thread_view` and do not become standalone primary screens.
- Assistant streaming converges without duplicate or per-delta card rendering.
- Targeted frontend-bff validation passes.

## Work plan

- Inspect `chat-view`, timeline display model, tests, and UI layout spec.
- Patch the smallest UI/model surface needed for Issue #200.
- Add or update focused tests for timeline grouping and opening/recovery display behavior.
- Run frontend-bff validation and record evidence.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-25T05-41-06Z-issues-198-205/events.ndjson`
- Sprint and pre-push validation from `apps/frontend-bff`:
  - `git diff --check`: passed in the pre-push gate.
  - `npm run check`: passed, Biome checked 72 files with no fixes.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `npm test -- tests/timeline-display-model.test.ts tests/chat-view.test.tsx`: passed, 2 files / 12 tests.
  - `npm test`: passed, 11 files / 69 tests.
- Sprint evaluator: approved.
- Dedicated pre-push validation: passed.

## Status / handoff notes

- Status: `locally complete; archived before PR follow-through`
- Active branch: `issue-200-timeline-thread-view`
- Active worktree: `.worktrees/issue-200-timeline-thread-view`
- Notes: Timeline display rows now use user-facing labels instead of raw event or item kind labels. Assistant streaming merge/completion/REST convergence behavior remains covered. Selected-thread opening/loading copy stays inside Thread View and describes restoring timeline context rather than exposing internal recovery states.
- Completion retrospective: package archive boundary only. Contract checks are satisfied for the local #200 slice by user-facing timeline labels, preserved assistant convergence tests, opening-state copy inside Thread View, evaluator approval, and pre-push validation. No durable workflow or skill update is needed from this slice.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
