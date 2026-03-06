# Issue 11 Plan

## TDD
- TDD: partial
- Rationale: the DOM flow for file-tree selection and diff rendering is stable enough to lock down with browser-side regression tests first, while layout and styling still need direct implementation work.

## Steps
- [ ] Add bundled UI structure for explorer, chat, and inspection panes.
- [ ] Load and render the workspace file tree from `/api/fs/tree`.
- [ ] Load workspace file content and Git diff data for the selected file.
- [ ] Preserve approvals and pending user-input controls in the updated layout.
- [ ] Add browser-side regression coverage for file selection and diff rendering.
- [ ] Run validation and self-check acceptance criteria.

## Validation Notes
- Primary: `node --test codexbox/public/app.test.js`
- Secondary: `node --test codexbox/webui-server.test.js`

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #11` in the PR description.
