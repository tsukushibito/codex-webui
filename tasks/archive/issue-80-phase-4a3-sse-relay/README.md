# issue-80-phase-4a3-sse-relay

## Purpose

Implement the Phase 4A streaming slice under #80 by relaying runtime SSE through `frontend-bff`.

## Primary issue

- #80 `Phase 4A-3: Implement session and approval SSE relay with reacquisition support`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md` section 9.2
- `docs/specs/codex_webui_public_api_v0_8.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `docs/specs/codex_webui_technical_stack_decision_v0_1.md`
- `apps/README.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Add public session stream relay to `apps/frontend-bff/`
- Add public approvals stream relay to `apps/frontend-bff/`
- Map internal SSE envelopes to the public contract shape
- Add focused tests for session and approvals stream relay behavior

## Exit criteria

- Public session and approvals stream routes emit the maintained public SSE envelopes
- Public stream payloads omit internal-only fields and apply the documented field mappings
- Targeted tests pass for the relay behavior

## Work plan

1. Inspect the maintained public/internal SSE contracts.
2. Reuse the existing `frontend-bff` runtime client and event mapping logic.
3. Add SSE relay helpers and the two stream route handlers.
4. Add focused tests for session and approvals stream mapping.
5. Validate locally and update handoff notes.

## Artifacts / evidence

- Stream relay tests under `apps/frontend-bff/tests/`
- `npm test` in `apps/frontend-bff/`
- `npm run build` in `apps/frontend-bff/`

## Status / handoff notes

- Status: `locally_complete`
- Notes:
  - Added public session and approval SSE relay handlers in `apps/frontend-bff/`
  - Verified stream responses keep `text/event-stream` headers and map approval `summary` to public `title`
  - Validation passed with `npm test` and `npm run build` in `apps/frontend-bff/`
  - Retrospective:
    - What worked: existing REST mapping/runtime client structure made the SSE slice small and testable
    - Workflow problems: none beyond one missing import and one payload-order regression caught by tests before PR creation
    - Improvements to adopt: keep focused stream tests when adding transport-layer slices so SSE envelope regressions are caught before merge
    - Skill candidates or skill updates: none
    - Follow-up updates: archive this package, open PR, merge to `main`, then remove the worktree before closing `#80`

## Archive conditions

- Archive this package after the current #80 slice is locally complete, handoff notes are updated, and the execution state is ready to hand off for PR/merge cleanup
