# Issue 221 Visual Language Polish

## Purpose

- Execute Issue #221 by refining the UI visual language after the hierarchy, timeline, detail, and mobile reachability fixes have landed.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/221

## Source docs

- `docs/notes/codex_webui_current_ui_gap_analysis_note_v0_1.md`
- `docs/notes/codex_webui_target_ui_design_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Reduce beige/brown-orange dominance and oversized rounded pill usage.
- Reserve colors for operational meaning: approval/high-priority, destructive/error, success/approve, and primary identity/action.
- Foreground coding artifacts such as commands, file paths, tests, diffs, and request IDs with a more precise treatment.
- Preserve the thread-first app-shell structure from #215-220 and leave broader regression validation to #222.

## Exit criteria

- The browser reads as a precise coding assistant rather than a soft dashboard or form prototype.
- Operational state colors are distinguishable and not consumed by general decoration.
- Visual hierarchy remains intact on desktop and mobile after polish.
- Focused frontend validation passes for changed visual/UI behavior.

## Work plan

- Inspect current CSS palette, radii, state color use, and artifact/detail styling.
- Implement one bounded visual-language polish slice in existing CSS/component patterns.
- Add or update focused tests only where the polish changes rendered structure or labels.
- Run targeted frontend validation.

## Artifacts / evidence

- Sprint validation:
  - `npm run check`: passed
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed
  - `npm test -- tests/chat-view.test.tsx tests/timeline-display-model.test.ts`: passed, 30 tests
  - `npm run test:e2e -- e2e/approval-flow.spec.ts e2e/issue-220-mobile-thread-density.spec.ts`: passed, 6 tests
- Visual inspection evidence:
  - `artifacts/visual-inspection/issue-221-visual-language-polish/desktop-selected-thread-detail.png`
  - `artifacts/visual-inspection/issue-221-visual-language-polish/mobile-selected-pending-approval.png`
  - `artifacts/visual-inspection/issue-221-visual-language-polish/inspection-summary.json`
  - `artifacts/visual-inspection/issue-221-visual-language-polish/mobile-selected-pending-approval-summary.json`
- Sprint evaluator: approved after pending-approval status color was corrected from success to warning

## Status / handoff notes

- Status: `locally complete pending pre-push validation`
- Active branch: `issue-221-visual-language-polish`
- Active worktree: `.worktrees/issue-221-visual-language-polish`
- Notes: Implemented a CSS-dominant visual-language polish pass that shifts the shell toward teal/neutral identity, reserves orange/green/red for operational state, reduces neutral pill styling, and improves coding-artifact treatment. Mobile remains visually dense near the lower viewport, but inspection evidence reports no horizontal scroll or overflowing labels, and approval controls remain visible. Keep #222 broad validation out of this package.
- Completion retrospective:
  - Completion boundary: package archive after local completion, evaluator approval, visual evidence capture, and pre-push validation.
  - Contract check: Issue #221 acceptance criteria are satisfied locally; Issue close still requires PR merge to `main`, parent checkout sync, worktree cleanup, and GitHub tracking update.
  - What worked: visual evidence plus evaluator review caught the approval-state color semantics before publish.
  - Workflow problems: one evaluator rejection was required because pending approval used success styling; fixed within the same sprint without widening scope.
  - Improvements to adopt: visual polish slices should explicitly inspect state color semantics in screenshots, not just palette tokens.
  - Skill candidates or skill updates: none required.
  - Follow-up updates: none required before archive; #222 remains the broader validation slice.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
