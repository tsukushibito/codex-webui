# Issue 10 Edge-Case Fix Requirements

## Goal
- Fix the remaining caller-visible edge cases in the read-only Git diff APIs added for Issue #10.

## In Scope
- Reject invalid `ref` values for `GET /api/git/show`.
- Make Git-vs-worktree diff semantics consistent for symlink paths.
- Add regression coverage for the new edge-case behavior.

## Out of Scope
- Bundled WebUI rendering changes.
- New Git diff endpoints or response-shape expansions.
- Broader snapshot or turn-local diff work.

## Acceptance Criteria
- `GET /api/git/show` returns a client-visible error for an invalid `ref`.
- `GET /api/git/diff` compares a symlink path as the symlink entry on both sides, not blob text on one side and dereferenced file contents on the other.
- Path-safety checks still prevent repo escape.
- Validation covers the invalid-ref and symlink cases.

## Constraints and Assumptions
- Keep the response shape unchanged for valid requests.
- Preserve the existing workspace path-safety policy.
- Treat symlink diff behavior as a backend contract fix, not a follow-up Issue.

## Open Questions
- None blocking.
