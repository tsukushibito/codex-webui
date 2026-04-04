# Phase 4B-1 Home UI Shell

## Purpose

- Execute Issue #84 by establishing the smartphone-first Home screen and minimal navigation shell for the Phase 4B UI.

## Primary issue

- Issue: `#84` https://github.com/tsukushibito/codex-webui/issues/84

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md` section 9.3
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md` section 8
- `docs/specs/codex_webui_public_api_v0_8.md` sections 5.1, 9.1, and 12.1
- `apps/frontend-bff/README.md`

## Scope for this package

- Add the initial UI-rendering foundation in `apps/frontend-bff` for the smartphone-focused WebUI.
- Implement the Home screen route and layout using the documented public API.
- Render workspace list, workspace creation entry, active session summaries, and pending approval counts.
- Provide navigation entry points from Home toward the future Chat and Approval screens.
- Validate that the Home screen remains usable at 360px width without horizontal scrolling.

## Exit criteria

- The `frontend-bff` app serves the Home UI from the documented public API.
- Workspace creation and workspace selection are available from the Home screen.
- Active session summaries and pending approval counts are visible on Home.
- The Home UI remains usable at smartphone width without horizontal scrolling.
- Validation evidence is recorded here before archive.

## Work plan

- Audit the existing Next.js app surface in `apps/frontend-bff` and identify the minimum page/layout additions for UI rendering.
- Implement the Home shell, API consumption, and navigation entry points.
- Add focused validation for the Home UI behavior and responsive layout.
- Update handoff notes with validation results and any follow-up constraints for Chat / Approval slices.

## Artifacts / evidence

- Validation passed: `npm test` in `apps/frontend-bff`
- Validation passed: `npm run build` in `apps/frontend-bff`
- Responsive/manual verification note: Home uses a single-column shell with `width: min(100%, 720px)`, 12px side padding, and wrapping action rows; no fixed-width UI elements were introduced in the Home slice
- Remaining check for later slices: end-to-end smartphone interaction should still be rechecked once Chat and Approval screens replace the placeholder routes

## Status / handoff notes

- Status: `locally complete and ready to archive`
- Notes: `Added the initial App Router UI shell in apps/frontend-bff with Home, placeholder Chat/Approval routes, Home data helpers, and focused Home tests.`
- Validation: `npm test` passed with 12 tests across route and Home UI/data coverage.
- Validation: `npm run build` passed and generated the Home, Chat, and Approval app routes.
- Follow-up constraint: Placeholder routes keep navigation valid for #85 and #86 but do not implement those screens' behavior.
- Retrospective: Split-first for #62 improved execution clarity; the intake agent mutating GitHub and local state despite read-only instructions was a workflow failure and should not be repeated.
- Retrospective: The Home slice stayed bounded and reused existing public API routes without backend drift.

## Archive conditions

- Archive this package when the exit criteria are met, validation evidence is recorded, and the handoff notes are updated for merge/completion tracking.
