# Issue 30 Plan

## TDD
- TDD: yes
- Rationale: routing and SSE transport behavior already has stable backend tests that should catch regressions while structure changes underneath.

## Steps
- [x] Extract shared SSE framing/opening helpers.
- [x] Replace GET/POST API condition chains with route tables and named handlers.
- [x] Run backend validation and confirm route behavior remains compatible.
- [ ] Create PR, merge, close the issue, and archive task artifacts.

## Validation Notes
- Primary: `node --test codexbox/webui-server.test.js`
- Secondary: `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`
- Result: both commands passed on 2026-03-07 after the route-table and SSE helper refactor.

## Risks and Deferred Items
- Runtime/service extraction is deferred to `#31` and `#32`.
- Static asset routing can stay lightweight as long as API routing is cleaned up here.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #30` in the PR description.
