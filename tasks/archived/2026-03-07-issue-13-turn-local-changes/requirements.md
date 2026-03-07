# Issue 13 Requirements

## Goal
- Compute per-turn changed files from a workspace snapshot captured at `turn/start`, instead of reusing raw current-worktree diff state.

## In Scope
- Capture a turn-start snapshot for each backend turn.
- Derive completed-turn changed files from the difference between the turn-start snapshot and the workspace state at `turn/completed`.
- Expose a backend contract that later consumers can query by `turnId`.
- Validate dirty worktree edge cases against the snapshot-based contract.

## Out of Scope
- New bundled WebUI presentation for turn-local changed files.
- Broader file tree or diff UX changes.
- Cross-session or durable persistence of turn snapshots after the session ends.

## Acceptance Criteria Mapping
- Turn-start snapshot is captured before backend turn execution starts.
- Turn-local changed files are derived from the snapshot rather than raw `git diff --name-only`.
- Dirty worktree edge cases are handled, including pre-existing modified, deleted, and untracked paths.
- The consumer-facing contract for turn-local changes is explicit enough for later UI work.
- Validation demonstrates snapshot-based behavior rather than only current worktree diff behavior.

## Consumers and Workflows
- No shipped frontend consumer in this issue.
- Future WebUI work can query the backend by `sessionId` and `turnId` after a turn completes.

## Edge Cases and Error Handling
- Pre-existing dirty files that do not change during the turn must not appear in the turn-local set.
- Pre-existing dirty files that change again during the turn must appear even if their Git status code stays the same.
- Pre-existing deleted tracked files that remain deleted must not appear in the turn-local set.
- Untracked files that already existed before the turn and stay unchanged must not appear in the turn-local set.
- Unknown or incomplete `turnId` requests return a clear API error instead of falling back to workspace-wide diff state.

## Constraints and Assumptions
- Keep the contract backend-only for this issue.
- Use the app-server `turn.id` as the stable lookup key for turn-local changes.
- Snapshot comparison may inspect current workspace bytes or symlink targets when needed to detect changes beyond Git status code changes.

## Open Questions
- None blocking.
