# Issue 21 Plan

## TDD
- TDD: partial
- Rationale: integration-heavy behavior with child-process RPC requires smoke/integration validation.

## Steps
- [x] Create requirements/design/plan artifacts.
- [x] Implement pending user-input request storage and timeout handling.
- [x] Add `/api/user-input` list/respond endpoints.
- [x] Add explicit handler for `item/tool/call` with safe failure response.
- [x] Improve unknown server-request structured logging.
- [x] Validate non-approval request flow with a controlled fake app-server harness.
- [x] Self-check acceptance criteria.

## Validation Notes
- `node --check codexbox/webui-server.js` passed.
- Manual harness validation:
  - fake app-server confirmed `item/tool/call` receives deterministic safe result shape (`success:false`, `contentItems`).
  - `item/tool/requestUserInput` appeared via `GET /api/user-input`, and resolved via `POST /api/user-input/respond`.
  - unknown method harness received `-32601`, and session stayed healthy (`GET /api/healthz`).

## Security and Compatibility Checks
- Unknown/unsupported request methods must not crash session.
- Non-approval request handling must preserve thread/session lifecycle.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #21` when validation passes.
