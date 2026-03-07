# Issue #46 Design

## Overview
Use `vitest` with `jsdom` and `@testing-library/preact` for focused component/app-level tests. Keep the existing backend `node:test` suites intact and add package scripts so the migrated frontend tests can run alongside them.

## Test Design
- Add `frontend/src/App.test.tsx` to exercise reconnect, workspace inspection, and interaction submission.
- Stub `fetch`, `EventSource`, and `localStorage` through the jsdom globals.
- Use rendered DOM assertions rather than hook internals.

## Script Design
- `npm run test:frontend` for Vitest.
- `npm run test:backend` for `webui-server.test.js`.
- `npm run test:legacy` for the existing legacy frontend regression suite while cutover is still pending.
- `npm run test:all` to run the combined validation path.

## Validation
- `npm run test:frontend`
- `npm run test:all`
- `npm run build`

## Risks
- The legacy frontend still exists until #47, so both migrated and legacy test paths remain temporarily.
