# Issue 12 Plan

## TDD
- TDD: partial
- Rationale: reconnect and transcript rebuild have clear behavioral seams for regression tests, but backend/client plumbing still needs setup scaffolding first.

## Steps
- [x] Add backend reconnect and `thread/read` endpoints.
- [x] Add backend regression coverage with a fake app-server harness for reconnect snapshot and `thread/read`.
- [x] Add client-side session persistence and reconnect-first bootstrap logic.
- [x] Add transcript rebuild logic from `thread/read`.
- [x] Add bundled UI regression coverage for reconnect bootstrap and transcript restore.
- [x] Run validation and self-check acceptance criteria.

## Validation Notes
- Backend: `node --test codexbox/webui-server.test.js`
- Frontend: `node --test codexbox/public/app.test.js`
- Final: `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`

## Validation Results
- Passed: `node --test codexbox/webui-server.test.js`
- Passed: `node --test codexbox/public/app.test.js`
- Passed: `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`

## Risks and Deferred Items
- Unsupported historical thread item types will remain omitted from the minimal chat transcript.
- Exact SSE event replay by `Last-Event-ID` is deferred because Issue #12 only requires resync via snapshot and `thread/read`.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #12` in the PR description.
