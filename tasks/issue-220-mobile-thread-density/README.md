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

- Planned validation:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - focused Vitest for chat view behavior

## Status / handoff notes

- Status: `in progress`
- Active branch: `issue-220-mobile-thread-density`
- Active worktree: `.worktrees/issue-220-mobile-thread-density`
- Notes: Started from `origin/main` after #219 reached main. Keep #221 visual language and #222 broad validation out of this package.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
