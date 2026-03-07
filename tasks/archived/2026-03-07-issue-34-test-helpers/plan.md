# Issue 34 Plan

## TDD
- TDD: no
- Rationale: the task is a pure harness extraction against an existing regression suite, so preserving behavior through validation is the main goal.

## Steps
- [x] Extract backend test harness helpers into a shared test-helper module.
- [x] Extract frontend fake DOM/storage/EventSource helpers into a shared test-helper module.
- [x] Rewire backend and frontend tests to use the shared helpers without changing scenario intent.
- [x] Run backend, frontend, and combined validation.
- [ ] Create PR, merge, close the issue, and archive task artifacts.

## Validation Notes
- Primary: `node --test codexbox/webui-server.test.js`
- Secondary: `node --test codexbox/public/app.test.js`
- Combined: `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`
- Result: all three commands passed on 2026-03-07 after extracting shared test helpers.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #34` in the PR description.
