# Issue 13 Design

## Overview
- Add session-local turn tracking maps for active turn snapshots and completed turn change sets.
- Capture a normalized workspace snapshot before `turn/start` is sent to app-server.
- When the backend receives `turn/completed`, compute the changed-file set for that `turnId` and expose it through a new backend endpoint.

## Main Decisions
- Use `GET /api/turn/changes?sessionId=...&turnId=...` as the explicit consumer contract for follow-up UI work.
- Compare snapshots by path using existence, entry kind, content hash, and Git status metadata.
- Include tracked clean files, untracked files, and deleted tracked paths in snapshots so dirty baselines are preserved accurately.
- Keep snapshots and completed turn change sets only for the lifetime of the in-memory session.

## Session Data Additions
- `activeTurnSnapshots: Map<turnId, TurnSnapshotRecord>`
- `completedTurnChanges: Map<turnId, TurnChangeRecord>`

## Snapshot Shape
- Per path:
  - `path`
  - `tracked`
  - `exists`
  - `kind` (`file`, `symlink`, `other`, `missing`)
  - `digest`
  - `gitStatus`, `indexStatus`, `worktreeStatus`

## API Contract
- `GET /api/turn/changes?sessionId=...&turnId=...`
- Response:
  - `turnId`
  - `threadId`
  - `startedAt`
  - `completedAt`
  - `changedFiles[]`
- Each changed file includes:
  - `path`
  - `changeType` (`created`, `deleted`, `updated`)
  - `before` and `after` summaries with `exists`, `kind`, `tracked`, and Git status fields

## Risks
- Whole-workspace snapshots add I/O overhead at turn start and completion.
  - Mitigation: limit snapshot enumeration to tracked and status-visible repo-relative paths instead of recursively scanning the filesystem.
- Turn tracking relies on `turn.id` being present on the `turn/start` response and completion notification.
  - Mitigation: fail clearly if lookup is requested for a turn that never produced a tracked snapshot.
