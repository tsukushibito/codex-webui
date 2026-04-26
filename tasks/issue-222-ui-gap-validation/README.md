# Issue 222 UI Gap Validation

## Purpose

- Execute Issue #222 by adding reproducible validation coverage for the current UI gap follow-up states.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/222

## Source docs

- `docs/notes/codex_webui_current_ui_gap_analysis_note_v0_1.md`
- `docs/validation/codex_webui_ux_renewal_validation_gates_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Add or update reproducible desktop/mobile validation for the gap-analysis follow-up line after #215-221.
- Cover high-impact states such as first input, selected idle completed response, running/streaming response, pending approval with detail, post-approval resolution, contextual detail, scroll anchoring, and mobile composer reachability where feasible.
- Prefer focused Playwright or existing test helper coverage over broad manual-only evidence.

## Exit criteria

- The gap-analysis follow-up has reproducible desktop and mobile validation evidence.
- Validation covers the high-impact states listed in the maintained note.
- Focused frontend validation passes, including the new or updated validation coverage.

## Work plan

- Inspect existing e2e specs, visual evidence, and validation docs for coverage gaps.
- Add one bounded validation slice for the most valuable missing states.
- Run focused validation plus app-level checks before pre-push validation.

## Artifacts / evidence

- Sprint validation:
  - `npm run check`: passed
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed
  - `npm run test:e2e -- e2e/issue-222-approval-resolution-followup.spec.ts --project=desktop-chromium --reporter=line`: passed, 2 tests
  - `npm run test:e2e -- e2e/issue-222-approval-resolution-followup.spec.ts --project=mobile-chromium --reporter=line`: passed, 2 tests
- New validation coverage:
  - `apps/frontend-bff/e2e/issue-222-approval-resolution-followup.spec.ts`
- Sprint evaluator: approved

## Status / handoff notes

- Status: `locally complete pending pre-push validation`
- Active branch: `issue-222-ui-gap-validation`
- Active worktree: `.worktrees/issue-222-ui-gap-validation`
- Notes: Added desktop/mobile Playwright validation for the post-approval follow-up state after actual approve/deny interactions. The spec verifies latest resolved request visibility, stale pending controls removal, restored composer sendability, request-detail access without response actions, timeline resolution evidence, and mobile reachability without horizontal overflow. This is the final child issue before #214 can be considered for closure.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
