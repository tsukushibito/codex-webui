# Issue 21 Requirements

## Goal
- Improve app-server bridge compatibility by handling expected non-approval server-initiated JSON-RPC requests safely.

## In Scope
- Handle `item/tool/requestUserInput` explicitly with pending storage and response path.
- Handle `item/tool/call` explicitly with safe non-crashing behavior.
- Improve unknown request logging/telemetry shape.
- Validate at least one non-approval request flow.

## Out of Scope
- Full dynamic tool execution implementation.
- Reconnect/resume enhancements from Issue #12.

## Acceptance Criteria Mapping
- Expected non-approval methods are handled explicitly or safely bridged.
- Unknown requests are handled safely with structured logging and clear behavior.
- Session lifecycle remains stable when non-approval requests appear.
- Include test/manual validation for at least one non-approval request path.

## Constraints and Assumptions
- Keep changes small and backend-focused.
- Preserve existing approval flow behavior.

## Open Questions
- None blocking.
