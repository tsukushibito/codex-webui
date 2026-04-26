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

- Planned validation:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - focused tests or visual inspection evidence if layout-affecting

## Status / handoff notes

- Status: `in progress`
- Active branch: `issue-221-visual-language-polish`
- Active worktree: `.worktrees/issue-221-visual-language-polish`
- Notes: Started from `origin/main` after #220 reached main. Keep #222 broad validation out of this package.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
