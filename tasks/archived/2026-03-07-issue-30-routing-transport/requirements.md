# Issue 30 Requirements

## Goal
- Refactor the backend HTTP layer so route registration and SSE transport concerns are easier to extend without continuing to grow `codexbox/webui-server.js`.

## In Scope
- Replace the large backend GET/POST API condition chains with explicit route dispatch tables or equivalent structured routing.
- Extract shared SSE framing/opening helpers used by session event streams and one-shot exec streams.
- Preserve existing backend routes, status codes, and response/event contracts.
- Validate the refactored backend layer through existing shipped API tests.

## Out of Scope
- Changing API semantics or payload shapes.
- Reworking session/runtime ownership beyond what is necessary for route extraction.
- Frontend changes.

## Acceptance Criteria Mapping
- Backend route handling no longer depends on a single large `if`/`else` chain for all GET/POST APIs.
- Session SSE and one-shot exec SSE framing share a common helper or abstraction.
- Existing routes remain behaviorally compatible.
- Validation covers the refactored backend route layer.

## Consumers and Workflows
- Bundled WebUI routes already shipped in the repository.
- Backend-only callers of `/api/exec`, `/api/fs/*`, `/api/git/*`, and `/api/turn/changes`.

## Edge Cases and Error Handling
- Unknown routes still return the same 404 behavior.
- Unsupported methods still return the same 405 behavior.
- SSE responses still set the current headers and retry prelude.
- Refactor must not silently change per-route body parsing assumptions.

## Constraints and Assumptions
- Keep the existing CommonJS runtime and Node standard library stack.
- Prefer structural extraction over behavioral rewrites.
- Preserve current test coverage as the primary safety net.

## Open Questions
- None blocking.
