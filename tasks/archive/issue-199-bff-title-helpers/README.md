# Issue #199 BFF Title Helpers

## Purpose

- Expose the minimum public BFF title and helper fields needed by the UX refresh without inventing a new canonical resource model.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/199

## Source docs

- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/notes/codex_webui_ux_refresh_execution_order_synthesis_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Align `frontend-bff` public thread, thread-list, and thread-view shaping with the maintained `title` contract.
- Expose the minimum helper material needed for Navigation row summaries and request/detail affordances.
- Keep request/detail shaping aligned with the maintained P0 minimum confirmation information.
- Preserve recovery-safe handling for pending and just-resolved request detail reachability.

## Exit criteria

- Public BFF thread shapes expose `title` consistently for thread list rows and thread header data.
- Public BFF thread-list behavior is aligned with the maintained `recommended` default sort contract where this slice touches it.
- Request helper mapping still exposes P0 confirmation fields and just-resolved reachability material without requiring richer file/diff detail.
- Targeted `frontend-bff` validation passes.

## Work plan

- Inspect current `frontend-bff` runtime/public types, mapping functions, handlers, and tests.
- Patch the smallest BFF surface needed for Issue #199.
- Add or update focused tests for title/helper shaping and recommended sort behavior.
- Run targeted app validation from `apps/frontend-bff`.
- Record evidence and handoff notes before pre-push validation.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-25T05-41-06Z-issues-198-205/events.ndjson`
- Sprint validation evidence from `apps/frontend-bff`:
  - `npm run check`: passed, Biome checked 72 files with no fixes.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `npm test -- tests/routes.test.ts tests/chat-data.test.ts`: passed, 2 files / 23 tests.
  - `npm test`: passed, 11 files / 68 tests.
- Sprint evaluator: approved.
- Dedicated pre-push validation: passed with the same command set.

## Status / handoff notes

- Status: `locally complete; archived before PR follow-through`
- Active branch: `issue-199-bff-title-helpers`
- Active worktree: `.worktrees/issue-199-bff-title-helpers`
- Notes: `PublicThread.title` now flows through the shared BFF mapper for thread list rows, thread snapshots, thread view payloads, accepted-input results, interrupt results, and request-response thread payloads. Home workspace thread fan-out and chat workspace-thread discovery now request `sort=recommended` instead of `sort=-updated_at`.
- Validation: `npm run check`; `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`; `npm test -- tests/routes.test.ts tests/chat-data.test.ts`; `npm test`.
- Completion retrospective: package archive boundary only. Contract checks are satisfied for the local #199 slice by mapper/type changes, recommended-sort callsite updates, unchanged request-helper scope, evaluator approval, and pre-push validation. The earlier handoff stalled on mechanical typed fixtures after `PublicThread.title` became required; closing completed subagents promptly and rerunning the gate kept the recovery bounded. No repo skill or maintained docs update is needed from this slice.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
