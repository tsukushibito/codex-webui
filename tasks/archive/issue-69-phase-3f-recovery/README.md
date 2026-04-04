# Issue 69 Phase 3F Recovery

## Purpose

- Execute the Phase 3F runtime slice for recovery, reconciliation, and partial-failure handling under Issue #69.

## Primary issue

- Issue: `#69 https://github.com/tsukushibito/codex-webui/issues/69`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `docs/specs/codex_webui_common_spec_v0_8.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Add the minimum runtime recovery state and reconciliation paths needed to converge app-owned session, approval, and event projection after partial failure.
- Add the detection and replay logic needed to rebuild recoverable projection from persisted runtime/native facts available in this slice.
- Add tests that prove the main MVP recovery cases converge to the maintained runtime contract.

## Exit criteria

- Runtime can mark recoverable inconsistencies as pending recovery and reconcile them back to maintained session and approval state.
- Recovery behavior matches the maintained reconstruction rules for the main partial-failure cases covered by MVP.
- Tests cover the targeted recovery and reconciliation flows for this slice.

## Work plan

- Review the maintained recovery and reconstruction rules plus current runtime persistence/event boundaries.
- Implement the smallest recovery state and reconciliation paths that materially advance Issue #69.
- Add or extend runtime tests for the targeted recovery cases and rerun the runtime validation suite.

## Artifacts / evidence

- Validation: `npm test -- --run tests/session-routes.test.ts`
- Validation: `npm test -- --run tests/workspace-routes.test.ts`
- Validation: `npm test`
- Validation: `npm run build`
- Evidence: `apps/codex-runtime/tests/session-routes.test.ts`
- Evidence: `apps/codex-runtime/tests/workspace-routes.test.ts`

## Status / handoff notes

- Status: `completed locally`
- Notes: `Sprint 1 added recovery_pending detection and POST /api/v1/sessions/{session_id}/reconcile for waiting_approval approval-link mismatches, including repair of stale active_approval_id and pending approval relink. Sprint 2 added POST /api/v1/workspaces/{workspace_id}/reconcile plus workspace-level active_session_id and pending_approval_count recomputation, and surfaced workspace active-session drift as recovery_pending on affected session reads. Local validation passed with npm test -- --run tests/session-routes.test.ts, npm test -- --run tests/workspace-routes.test.ts, npm test, and npm run build.`

### Completion retrospective

- Completion boundary: `Issue #69 package reached local completion and is ready for PR / merge / cleanup tracking.`
- What worked: `Cutting recovery into approval-link repair first and workspace drift repair second kept the scope testable with the current synthetic gateway and existing route surface.`
- Workflow problems: `The first worker pass returned a no-op status despite a concrete writable slice, and subagent result collection again needed interrupt-driven follow-up.`
- Improvements to adopt: `For recovery work, pin the mismatch family, reconcile route, and expected read-path signal in the worker prompt so the first write pass is concrete enough to avoid analysis-only drift.`
- Skill candidates or skill updates: `None. The current sprint-cycle hardening already covers the no-op worker failure mode that recurred here.`
- Follow-up updates: `Create PR, merge to main, sync parent checkout, remove the worktree, then close Issue #69 and parent Issue #60 and update Project status.`

## Archive conditions

- Archive this package when the recovery slice exit criteria are met and the handoff notes are updated.
