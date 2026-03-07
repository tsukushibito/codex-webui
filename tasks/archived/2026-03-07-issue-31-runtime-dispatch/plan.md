# Issue 31 Plan

## TDD
- TDD: partial
- Rationale: regression-sensitive approval/user-input/session-close paths are well-suited to tests first or alongside extraction, while the module move itself is structural scaffolding.

## Steps
- [x] Add or extend backend tests for approval/user-input/session-close runtime paths.
- [x] Extract session store helpers into a dedicated backend module.
- [x] Extract RPC runtime and dispatch tables into a dedicated backend module.
- [x] Rewire `webui-server.js` to consume the extracted runtime/store modules without changing API contracts.
- [x] Run backend and combined validation.
- [ ] Create PR, merge, close the issue, and archive task artifacts.

## Validation Notes
- Primary: `node --test codexbox/webui-server.test.js`
- Secondary: `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`
- Result: both commands passed on 2026-03-07 after extracting session-store and session-runtime modules.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #31` in the PR description.
