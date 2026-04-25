# Issue #204 Desktop Shell Polish

## Purpose

- Align the desktop browser shell with the tracked target UI reference after semantic UX slices have landed.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/204

## Source docs

- `artifacts/visual-inspection/2026-04-24T23-29-37Z-spec-ideal-ui/codex-webui-spec-ideal-screen.png`
- `docs/notes/codex_webui_target_ui_design_note_v0_1.md`
- `.tmp/codex_webui_v0_9_ux_improvement_plan.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Tune desktop app-shell proportions, panel borders, density, shadows, and background treatment.
- Align Navigation, Thread View, request cards, timeline rows, composer, and Detail Surface visual hierarchy with the target reference.
- Keep changes inside the maintained v0.9 information architecture.

## Exit criteria

- Desktop shell reads as one cohesive app shell rather than separated dashboard cards.
- Navigation, Thread View, and Detail Surface hierarchy is closer to the target reference.
- Raw IDs and raw event labels are not visually dominant.
- Visual inspection evidence is captured under `artifacts/visual-inspection/`.

## Work plan

- Inspect target image and current CSS.
- Apply scoped desktop polish in `frontend-bff` styles.
- Capture desktop visual evidence.
- Run frontend-bff validation and record evidence.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-25T05-41-06Z-issues-198-205/events.ndjson`
- Target reference: `artifacts/visual-inspection/2026-04-24T23-29-37Z-spec-ideal-ui/codex-webui-spec-ideal-screen.png`
- Before desktop capture: `artifacts/visual-inspection/2026-04-25T15-10-00Z-issue-204-before/desktop-chromium-chat-workspace.png`
- After desktop capture: `artifacts/visual-inspection/2026-04-25T15-27-00Z-issue-204-after/desktop-chromium-chat-workspace.png`
- After desktop Detail Surface capture: `artifacts/visual-inspection/2026-04-25T15-38-22Z-issue-204-after-detail/desktop-chromium-chat-detail.png`
- After mobile spot-check: `artifacts/visual-inspection/2026-04-25T15-27-00Z-issue-204-after/mobile-chromium-chat-workspace.png`
- Validation:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `npm test` (11 files / 70 tests)

## Status / handoff notes

- Status: `complete; ready to archive after pre-push validation`
- Active branch: `issue-204-desktop-shell-polish`
- Active worktree: `.worktrees/issue-204-desktop-shell-polish`
- Notes:
  - Desktop CSS now presents Navigation, Thread View, and Detail Surface as one contiguous app shell with pane dividers, tighter density, and reduced card separation.
  - Workspace IDs were demoted from primary desktop chrome in favor of workspace names and a generic active-scope label.
  - Mobile was spot-checked after the desktop media-query changes to confirm the mobile surface remains intact; detailed mobile polish remains scoped to Issue #205.
  - Sprint evaluator approved the slice after the Detail Surface evidence was added.
  - Completion retrospective: the first evaluation correctly caught a weak visual-evidence state; future desktop-shell polish should capture the three-pane Detail Surface state before requesting evaluation.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
