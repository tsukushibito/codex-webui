# Issue 67 Phase 3D Approval

## Purpose

- Execute the Phase 3D runtime slice for approval lifecycle, stop handling, and approval projection under Issue #67.

## Primary issue

- Issue: `#67 https://github.com/tsukushibito/codex-webui/issues/67`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `docs/specs/codex_webui_common_spec_v0_8.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Add the runtime contract needed to detect and project pending approvals for an active session turn.
- Add approval resolution handling for approve, deny, and cancel flows, including `active_approval_id` updates.
- Add the stop behavior needed when approval is pending so cancellation is distinguishable from a normal stop.
- Add the tests required to prove the approval slice is ready for downstream event, recovery, and BFF work.

## Exit criteria

- Runtime can project pending approvals with stable app-owned identifiers.
- Approve, deny, and cancel flows behave according to the maintained specs.
- Approval state stays consistent with stop behavior and session-status transitions.
- Tests cover the main approval lifecycle and stop interactions for this slice.

## Work plan

- Review the maintained approval contract and current runtime/session implementation boundaries.
- Implement persistence and service changes for approval detection, projection, and resolution.
- Add or extend runtime routes and tests for the approval flow.
- Run the relevant runtime test suite and capture follow-up risk in handoff notes.

## Artifacts / evidence

- Validation: `npm install`
- Validation: `npm test -- --run tests/session-routes.test.ts`
- Validation: `npm run build`
- Evidence: `apps/codex-runtime/tests/session-routes.test.ts`

## Status / handoff notes

- Status: `ready to archive`
- Notes: `Implemented route-based approval request ingestion, approval list/detail/summary projection, approval resolution for approved/denied, and stop-time cancellation for pending approvals. Session and workspace state now cover running -> waiting_approval -> running/waiting_input/stopped with active_approval_id and pending_approval_count kept in sync. Validated with npm install, npm test -- --run tests/session-routes.test.ts, and npm run build. Retrospective: carrying the package/worktree workflow forward immediately after #66 kept tracking aligned, while the local environment hit subagent thread limits during sprint execution, so the bounded approval slices were finished locally instead of through delegated planner/evaluator passes. Remaining follow-up is package archive, PR/merge/completion tracking for #67, then resuming parent issue #60 through #68 and #69.`

## Archive conditions

- Archive this package when the approval slice exit criteria are met and the handoff notes are updated.
