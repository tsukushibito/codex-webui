# Issue 68 Phase 3E Events

## Purpose

- Execute the Phase 3E runtime slice for canonical event projection and sequence streams under Issue #68.

## Primary issue

- Issue: `#68 https://github.com/tsukushibito/codex-webui/issues/68`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `docs/specs/codex_webui_common_spec_v0_8.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Add the runtime contract needed to persist canonical session events with stable event IDs and session-scoped sequence numbers.
- Add the session and approval event projection paths needed to back the maintained internal event resources.
- Add the event list and stream-adjacent runtime surfaces required before the BFF SSE relay work in Phase 4.
- Add the tests required to prove canonical ordering and event/resource integration for this slice.

## Exit criteria

- Runtime emits canonical events with stable app-owned event IDs and session sequence ordering.
- Session and approval stream source data is available from the runtime in the maintained shape.
- Event projection stays aligned with the maintained public/internal mapping decisions.
- Tests cover event append ordering and the main runtime event-resource integrations for this slice.

## Work plan

- Review the maintained event and sequence contract and current runtime/session/approval implementation boundaries.
- Implement persistence and service changes for canonical event append and sequence numbering.
- Add or extend runtime routes and tests for session events and approval stream source data.
- Run the relevant runtime test suite and capture follow-up risk in handoff notes.

## Artifacts / evidence

- Validation: `npm test -- --run tests/session-routes.test.ts`
- Validation: `npm test`
- Validation: `npm run build`
- Evidence: `apps/codex-runtime/tests/session-routes.test.ts`

## Status / handoff notes

- Status: `completed locally`
- Notes: `Sprint 1 added canonical session event persistence, session-scoped sequence numbering, and GET /api/v1/sessions/{session_id}/events for message/user-assistant flows. Sprint 2 extended the same event log with approval.requested / approval.resolved plus matching session.status_changed transitions for approve, deny, and stop-cancel paths, then added GET /api/v1/sessions/{session_id}/stream and GET /api/v1/approvals/stream with focused route-level tests. Local validation passed with npm test -- --run tests/session-routes.test.ts, npm test, and npm run build.`

### Completion retrospective

- Completion boundary: `Issue #68 package reached local completion and is ready for PR / merge / cleanup tracking.`
- What worked: `Using bounded sprints kept the eventing slice small enough to land in two passes, and the new sprint-cycle no-op guard prevented an analysis-only worker result from being accepted as progress.`
- Workflow problems: `The intake / planner agents were slow to return and needed interrupt-driven result collection, and the second worker pass expanded into stream routes without rerunning validation until prompted.`
- Improvements to adopt: `Keep worker prompts scoped to concrete routes, tests, and validation commands, and treat any scope expansion as requiring fresh validation before evaluator review.`
- Skill candidates or skill updates: `None. The sprint-cycle worker completion hardening already captured the durable fix discovered during this work.`
- Follow-up updates: `Create PR, merge to main, sync parent checkout, remove the worktree, then close Issue #68 and update Project status.`

## Archive conditions

- Archive this package when the eventing slice exit criteria are met and the handoff notes are updated.
