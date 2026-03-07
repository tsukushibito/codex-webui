# Issue 33 Requirements

## Scope Assessment
- Change size: medium.
- Reasoning: the refactor spans browser runtime loading, frontend state/bootstrap logic, and multiple rendering responsibilities while preserving the shipped DOM behavior.

## In Scope
- Split `codexbox/public/app.js` into smaller frontend modules or equivalent boundaries for transport, session/bootstrap logic, and rendering.
- Separate approval/user-input rendering and file inspection rendering from session/bootstrap logic.
- Preserve the current browser behavior and DOM contract used by the existing tests.
- Keep current frontend and combined validation green.

## Out of Scope
- Visual redesign.
- Backend API changes.
- New one-shot exec or turn-local changes UI.

## Acceptance Criteria
- `app.js` becomes orchestration instead of the primary home for transport, bootstrap, and rendering logic.
- Session bootstrap/reconnect logic is separated from rendering concerns.
- File inspection and approval/user-input rendering are implemented behind clearer boundaries.
- Validation covers the shipped frontend behavior after the refactor.

## Validation Targets
- `node --test codexbox/public/app.test.js`
- `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`
