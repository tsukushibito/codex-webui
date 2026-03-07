# Issue 31 Design

## Goal
Reduce `webui-server.js` responsibility by moving session state management and RPC runtime behavior behind backend-internal modules, while keeping the HTTP routes unchanged.

## Proposed Structure
- `codexbox/server/session-store.js`
  - owns the in-memory session map
  - creates session records
  - exposes session lookup, touch, SSE fanout, snapshot serialization, and shutdown helpers
- `codexbox/server/session-runtime.js`
  - owns RPC write/request/response helpers
  - owns approval and user-input pending state transitions
  - owns server-request and notification dispatch tables
  - starts and wires the `codex app-server` child process
- `codexbox/webui-server.js`
  - keeps HTTP route handling and workspace/Git helpers
  - instantiates the session store and runtime with injected dependencies

## Dispatch Strategy
- Request dispatch keeps approval methods in an explicit supported-method set that routes to one approval handler.
- Non-approval server requests use a method-to-handler table.
- Notifications use a method-to-handler table so `thread/started`, `item/agentMessage/delta`, and `turn/completed` stay easy to audit.

## Behavior Constraints
- Keep session object shape compatible with existing HTTP routes.
- Keep `turn/completed` snapshot finalization delegated from the runtime into the existing snapshot logic.
- Preserve current timeout semantics and emitted SSE event names.

## Risks
- Moving shutdown and pending-state cleanup can introduce lifecycle regressions if a helper forgets to clear timeouts or remove sessions.
- Dispatch extraction can silently break unsupported-method behavior if the fallback path changes.

## Validation Focus
- Existing reconnect and turn-change tests cover runtime bootstrap and notification-driven turn finalization.
- Add approval/user-input/session-end regression coverage so the extracted lifecycle paths stay explicit.
