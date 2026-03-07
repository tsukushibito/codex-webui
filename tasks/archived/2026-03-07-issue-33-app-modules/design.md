# Issue 33 Design

## Goal
Turn the bundled frontend into a small orchestrator plus dedicated modules for transport, session/bootstrap logic, and rendering, while keeping browser loading simple and preserving Node-based tests.

## Proposed Structure
- `codexbox/public/app-transport.js`
  - JSON API helper
  - SSE connection helper and event decoding
- `codexbox/public/app-session.js`
  - session persistence
  - session bootstrap/reconnect/send-turn flows
  - transcript rebuild and SSE event state mutations
- `codexbox/public/app-render.js`
  - DOM helpers
  - workspace tree, file preview, diff, approvals, and user-input rendering
- `codexbox/public/app.js`
  - state creation
  - orchestration and workspace data loading
  - browser startup shim and CommonJS re-export surface for tests

## Packaging Strategy
- Use small UMD-style wrappers so Node tests can `require()` the modules while the browser can load them as ordered deferred scripts.
- Update `index.html` to load the new frontend scripts before `app.js`.

## Risks
- Browser script ordering regressions if the new files are not loaded before `app.js`.
- Callback wiring regressions between renderer actions and session/bootstrap state.

## Validation Focus
- Existing tests already cover pending user-input rendering, reconnect/bootstrap transcript rebuild, approvals display, and file inspection.
- No DOM contract changes should be necessary; the tests should pass unchanged.
