# Issue 10 Requirements

## Goal
- Add read-only Git diff endpoints for workspace file comparison views.

## In Scope
- Add `GET /api/git/show` for repository content lookup.
- Add `GET /api/git/diff` for HEAD vs worktree comparison of a single repo-relative path.
- Handle new and deleted file cases without assuming `HEAD:path` always exists.
- Reject repo escape and non-text responses.
- Add regression validation for backend diff behavior.

## Out of Scope
- Diff pane rendering in the bundled WebUI.
- Turn-local snapshot diffs from Issue #13.
- Reconnect or session behavior from Issue #12.

## Acceptance Criteria Mapping
- Diff endpoint exists.
- File show endpoint exists.
- New and deleted file cases are handled.
- Response shape is sufficient for the bundled WebUI work in Issue #11.
- Validation covers backend diff contract and edge cases.

## Constraints and Assumptions
- Keep the change backend-only.
- Reuse the existing workspace path and text-file safety constraints where practical.

## Open Questions
- None blocking.
