# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-approval-01`
- `thread_id`: `019d48ce-933a-7a70-bab8-1caaae131711`
- native `request_id`: `0`

`thread_id` matched in all thread references of `responses/response-0001.json`, `responses/response-0003.json`, `responses/response-0004.json`, `server_requests/server-request-0001.json`, and `stream/events.ndjson`. Native `request_id` matched with top-level `id = 0` in `server_requests/server-request-0001.json` and `serverRequest/resolved.params.requestId = 0` in `stream/events.ndjson`.

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `turn/start`
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read` while approval pending
- `request-0004.json`: JSON-RPC request id `5`, method `thread/read` after approval resolve and turn completion

## Server-Initiated Approval Mapping

- `server-request-0001.json`: server initiated JSON-RPC request id `0`, method `item/commandExecution/requestApproval`
- `server-response-0001.json`: client reply to server request id `0`, result `decision = accept`

## Approval Request IDs

- server request method: `item/commandExecution/requestApproval`
- server request id: `0`
- approval turn id: `019d48ce-9490-7891-97a0-d41691531ba1`
- approval item id: `call_fS7O1ZAIvR6XxfJdOFWEisk7`

`threadId` / `turnId` / `itemId` of approval request could be obtained from `server_requests/server-request-0001.json`. When resolved, `serverRequest/resolved` returned only the `requestId` and did not include the resolution enum or timestamp.

## Turn IDs

- `turn_id`: `019d48ce-9490-7891-97a0-d41691531ba1`
- `status = inProgress`
- in `history/history-0003.json` `status = completed` in `history/history-0004.json`

`turn_id` is `turn/started` / `item/*` / in `responses/response-0002.json`, `server_requests/server-request-0001.json`, `stream/events.ndjson` Matched `turn/completed`, `history/history-0003.json`, `history/history-0004.json`.

## Item IDs

- stream user message item id: `d1518172-7951-456d-87e6-b7529ef957a0`
- stream commentary agent message item id: `msg_04401d01cb60348b0169cd01b4e5548191b92b04853430ffbb`
- stream command execution item id: `call_fS7O1ZAIvR6XxfJdOFWEisk7`
- stream final agent message item id: `msg_04401d01cb60348b0169cd01bb77f48191a723217078c8e2b0`
- history pending item ids: `item-1` (`userMessage`), `item-2` (`agentMessage`)
- history final item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` commentary), `item-3` (`agentMessage` final_answer)

The item id on the stream side and the item id on the history side did not match this time as well. The `itemId` of the approval request matched the id of the `commandExecution` item, but neither the command execution item nor the approval item was materialized in the history.

## Event IDs

- native `event_id`: `not observed`
- approval Resolution could be identified native key: `serverRequest/resolved.params.requestId = 0`

The unique keys for notifications are only method, line order, and `requestId` in the approval system.
