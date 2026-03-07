# Issue #44 Design

## Overview
Build a typed Preact shell that mirrors the current HTML structure and stateful transcript behavior. Use a custom hook for session bootstrap, reconnect, live transcript updates, and send-turn actions. Keep the non-chat side panels as placeholder sections so the layout is complete without pulling the interactive file/approval scope into this issue.

## Main Modules
- `components/` for shell layout pieces.
- `hooks/use-shell-session.ts` for bootstrap, reconnect, SSE handling, transcript rebuild, and send-turn behavior.
- `lib/api.ts` for typed API calls and event parsing.
- `App.tsx` as the top-level shell composition.

## State Design
- Session and transcript state live in the shell hook.
- Transcript messages are tracked in an ordered array with optional item IDs for delta updates.
- Active pane state is local to the shell.

## Behavior Design
- On startup, attempt reconnect from stored session ID; if reconnect fails, start a fresh session.
- After reconnect, resync the transcript with `thread/read` when a thread ID exists.
- Sending a turn appends the user message immediately and relies on SSE delta/completion events for assistant output.
- Files/inspect/approvals/user-input panels render placeholder copy that points to #45.

## Validation
- `npm run check`
- `npm run build`
- `node --test codexbox/webui-server.test.js`

## Risks
- The current issue intentionally leaves non-chat interactive flows incomplete.
- Frontend browser tests remain deferred to #46.
