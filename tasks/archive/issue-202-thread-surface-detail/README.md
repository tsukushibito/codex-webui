# Issue #202 Thread Surface Detail

## Purpose

- Strengthen the main thread surface so current activity, request summary, detail inspection, and composer priority work coherently in thread context.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/202

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `.tmp/codex_webui_v0_9_ux_improvement_plan.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Redesign the thread header around selected-thread title and workspace context.
- Rework current activity copy into user-facing summaries.
- Strengthen pending-request and resolved-request cards using guaranteed minimum confirmation information.
- Keep detail surface selection-driven for request and timeline detail.

## Exit criteria

- The selected thread is the main subject of the center pane.
- Approval can be noticed, inspected, and answered from thread context.
- Detail surface remains useful for inspection without becoming the only place where important states are discoverable.
- Targeted frontend-bff validation passes.

## Work plan

- Inspect ChatView thread header, current activity, request cards, and tests.
- Patch the smallest UI surface needed for Issue #202.
- Add or update focused tests for selected-thread title, user-facing activity, and request card/detail affordances.
- Run frontend-bff validation and record evidence.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-25T05-41-06Z-issues-198-205/events.ndjson`
- Validation:
  - `git diff --check`: passed.
  - `npm run check`: passed, Biome checked 72 files with no fixes.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `npm test -- tests/chat-view.test.tsx tests/chat-page-client.test.tsx`: passed, 2 files / 20 tests.
  - `npm test`: passed, 11 files / 69 tests.
- Sprint evaluator: approved.
- Dedicated pre-push validation: passed.

## Status / handoff notes

- Status: `locally complete; archived before PR follow-through`
- Active branch: `issue-202-thread-surface-detail`
- Active worktree: `.worktrees/issue-202-thread-surface-detail`
- Notes: Thread View now uses the selected thread title as the center-pane subject, keeps workspace/update context visible, maps current activity into user-facing recovery/action summaries, and surfaces request operation summary on the pending request card when request detail is available. Request detail remains selection-driven.
- Completion retrospective: package archive boundary only. Contract checks are satisfied for the local #202 slice by title-centered header, activity summaries, strengthened request card, unchanged selection-driven detail behavior, evaluator approval, and pre-push validation. No durable workflow or skill update is needed from this slice.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
