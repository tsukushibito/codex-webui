# Issue #44 Plan

## Review Status
- Requirements review: pass
- Design review: pass

## TDD Decision
- TDD: partial
- Rationale: the main work is component and hook migration, but the server route and build smoke must still be validated. Frontend behavioral test coverage is deferred to #46.

## Steps
1. Add typed API/session helpers for the Preact shell path.
   - Validation: `npm run check`.
2. Replace the bridge placeholder app with shell and transcript components.
   - Validation: `npm run build`.
3. Wire startup, reconnect, transcript rebuild, delta updates, and turn send into the Preact shell.
   - Validation: manual build smoke plus `node --test codexbox/webui-server.test.js`.
4. Keep the deferred panels visible with placeholder content and archive the task artifacts.
   - Validation: build output reflects the shell layout.
5. Close out through PR/merge with `Closes #44`.
