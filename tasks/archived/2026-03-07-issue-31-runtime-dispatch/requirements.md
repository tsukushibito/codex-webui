# Issue 31 Requirements

## Scope Assessment
- Change size: medium.
- Reasoning: the refactor spans backend runtime wiring, session lifecycle state, and RPC dispatch paths across multiple files.

## In Scope
- Extract backend session lifecycle helpers from `codexbox/webui-server.js` into dedicated server modules.
- Replace long RPC server request/notification condition chains with structured dispatch tables or equivalent explicit dispatch.
- Preserve existing approval, user-input, reconnect, turn completion, and session closeout behavior.
- Keep current backend and bundled-client validation green.

## Out of Scope
- Backend HTTP API contract changes.
- Frontend behavior changes.
- Git/FS service extraction handled by `#32`.

## Acceptance Criteria
- Session creation, lookup, SSE fanout, and shutdown are no longer defined inline inside `webui-server.js`.
- RPC request/response/notification handling is organized behind explicit runtime helpers, with request and notification dispatch no longer implemented as long method-specific branches.
- Approval and user-input state mutation paths remain explicit and test-covered.
- Validation covers the refactored runtime behavior without API regressions.

## Validation Targets
- `node --test codexbox/webui-server.test.js`
- `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`
