# Issue 13 Plan

## TDD
- TDD: yes
- Rationale: snapshot diff behavior and dirty-worktree edge cases are well-defined backend behaviors with stable request/response seams.

## Steps
- [x] Add backend regression tests for snapshot-based turn change tracking and dirty baseline edge cases.
- [x] Implement snapshot capture, comparison, and session-local turn tracking.
- [x] Expose `GET /api/turn/changes` for completed turns.
- [x] Update durable design documentation for the new backend contract.
- [x] Run validation and self-check acceptance criteria.
- [ ] Create PR, merge, and close the issue.

## Validation Notes
- Primary: `node --test codexbox/webui-server.test.js`
- Secondary: `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`

## Validation Results
- Passed: `node --test codexbox/webui-server.test.js`
- Passed: `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`

## Risks and Deferred Items
- No bundled UI consumer is added here; later UI work should query the explicit backend contract.
- Snapshot data is in-memory only and disappears when the session ends.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #13` in the PR description.
