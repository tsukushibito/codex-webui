# Issue #205 Mobile Responsive Polish

## Purpose

- Align the mobile and responsive thread-first UI with the tracked target mobile reference.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/205

## Source docs

- `artifacts/visual-inspection/2026-04-24T23-29-37Z-spec-ideal-ui/codex-webui-spec-ideal-screen.png`
- `docs/notes/codex_webui_target_ui_design_note_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Tune mobile header density, thread context metrics, timeline rows, request/detail reachability, and composer sizing.
- Preserve the thread-first information architecture from the v0.9 layout spec.
- Ensure the 360 CSS px mobile viewport has no horizontal scroll, overlapping labels, or button text overflow.

## Exit criteria

- Mobile at 360 CSS px has no horizontal scroll and no overlapping text or controls.
- Pending approval remains visible and actionable without leaving thread context.
- Timeline, composer, and detail affordances visually match the target hierarchy.
- Visual inspection evidence is captured under `artifacts/visual-inspection/`.

## Work plan

- Capture mobile before evidence from the current main baseline.
- Apply scoped mobile CSS polish in `frontend-bff`.
- Capture mobile after evidence for normal thread and approval/detail states.
- Run frontend-bff validation and record evidence.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-25T05-41-06Z-issues-198-205/events.ndjson`
- Target reference: `artifacts/visual-inspection/2026-04-24T23-29-37Z-spec-ideal-ui/codex-webui-spec-ideal-screen.png`
- Before mobile approval capture: `artifacts/visual-inspection/2026-04-25T15-55-00Z-issue-205-before/mobile-approval-thread.png`
- Before mobile request detail capture: `artifacts/visual-inspection/2026-04-25T15-55-00Z-issue-205-before/mobile-request-detail.png`
- After mobile approval capture: `artifacts/visual-inspection/2026-04-25T16-08-00Z-issue-205-after/mobile-approval-thread.png`
- After mobile request detail capture: `artifacts/visual-inspection/2026-04-25T16-08-00Z-issue-205-after/mobile-request-detail.png`
- After capture manifest: `artifacts/visual-inspection/2026-04-25T16-08-00Z-issue-205-after/manifest.json`
- Validation:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `npm test` (11 files / 70 tests)

## Status / handoff notes

- Status: `complete; ready to archive`
- Active branch: `issue-205-mobile-responsive-polish`
- Active worktree: `.worktrees/issue-205-mobile-responsive-polish`
- Notes:
  - Mobile approval actions now share a stable two-column layout with the detail affordance full-width below.
  - Mobile detail opens as an opaque bottom sheet with a dimmed backdrop so the preserved thread context does not visually collide with detail content.
  - Low-priority raw request context IDs are hidden in the mobile detail sheet to keep approval decision content and response actions visible at 360 CSS px.
  - After-capture manifest reports no horizontal overflow at 360 CSS px.
  - Sprint evaluator approved the slice.
  - Pre-push validator passed the frontend check, TypeScript, and full test gate.
  - Completion retrospective: mobile visual capture should hide the Next dev indicator before screenshots, otherwise it can obscure approval actions and create false layout noise.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
