# Issue 10 Edge-Case Fix Plan

## TDD
- TDD: yes
- Rationale: the bug reports map cleanly to request/response behavior and are easy to lock down with regression tests first.

## Steps
- [ ] Add regression tests for invalid `ref` handling and symlink diff behavior.
- [ ] Update Git ref validation to distinguish invalid refs from missing files.
- [ ] Update worktree diff reads so symlink paths compare symlink-entry text on both sides.
- [ ] Run targeted validation and confirm acceptance criteria.

## Validation Notes
- `node --test codexbox/webui-server.test.js`

## Merge and Issue Closeout Method
- Merge path: direct follow-up commit on `main`.
- Issue closeout: follow-up fix for the already-closed Issue #10.
