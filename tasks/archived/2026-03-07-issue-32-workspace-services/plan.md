# Issue 32 Plan

## TDD
- TDD: no
- Rationale: this task is a structural extraction with an already comprehensive backend regression suite around the affected routes.

## Steps
- [x] Extract workspace and Git helpers into a dedicated backend service module.
- [x] Extract turn snapshot/change derivation into a dedicated backend service module.
- [x] Rewire `webui-server.js` to use the services without changing route contracts.
- [x] Run backend and combined validation.
- [ ] Create PR, merge, close the issue, and archive task artifacts.

## Validation Notes
- Primary: `node --test codexbox/webui-server.test.js`
- Secondary: `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`
- Result: both commands passed on 2026-03-07 after extracting workspace-service and turn-changes modules.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #32` in the PR description.
