# Issues 4-8 Requirements

## Goal
- Deliver the P0 runtime core needed for browser-to-Codex conversation flow: session lifecycle, app-server bridge, streaming execution APIs, minimal chat UI, and approval handling.

## In Scope
- Issue #4: session creation, SSE stream endpoint, idle session cleanup.
- Issue #5: one `codex app-server` child per session, stdio JSON-RPC bridge, initialize handshake.
- Issue #6: backend APIs for `thread/start` and `turn/start`, forwarding streaming notifications to UI.
- Issue #7: minimal WebUI with input box and incremental assistant streaming for desktop/mobile.
- Issue #8: store pending approvals, send Allow/Deny decisions back, handle timeout/cancel.

## Out of Scope
- P1 and P2 issues (`#9` and later) such as file tree/diff APIs and reconnect recovery.
- Production-grade auth and full UI polish.
- Multi-user hard isolation.

## Acceptance Criteria Mapping
- #4
  - session IDs are issued
  - SSE endpoint exists
  - idle sessions are cleaned up
- #5
  - one child per browser session
  - stdio JSONL is bridged correctly
  - initialize handshake is completed
- #6
  - `thread/start` is available
  - `turn/start` is available
  - streaming events are forwarded to the UI layer
- #7
  - input box exists
  - streamed assistant output renders incrementally
  - basic session view works in desktop and mobile layouts
- #8
  - pending approvals are stored
  - Allow/Deny responses are sent back
  - approval timeout or cancellation is handled

## Constraints and Assumptions
- `codex app-server` is launched via `codex app-server --listen stdio://`.
- Web server remains dependency-light (Node.js built-ins) in this stage.
- Keep repository changes focused on `codexbox/` and temporary task artifacts.

## Open Questions
- None blocking for implementing #4-#8.
