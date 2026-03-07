# Issue 32 Requirements

## Scope Assessment
- Change size: medium.
- Reasoning: the refactor spans backend filesystem/Git helpers, turn-snapshot derivation, and route wiring while preserving shipped API behavior.

## In Scope
- Extract workspace file tree/file readers and Git-backed readers from `codexbox/webui-server.js` into dedicated backend services.
- Extract turn snapshot capture/diff/finalization logic into a dedicated backend service.
- Preserve the current `/api/fs/*`, `/api/git/*`, and `/api/turn/changes` contracts.
- Keep backend and combined validation green.

## Out of Scope
- Route table or session runtime refactors already handled elsewhere.
- Frontend changes for turn-local changes.
- API response shape changes.

## Acceptance Criteria
- Workspace/Git read logic is no longer embedded in the top-level server file.
- Turn snapshot/change derivation is isolated behind an internal service boundary.
- Route handlers remain behaviorally compatible.
- Validation covers the extracted services through the shipped API surface.

## Validation Targets
- `node --test codexbox/webui-server.test.js`
- `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`
