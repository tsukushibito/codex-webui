# Issue 24 Requirements

## Goal
- Let the bundled WebUI handle pending `item/tool/requestUserInput` prompts end-to-end.

## In Scope
- Render pending user-input requests from session snapshot and SSE events.
- Let the browser submit answers through `POST /api/user-input/respond`.
- Remove resolved and timed-out requests from the UI.
- Add validation for the bundled UI flow.

## Out of Scope
- Reconnect/resume work from Issue #12.
- New backend protocol behavior beyond the existing user-input endpoints.

## Acceptance Criteria Mapping
- Pending user-input requests become visible in the shipped WebUI.
- A user can send answers from the WebUI without calling backend APIs manually.
- Resolved or timed-out requests disappear from the pending list.
- Validation covers the browser-side handling path.

## Constraints and Assumptions
- Keep the current minimal UI structure.
- Reuse the existing `/api/user-input` and SSE contracts.

## Open Questions
- None blocking.
