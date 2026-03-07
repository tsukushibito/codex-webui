# Issue 30 Design

## Overview
- Introduce a small SSE transport helper module for common framing and stream-opening behavior.
- Replace `handlePostApi` and `handleGetApi` monolithic condition chains with route tables composed of named handler functions.
- Keep all business logic in the current server file for now; this issue only improves HTTP and transport structure.

## Main Decisions
- Use plain object route tables keyed by path for GET and POST API routes.
- Keep request-body parsing centralized in `handlePostApi`, then delegate to route handlers.
- Share SSE headers and retry prelude through a helper module instead of duplicating the setup in session and exec paths.
- Leave deeper runtime/service extraction to follow-up issues `#31` and `#32`.

## Component Boundaries
- `codexbox/server/sse.js`
  - `writeSse()`
  - `openSseStream()`
- `codexbox/webui-server.js`
  - route handler functions
  - route tables
  - existing business logic and state

## Risks
- Route extraction can accidentally change control flow around early returns.
  - Mitigation: keep handlers thin and preserve existing response bodies/statuses.
- Shared SSE helpers could change framing subtly.
  - Mitigation: preserve exact headers, retry prelude, and `writeSse` payload format.
