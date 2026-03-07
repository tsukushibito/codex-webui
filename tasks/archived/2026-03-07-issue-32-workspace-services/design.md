# Issue 32 Design

## Goal
Move workspace, Git, and turn-snapshot behavior into explicit backend services so `webui-server.js` keeps HTTP concerns while behavior-heavy logic lives in focused modules.

## Proposed Structure
- `codexbox/server/workspace-service.js`
  - workspace path normalization
  - Git porcelain parsing
  - workspace tree listing
  - workspace file reads
  - Git show/diff reads
- `codexbox/server/turn-changes.js`
  - workspace snapshot capture
  - snapshot diffing
  - completed turn change retention/finalization
- `codexbox/webui-server.js`
  - instantiate services with repository-local configuration
  - keep route serialization and session orchestration only

## Boundary Notes
- The workspace service should return data structures that route handlers serialize without changing the API contract.
- The turn change service should depend on a snapshot capture function and injected session-event hooks so it does not own session lifecycle concerns.

## Risks
- Path normalization or Git error handling drift if helper extraction changes exception messages.
- Turn snapshot extraction can regress dirty/untracked/deleted baseline behavior if the diff logic is altered during the move.

## Validation Focus
- Existing backend tests already cover fs/file/git/turn-changes behavior; they should remain the primary regression net.
