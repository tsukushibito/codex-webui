# Issue 11 Requirements

## Goal
- Add the bundled WebUI file tree and inspection panes that consume the existing read-only FS and Git APIs.

## In Scope
- Render a workspace file tree in the bundled WebUI.
- Allow selecting a file and viewing its workspace contents.
- Render the Git-backed HEAD vs worktree comparison for the selected file.
- Preserve the existing approvals and pending user-input controls in the layout.
- Add browser-side regression coverage for the shipped UI flow.

## Out of Scope
- Thread list UI.
- Tool execution log UI.
- Editable files or write-capable workspace actions.
- Turn-local changed-file presentation from Issue #13.

## Consumer Boundary
- This Issue is the first-party bundled WebUI consumer of `/api/fs/tree`, `/api/fs/file`, `/api/git/show`, and `/api/git/diff`.
- Backend API behavior is already covered by Issue #10 and its follow-up edge-case fix.

## Acceptance Criteria
- File tree pane is visible.
- File content can be inspected from the bundled WebUI.
- Diff pane renders Git-backed diffs from the selected file.
- Mobile layout provides an explicit way to switch between chat, files, and inspection panes.
- Validation covers the bundled browser-side flow.

## Edge Cases and Error Handling
- Empty or failed workspace-tree loads are visible in the UI.
- Selecting a file surfaces file-load or diff-load errors without breaking chat input.
- New-file diffs and missing left-side content render cleanly in the diff pane.

## Constraints and Assumptions
- Keep the UI read-only.
- Preserve the existing visual language instead of introducing a new design system.
- Prefer straightforward DOM rendering over framework adoption.

## Open Questions
- None blocking.
