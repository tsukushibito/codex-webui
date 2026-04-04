# Issue 66 Phase 3C Messaging

## Purpose

- Execute the Phase 3C runtime slice for message send flow, idempotency, and message projection under Issue #66.

## Primary issue

- Issue: `#66 https://github.com/tsukushibito/codex-webui/issues/66`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `docs/specs/codex_webui_common_spec_v0_8.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Add the runtime contract needed to accept a user message while a session is `waiting_input`.
- Add app-owned user message projection and the asynchronous turn-start state transition needed before downstream assistant event ingestion.
- Add idempotency handling keyed by `client_message_id`.
- Add the tests required to prove the slice is ready for downstream assistant event, approval, and sequence work.

## Exit criteria

- Runtime exposes the internal message-send behavior required by the maintained specs.
- Duplicate `client_message_id` submissions are idempotent.
- User messages are projected with stable app-owned identifiers, and accepted sends leave assistant projection to downstream native event ingestion.
- Tests cover the main messaging state transitions and projection behavior.

## Work plan

- Review the maintained messaging contract and current runtime/session implementation boundaries.
- Implement persistence and service changes for message submission, idempotency, and projection.
- Add or extend runtime routes and tests for the messaging flow.
- Run the relevant runtime test suite and capture any follow-up risk in handoff notes.

## Artifacts / evidence

- Validation: `npm test -- --run tests/session-routes.test.ts`
- Validation: `npm test`
- Validation: `npm run build`
- Evidence: `apps/codex-runtime/tests/session-routes.test.ts`

## Status / handoff notes

- Status: `ready to archive`
- Notes: `Implemented internal GET/POST /api/v1/sessions/{session_id}/messages and POST /api/v1/sessions/{session_id}/assistant-events with SQLite-backed message projection persistence, client_message_id idempotency, stable assistant message identity across delta/completed ingestion, and the waiting_input -> running -> waiting_input turn flow. Validated with npm test -- --run tests/session-routes.test.ts and npm run build. Retrospective: bounded planner/worker/evaluator slices converged on the runtime work, but worker design-only/no-op returns delayed execution; sprint-cycle guidance was tightened on main in commit 4c9dc24 so implementation-requested sprints treat those returns as incomplete rather than complete. Remaining follow-up is package archive, PR/merge/completion tracking for #66, then resuming parent issue #60 through #67/#68/#69.`

## Archive conditions

- Archive this package when the messaging slice exit criteria are met, the handoff notes are updated, and the package is ready to move under `tasks/archive/issue-66-phase-3c-messaging/`.
