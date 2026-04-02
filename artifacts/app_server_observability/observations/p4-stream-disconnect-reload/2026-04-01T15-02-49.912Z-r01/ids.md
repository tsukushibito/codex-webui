# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-reconstruction-01`
- `thread_id`: `019d4991-9162-7b82-8804-b539df2d37b5`
- native `request_id`: `0`

`thread_id` is `responses/response-0001.json`, `responses/response-0003.json`, `responses/response-0005.json`, ` responses/response-0006.json`, `server_requests/server-request-0001.json`, `stream/events.ndjson` It was agreed. Native `request_id` was observed only in `server_requests/server-request-0001.json` of pending approval request and could not be retrieved again with history reload.

## Transport Request Mapping

- `request-0001.json`: connection A, JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: connection A, JSON-RPC request id `3`, method `turn/start` for turn1
- `request-0003.json`: connection A, JSON-RPC request id `4`, method `thread/read` after turn1 completed
- `request-0004.json`: connection A, JSON-RPC request id `5`, method `turn/start` for turn2
- `request-0005.json`: connection A, JSON-RPC request id `6`, method `thread/read` while approval pending
- `request-0006.json`: connection B, JSON-RPC request id `2`, method `thread/read` after disconnect reload

Because the transport request id was reinitialized in connection B, the JSON-RPC request id on the client side does not become a stable key across connections.

## Approval Request IDs

- server request method: `item/commandExecution/requestApproval`
- server request id: `0`
- approval turn id: `019d4991-a2b8-7973-8de7-e511105cb39d`
- approval item id: `call_F4qrZaXxwxCgxKezesJaS7bQ`

`threadId` / `turnId` / `itemId` of approval request could be obtained from `server_requests/server-request-0001.json`. After disconnecting, no request object, request id, or approval item id remained in `history/history-0006.json`.

## Turn IDs

- `turn1_id`: `019d4991-92a7-7490-8de5-379af03eb020`
- `turn2_id`: `019d4991-a2b8-7973-8de7-e511105cb39d`
- turn1 `status = completed`
- for `history/history-0003.json` and turn2 `status = inProgress` for `history/history-0005.json` and `history/history-0006.json`

The turn ID matched in stream and history, and the same turn ID could be reacquired even after reloading after disconnecting.

## Item IDs

- stream turn1 user message item id: `ca6d5e9c-619d-48af-a5c0-b63cbe607667`
- stream turn1 final agent message item id: `msg_0f2fec7daeeeb3340169cd339e18d88191ab853a1a3caf315e`
- stream turn2 user message item id: `b37069cd-083c-4312-a6e2-2f35a9321ee3`
- stream turn2 commentary agent message item id: `msg_0f2fec7daeeeb3340169cd33a491508191b23a5a721a1d7d52`
- stream approval item id: `call_F4qrZaXxwxCgxKezesJaS7bQ`
- history item ids after turn1: `item-1` (`userMessage`), `item-2` (`agentMessage`)
- history item ids after reload: `item-1` / `item-2` for turn1, `item-3` (`userMessage`) / `item-4` (`agentMessage` commentary) for turn2

The item id on the stream side and the item id on the history side did not match. In the history after disconnecting, message items could be reconstructed, but approval items were not materialized.

## Event IDs

- native `event_id`: `not observed`
- latest status Native key that could be used to reacquire: `thread.status.type = active`, `activeFlags = ["waitingOnApproval"]`

The unique key for notification is only up to method, line order, and request id in the approval system. I couldn't see any way to restore event identity after disconnect using only history.
