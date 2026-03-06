# Issue 10 Plan

## TDD
- TDD: partial
- Rationale: endpoint behavior and edge cases are clear enough to pin with tests, but the server helper refactor is easier to shape while implementing.

## Steps
- [x] Add repo-relative path normalization and Git blob read helpers.
- [x] Implement `GET /api/git/show`.
- [x] Implement `GET /api/git/diff`.
- [x] Add tests for modified, new, deleted, and path-escape cases using temporary Git repos.
- [x] Run validation and self-check acceptance criteria.

## Validation Notes
- `node --test codexbox/webui-server.test.js`
- Result: pass (10 tests) on 2026-03-06

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #10` in the PR description.

## Self-Check
- `GET /api/git/show` and `GET /api/git/diff` are implemented backend-only.
- New, modified, deleted, and repo-escape cases are covered by tests.
- Bundled WebUI consumption remains explicitly tracked in Issue #11.
