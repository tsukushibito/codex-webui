# Issue 12 Design

## Overview
- Add a lightweight `POST /api/session/reconnect` endpoint that validates and returns the current session snapshot for an existing session.
- Add `POST /api/thread/read` as a thin JSON-RPC bridge to app-server.
- On the bundled client, persist the current session ID in browser storage, attempt reconnect on startup, then rebuild the chat transcript from `thread/read`.

## Main Decisions
- Keep reconnect scoped to the existing in-memory session map; if the process or idle sweep already removed the session, the client falls back to a new session.
- Do not add server-side event replay. Reconnect state comes from the existing SSE snapshot plus an explicit `thread/read` fetch.
- Treat transcript resync as a replace operation: clear rendered chat messages and rebuild from `thread/read` items in order.
- Persist only minimal client metadata needed for reconnect, starting with the session ID.

## Component Responsibilities
- `codexbox/webui-server.js`
  - validate existing session IDs for reconnect
  - expose `thread/read`
  - keep pending approvals and pending user inputs in the snapshot payload
- `codexbox/public/app.js`
  - save and clear reconnect metadata
  - choose reconnect-or-start during bootstrap
  - rebuild visible chat items from `thread/read`
  - keep current live SSE updates after reconnect

## Consumer Impact
- Bundled WebUI consumer work is in scope now.
- No separate follow-up issue is needed for the shipped reconnect path.

## Risks
- `thread/read` item shapes are broader than the current chat renderer.
  - Mitigation: rebuild only caller-visible message items needed for the chat transcript and ignore unsupported item types.
- Stored session IDs can go stale after idle timeout or process restart.
  - Mitigation: reconnect failure clears stored metadata and falls back to a fresh session.
