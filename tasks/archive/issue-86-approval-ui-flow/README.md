# Phase 4B-3 Approval UI Flow

## Purpose

- Execute Issue #86 by implementing the smartphone-focused Approval screen and approval action flow for Phase 4B.

## Primary issue

- Issue: `#86` https://github.com/tsukushibito/codex-webui/issues/86

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md` section 9.3
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md` sections 6.3 and 8
- `docs/specs/codex_webui_public_api_v0_8.md` sections 5.3, 9.3, and 12.3
- `apps/frontend-bff/README.md`

## Scope for this package

- Replace the placeholder `/approvals` route in `apps/frontend-bff` with the first real smartphone-focused Approval screen.
- Render pending approval list and approval detail views from the documented public API.
- Implement approve / deny flows and refresh behavior around the approval stream.
- Reflect stop-origin `canceled_approval` updates in Approval and Chat-facing UI state where this slice owns the behavior.
- Keep the Approval layout usable at 360px width without horizontal scrolling.

## Exit criteria

- Approval list and detail render from the documented public API.
- Approve / deny actions update local UI state correctly.
- Stop-triggered approval cancellation is reflected correctly.
- Approval actions remain reachable within the documented smartphone interaction constraints.
- Validation evidence is recorded here before archive.

## Work plan

- Audit the merged Home and Chat shells to define the smallest Approval-focused UI slice.
- Implement approval data access, list/detail state, and action handling in `apps/frontend-bff`.
- Add focused tests for Approval data/render/action behavior.
- Record validation results and any final Phase 4B handoff notes in this README.

## Artifacts / evidence

- Validation passed: `npm test` in `apps/frontend-bff`
- Validation passed: `npm run build` in `apps/frontend-bff`
- Approval stream note: the Approval screen refreshes queue/detail state from `/api/v1/approvals/stream` on requested/resolved events and after stream error recovery
- Responsive/manual verification note: Approval reuses the single-column shell up to 720px with wrapping action rows, a scrollable queue column, and no fixed-width controls in the new slice

## Status / handoff notes

- Status: `locally complete and ready to archive`
- Notes: `Replaced the /approvals placeholder with a real Approval queue/detail/action UI, plus dedicated approval data helpers and focused tests.`
- Validation: `npm test` passed with 19 tests across route, Home, Chat, and Approval coverage.
- Validation: `npm run build` passed and generated the dynamic /approvals route.
- Follow-up constraint: 360px usability is evidenced here by the implemented layout rules and existing single-column shell rather than an in-browser viewport harness.
- Retrospective: Reusing the merged Home/Chat shell kept the Approval slice bounded and avoided unnecessary styling churn.
- Retrospective: Worktree-local `node_modules` had drifted and required a local `npm install` repair before validations passed; no repo-tracked process change adopted from this slice yet.

## Archive conditions

- Archive this package when the exit criteria are met, validation evidence is recorded, and the handoff notes are updated for merge/completion tracking.
