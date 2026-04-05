# Issue 91 Contract Validation

## Purpose

- Execute the Phase 5 contract-validation slice for `#91` and capture any blocking contract mismatches against the maintained MVP API/docs.

## Primary issue

- Issue: `#91 https://github.com/tsukushibito/codex-webui/issues/91`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_public_api_v0_8.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md`

## Scope for this package

- Validate MVP-target contract behavior for session lifecycle, messaging, approvals, idempotency, and documented error handling.
- Record concrete reproduction notes for blocking mismatches found during validation.
- Open or link follow-up bugfix issues when the implementation diverges from the maintained contract.
- Feed a concise validation summary back into parent Phase 5 tracking after the slice is executed.

## Exit criteria

- Contract checks for the MVP-target endpoints have been executed against the current implementation.
- Blocking findings are enumerated with reproduction notes and linked follow-up issues where needed.
- The package notes identify what remains for `#63` after this validation slice.

## Work plan

- Review the maintained public/internal API contract and extract the MVP endpoint matrix to validate.
- Exercise the implementation through the documented session, message, approval, idempotency, and error paths.
- Record findings, then create or link any required follow-up issues for blocking mismatches.
- Summarize the validation outcome and update issue tracking for the next Phase 5 slice.

## Artifacts / evidence

- Validation slice executed: `session create/start/get/list/stop` plus post-start message gating.
- Specs reviewed:
  - `docs/specs/codex_webui_public_api_v0_8.md:688-695`
  - `docs/specs/codex_webui_public_api_v0_8.md:895-930`
  - `docs/requirements/codex_webui_mvp_requirements_v0_8.md:303-319`
- Runtime implementation reviewed:
  - `apps/codex-runtime/src/domain/sessions/session-service.ts:501-565`
  - `apps/codex-runtime/src/domain/sessions/session-service.ts:1125-1137`
  - `apps/codex-runtime/tests/session-routes.test.ts:471-516`
- Runtime validation run:
  - `cd apps/codex-runtime && npm test -- --run tests/session-routes.test.ts -t 'starts and stops sessions while enforcing one active session per workspace|accepts a message, keeps the session running, and lists projected user history'`
  - Inline `buildApp()` reproduction confirmed: `POST /sessions/{id}/start` returns `status: running`, and the next `POST /sessions/{id}/messages` returns `409 session_invalid_state` with `details.current_status: running`.
- Current findings:
  - `F-001` Blocking contract mismatch: the maintained public contract allows `start` to converge to `waiting_input` after initial processing so the session can accept normal messages, but the current runtime keeps the session in `running` and rejects the next message. Follow-up fix is tracked in `#90`.
  - `F-002` Validation drift: existing runtime coverage currently locks in `start -> running` and does not assert the required post-start convergence to `waiting_input`, so the mismatch can pass test coverage unchanged.
- Validation slice executed: approval resolve, idempotent resend, and representative public approval mapping.
- Additional runtime validation run:
  - `cd apps/codex-runtime && npm test -- --run tests/session-routes.test.ts -t 'resolves approvals with approved and keeps the session running|resolves approvals with denied and returns the session to waiting_input|returns idempotent success for the same approval resolution and rejects later changes|returns the existing projected user message for idempotent retries|rejects conflicting idempotent user message retries'`
- Additional BFF validation run:
  - `cd apps/frontend-bff && npm test -- --run tests/routes.test.ts -t 'maps approval detail and approval action responses to public fields'`
- Additional findings:
  - No new blocking contract mismatches were observed in the approval resolve, idempotency replay, or public approval mapping paths exercised in this slice.

## Status / handoff notes

- Status: `ready to archive`
- Notes: `Completion retrospective: package archive boundary reached for the contract-validation slice. Contract check: package-level exit criteria satisfied by recorded session/message/approval/idempotency evidence, with blocking mismatches captured as F-001/F-002 and follow-up issue #90. What worked: focused runtime/BFF test targeting made it quick to separate confirmed blocker paths from paths that already match the maintained contract. Workflow problems: the delegated planner/intake agents mutated tracking/docs despite read-only instructions, so the main agent had to absorb those changes as effective worker output. Improvements to adopt: keep using narrow validation slices under #91 before switching current target, and treat read-only subagent writes as explicit fallback rather than re-running the same slice. Skill candidates: strengthen repo skill prompts/guardrails around read-only subagents. Follow-up: archive this package, keep #91 open until its tracking updates are on main, then switch current execution target to #90.`

## Archive conditions

- Archive this package when the contract-validation exit criteria are met, the handoff notes are updated, and the active slice is ready to move to `tasks/archive/`.
