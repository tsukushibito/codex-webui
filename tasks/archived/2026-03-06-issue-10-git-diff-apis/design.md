# Issue 10 Design

## Overview
- Extend the existing Node server with Git-specific read helpers.
- Normalize repo-relative paths separately from filesystem-resolved paths so deleted files can still be shown from `HEAD`.

## API Shape
- `GET /api/git/show?path=...&ref=HEAD`
  - Returns `{ ok, file }`
  - `file` includes `path`, `ref`, `exists`, `size`, and `content`
- `GET /api/git/diff?path=...`
  - Returns `{ ok, diff }`
  - `diff` includes `path`, Git status fields, and `left` / `right` text payloads
  - `left` is the Git side (`HEAD`)
  - `right` is the worktree side

## Main Decisions
- Require `path` for both endpoints.
- Treat missing `HEAD` content as an empty left side for new files.
- Treat missing worktree content as an empty right side for deleted files.
- Reject binary or oversized text on both sides with the same safety checks used for `/api/fs/file`.
- Use temporary Git repos in tests so modified/new/deleted states can be exercised safely.

## Risks
- Git path resolution differs from filesystem resolution for symlinks and deleted files.
  - Mitigation: validate repo-relative paths for escape prevention, then resolve worktree paths separately when filesystem content is needed.
