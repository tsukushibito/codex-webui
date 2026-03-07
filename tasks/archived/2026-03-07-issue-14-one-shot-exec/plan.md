# Issue 14 Plan

## TDD
- TDD: yes
- Rationale: the route shape, stream framing, and separation from the session manager are stable backend behaviors with clear observable outputs.

## Steps
- [x] Add backend regression coverage for stateless one-shot exec streaming.
- [x] Implement `POST /api/exec` with streaming SSE framing around `codex exec --json`.
- [x] Update durable docs for the one-shot backend contract.
- [x] Run validation and self-check acceptance criteria.
- [ ] Create PR, merge, close the issue, and archive task artifacts.

## Validation Notes
- Primary: `node --test codexbox/webui-server.test.js`
- Secondary: `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`

## Validation Results
- Passed: `node --test codexbox/webui-server.test.js`
- Passed: `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`

## Risks and Deferred Items
- No bundled WebUI caller is added here; a later consumer will use the explicit backend stream contract.
- The route does not persist completed jobs or support replay after disconnect.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #14` in the PR description.
