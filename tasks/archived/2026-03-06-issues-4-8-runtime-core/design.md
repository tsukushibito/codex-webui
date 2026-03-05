# Issues 4-8 Design

## Overview
- Replace the placeholder HTTP server with a stateful WebUI server that manages browser sessions and a dedicated Codex app-server child per session.
- Use SSE for one-way event streaming to the browser.
- Use JSON HTTP endpoints for command initiation (`thread/start`, `turn/start`, approval responses).

## Core Components
- Session store (`Map<sessionId, SessionState>`) with:
  - app-server child process
  - pending JSON-RPC request map
  - active SSE clients
  - pending approvals
  - event sequence counter and timestamps
- JSON-RPC bridge:
  - outbound request helper with promise resolution
  - line-oriented stdout parser
  - server request handler for approval requests
- Idle reaper:
  - periodic sweep that terminates stale sessions and children
- Minimal static UI:
  - create session
  - open SSE stream
  - start thread on demand
  - send turns and render streamed deltas
  - basic approval modal/actions

## API Surface
- `POST /api/session/start`
- `GET /api/session/events?sessionId=...`
- `POST /api/session/end`
- `POST /api/thread/start`
- `POST /api/turn/start`
- `GET /api/approvals?sessionId=...`
- `POST /api/approvals/respond`
- `GET /api/healthz`
- `GET /` and `/static/*`

## Approval Handling
- Detect server-initiated JSON-RPC requests with methods:
  - `item/commandExecution/requestApproval`
  - `item/fileChange/requestApproval`
  - `execCommandApproval`
  - `applyPatchApproval`
- Persist as pending approval records keyed by JSON-RPC request id.
- Emit SSE events on create/update.
- Timeout strategy:
  - auto-respond with cancel-style decision on timeout
  - mark approval as timed out and emit an event

## Risks
- Upstream protocol changes may add new request/notification variants.
  - Mitigation: forward unknown notifications as generic SSE events.
- App-server startup or auth failures.
  - Mitigation: return clear API errors and emit session error events.
