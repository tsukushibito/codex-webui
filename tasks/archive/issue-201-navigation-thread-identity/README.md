# Issue #201 Navigation Thread Identity

## Purpose

- Refresh Navigation and thread identity so users can discover, resume, and prioritize work without relying on Home or raw IDs.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/201

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `.tmp/codex_webui_v0_9_ux_improvement_plan.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Redesign thread rows around title, current activity summary, updated time, and badges within the existing Navigation component.
- Keep workspace switching visible but secondary to current-workspace thread discovery.
- Avoid raw thread IDs as the dominant thread-list label.

## Exit criteria

- Navigation is the primary return and discovery surface for the refreshed UX.
- Raw thread IDs are no longer the dominant thread-list label.
- Approval, error, failed, active, and recent signals remain distinguishable from the list.
- Targeted frontend-bff validation passes.

## Work plan

- Inspect Navigation rendering and tests.
- Patch thread row markup/copy with the smallest UI change.
- Add or update tests for title-first thread identity and signal visibility.
- Run frontend-bff validation and record evidence.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-25T05-41-06Z-issues-198-205/events.ndjson`
- Validation:
  - `git diff --check`: passed.
  - `npm run check`: passed, Biome checked 72 files with no fixes.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `npm test -- tests/chat-view.test.tsx`: passed, 1 file / 6 tests.
  - `npm test`: passed, 11 files / 69 tests.
- Sprint evaluator: approved.
- Dedicated pre-push validation: passed.

## Status / handoff notes

- Status: `locally complete; archived before PR follow-through`
- Active branch: `issue-201-navigation-thread-identity`
- Active worktree: `.worktrees/issue-201-navigation-thread-identity`
- Notes: Navigation thread rows now use `thread.title` as the primary row identity and demote raw thread IDs to supporting `Thread ref` metadata while preserving attention, active, recent, blocked, resume, and updated signals.
- Completion retrospective: package archive boundary only. Contract checks are satisfied for the local #201 slice by title-first Navigation row rendering, retained priority/cue signals, evaluator approval, and pre-push validation. No durable workflow or skill update is needed from this slice.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
