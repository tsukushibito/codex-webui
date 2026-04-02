# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-reconstruction-01`
- `thread_id`: `019d4a1e-fdcb-7f32-887c-78eedbf4d477`
- native `request_id`: `0`

`thread_id` matched in `responses/response-0001.json`, `server_requests/server-request-0001.json`, `responses/response-0004.json`, and `responses/response-0005.json`. Native `request_id` was observed only in `server_requests/server-request-0001.json` of pending approval request and could not be retrieved again in history-only load.

## Transport Request Mapping

- `request-0001.json`: connection A, JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: connection A, JSON-RPC request id `3`, method `turn/start` for turn1
- `request-0003.json`: connection A, JSON-RPC request id `4`, method `turn/start` for turn2
- `request-0004.json`: connection B, JSON-RPC request id `2`, method `thread/read` first history-only load
- `request-0005.json`: connection B, JSON-RPC request id `3`, method `thread/read` repeat history-only load

Because the transport request id was reinitialized in connection B, the JSON-RPC request id on the client side does not become a stable key across connections.

## Approval Request IDs

- server request method: `item/commandExecution/requestApproval`
- server request id: `0`
- approval turn id: `019d4a1f-194e-7ce1-95e8-1899657b9ace`
- approval item id: `call_3Jc2EeQx5rkK9iaCD8MvJOgT`

`threadId` / `turnId` / `itemId` of approval request could be obtained from `server_requests/server-request-0001.json`. No request object, request id, or approval item id remained in `history/history-0004.json` and `history/history-0005.json`.

## Turn IDs

- `turn1_id`: `019d4a1f-0170-7493-99cb-01de77beda2c`
- `turn2_id`: `019d4a1f-194e-7ce1-95e8-1899657b9ace`
- `history/history-0004.json` Then turn1 `status = completed`, turn2 `status = inProgress`
- `history/history-0005.json` But turn1 `status = completed`, turn2 `status = inProgress`

The turn id matched in `responses/response-0002.json` / `responses/response-0003.json` of setup connection A and `history/history-0004.json` / `history/history-0005.json` of history-only load.

## Item IDs

- history turn1 item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` final)
- history turn2 item ids: `item-3` (`userMessage`), `item-4` (`agentMessage` commentary)
- Could not reacquire with history-only load item: approval item `call_3Jc2EeQx5rkK9iaCD8MvJOgT`

With history-only load, message items could be reacquired stably, but approval items were not materialized. `message_id = native item ID` still has the problem of inconsistency with the stream side, so it cannot be used as a basis for adoption this time.

## Event IDs

- native `event_id`: `not observed`
- native key that could be used to re-obtain latest status: `thread.status.type = active`, `activeFlags = ["waitingOnApproval"]`
- timestamp-ish field seen on thread snapshots: `updatedAt = 1775065050` for both `history-0004` and `history-0005`

history-only The event identity did not remain even after the first load. `updatedAt` does not change when reloading the same state, and does not become a stable key in the event order.
