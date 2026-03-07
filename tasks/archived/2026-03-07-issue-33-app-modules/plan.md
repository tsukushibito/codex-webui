# Issue 33 Plan

## TDD
- TDD: no
- Rationale: the task is primarily structural refactoring against an existing frontend regression suite, so preserving behavior with post-change validation is lower risk than rewriting tests first.

## Steps
- [x] Extract frontend transport helpers into a dedicated module.
- [x] Extract frontend render helpers into a dedicated module.
- [x] Extract session/bootstrap logic into a dedicated module and reduce `app.js` to orchestration.
- [x] Update browser script loading to include the new modules.
- [x] Run frontend and combined validation.
- [ ] Create PR, merge, close the issue, and archive task artifacts.

## Validation Notes
- Primary: `node --test codexbox/public/app.test.js`
- Secondary: `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`
- Result: both commands passed on 2026-03-07 after splitting transport, session, and render modules.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #33` in the PR description.
