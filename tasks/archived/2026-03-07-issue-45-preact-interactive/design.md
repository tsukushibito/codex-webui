# Issue #45 Design

## Overview
Extend the Preact app state hook so it owns session, transcript, workspace inspection, and pending-interaction state. Replace the placeholder side panels with typed components that mirror the current legacy rendering behavior.

## Main Changes
- Expand the shell hook into a full app hook that loads workspace data and handles approval/user-input state transitions.
- Add components for workspace tree, file preview, diff preview, approvals, and user-input cards.
- Reuse the typed API client for all interactions.

## State Design
- Keep transcript messages in an array for render order.
- Keep pending approvals and user inputs in `Map`s keyed by request ID for event-driven updates.
- Track selected path, selected entry, selected file, selected diff, and loading/error state for workspace inspection.

## Behavior Design
- Load the workspace tree on startup and auto-select the first file when possible.
- Use `Promise.allSettled` for file preview and diff fetches so one failure does not hide the other.
- Apply session snapshot approvals/user inputs on reconnect and on SSE snapshot events.
- Resolve approval and user-input actions through the existing backend routes and rely on the live events to clear them.

## Validation
- `npm run check`
- `npm run build`
- `node --test codexbox/webui-server.test.js`
- `node --test codexbox/public/app.test.js`

## Risks and Deferred Items
- Dedicated browser-side test coverage for the Preact UI remains deferred to #46.
- The legacy UI still remains the default route until #47.
