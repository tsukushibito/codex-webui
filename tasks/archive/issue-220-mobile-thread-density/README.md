# Issue 220 Mobile Thread Density

## Purpose

- Execute Issue #220 by improving mobile selected-thread density and bottom reachability at 360 CSS px.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/220

## Source docs

- `docs/notes/codex_webui_current_ui_gap_analysis_note_v0_1.md`
- `docs/notes/codex_webui_target_ui_design_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Reduce mobile typographic, badge, chip, and button footprint in selected-thread context.
- Keep approval summary, timeline, composer, Threads, and Details reachable without losing thread context.
- Improve bottom reachability for composer and thread/detail affordances.
- Preserve contextual detail behavior from #219 and leave broader visual-language polish to #221.

## Exit criteria

- Mobile selected-thread view shows more useful context per viewport at 360 CSS px.
- Composer and approval actions remain reachable without scrolling through low-value timeline rows.
- Mobile has no horizontal scroll, overlapping controls, or button text overflow in target states.
- Focused frontend validation passes for mobile layout and existing chat behavior.

## Work plan

- Inspect mobile CSS breakpoints and `chat-view.tsx` thread/detail controls.
- Implement one bounded mobile density/reachability slice using existing UI structure.
- Add or update focused tests for mobile affordance labels and layout-safe class behavior where feasible.
- Run targeted frontend validation.

## Artifacts / evidence

- Sprint validation:
  - `npm run check`: passed
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed
  - `node ./node_modules/vitest/vitest.mjs run tests/chat-view.test.tsx`: passed, 12 tests
  - `node ./node_modules/@playwright/test/cli.js test e2e/issue-220-mobile-thread-density.spec.ts --project=mobile-chromium`: passed, 1 test
- Sprint evaluator: approved

## Status / handoff notes

- Status: `locally complete pending pre-push validation`
- Active branch: `issue-220-mobile-thread-density`
- Active worktree: `.worktrees/issue-220-mobile-thread-density`
- Notes: Implemented mobile-only selected-thread density changes, sticky pending approval reachability, bottom Threads/Details affordances, and focused 360x780 Playwright coverage. Keep #221 visual language and #222 broad validation out of this package.
- Completion retrospective:
  - Completion boundary: package archive after local completion, evaluator approval, and pre-push validation.
  - Contract check: Issue #220 acceptance criteria are satisfied locally; Issue close still requires PR merge to `main`, parent checkout sync, worktree cleanup, and GitHub tracking update.
  - What worked: the focused Playwright spec directly exercised the 360x780 mobile state and caught layout/reachability acceptance criteria in one place.
  - Workflow problems: evaluator first returned a nonstandard output shape; strict retry produced the required gate shape without code changes.
  - Improvements to adopt: mobile layout slices should include viewport metrics for horizontal scroll, document scroll, visible composer, and reachable critical actions.
  - Skill candidates or skill updates: none required.
  - Follow-up updates: none required before archive; publish-oriented GitHub handoff remains required.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
