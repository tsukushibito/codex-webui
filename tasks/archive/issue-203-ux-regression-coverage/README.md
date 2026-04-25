# Issue #203 UX Regression Coverage

## Purpose

- Add regression coverage for the reviewed UX refresh so remaining work is judged by behavior rather than visual intent alone.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/203

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `.tmp/codex_webui_v0_9_ux_improvement_plan.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Add focused regression tests for opening/recovery, request detail, background priority, and mobile-critical no-horizontal-scroll affordances where existing test infrastructure supports them.
- Verify no Home dependency, no global approval inbox dependency, no per-delta assistant cards, and no detail auto-open behavior.
- Keep this as validation coverage only; do not redesign UI in this package.

## Exit criteria

- The UX refresh has reproducible regression coverage for the core desktop and mobile-critical states reachable in component/client tests.
- Validation explicitly covers opening/recovery and request/detail behavior.
- Targeted frontend-bff validation passes.

## Work plan

- Inspect existing ChatView/ChatPageClient/timeline tests.
- Add the smallest regression assertions that cover the issue acceptance criteria.
- Run frontend-bff validation and record evidence.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-25T05-41-06Z-issues-198-205/events.ndjson`
- Validation:
  - `git diff --check`: passed.
  - `npm run check`: passed, Biome checked 72 files with no fixes.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `npm test -- tests/chat-page-client.test.tsx`: passed.
  - `npm test`: passed, 11 files / 70 tests.
- Sprint evaluator: approved.
- Dedicated pre-push validation: passed.

## Status / handoff notes

- Status: `locally complete; archived before PR follow-through`
- Active branch: `issue-203-ux-regression-coverage`
- Active worktree: `.worktrees/issue-203-ux-regression-coverage`
- Notes: Added regression assertions for request/detail behavior from thread context, no Home or global approval inbox dependency, opening recovery remaining inside Thread View without auto-opened detail, and background high-priority notice remaining selection-driven with request actions reachable after opening the target thread.
- Completion retrospective: package archive boundary only. Contract checks are satisfied for the local #203 slice by added ChatPageClient regression coverage, evaluator approval, and pre-push validation. Mobile coverage is component-level; viewport/visual evidence remains for #204/#205 polish slices.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
