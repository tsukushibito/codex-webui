# Issue 14 Design

## Overview
- Add `POST /api/exec` as a stateless streaming route.
- Spawn a dedicated `codex exec --json` child process per request.
- Convert each JSONL line from `codex exec --json` into an SSE `exec/event` frame on the response stream.

## Main Decisions
- Use a single request/response stream instead of a job manager because the issue is explicitly stateless.
- Keep one-shot execution outside the session map entirely.
- Forward parsed JSON lines as opaque `event` payloads so later consumers can decide which `codex exec` event types they care about.
- Emit explicit SSE frames for:
  - `exec/started`
  - `exec/event`
  - `exec/stderr`
  - `exec/error`
  - `exec/completed`

## Route Contract
- `POST /api/exec`
- Request body:
  - `prompt` or `text` string
- Response:
  - `content-type: text/event-stream`
  - SSE payloads with a generated `jobId`

## Separation from Session Runtime
- No `sessionId`
- No reuse of `/api/session/events`
- No writes to `sessions`
- No interaction with app-server JSON-RPC bridging

## Risks
- `codex exec --json` event types may evolve.
  - Mitigation: keep the forwarded payload opaque and only promise transport-level framing.
- Streaming responses can fail mid-run if the client disconnects.
  - Mitigation: terminate the child process on request close.
