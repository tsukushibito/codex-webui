# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-approval-01`
- `thread_id`: `019d496f-b79a-7412-95c7-596844f5c2a6`
- native `request_id`: `0`

`thread_id` は `responses/response-0001.json`、`responses/response-0003.json`、`responses/response-0005.json`、`server_requests/server-request-0001.json`、`stream/events.ndjson` の全 thread 参照で一致した。native `request_id` は `server_requests/server-request-0001.json` の top-level `id = 0` と、`stream/events.ndjson` の `serverRequest/resolved.params.requestId = 0` で一致した。

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `turn/start`
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read` while approval pending
- `request-0004.json`: JSON-RPC request id `5`, method `turn/interrupt`
- `request-0005.json`: JSON-RPC request id `6`, method `thread/read` after interrupt completion

## Server-Initiated Approval Mapping

- `server-request-0001.json`: server initiated JSON-RPC request id `0`, method `item/commandExecution/requestApproval`
- `server-response`: `none observed`

approval pending 中に `turn/interrupt` を送ったため、approve / deny と違って client reply to server request は存在しなかった。

## Approval Request IDs

- server request method: `item/commandExecution/requestApproval`
- server request id: `0`
- approval turn id: `019d496f-b951-7d81-b7e2-8e6ccd898d74`
- approval item id: `call_1aV1K63PKowbIUOcu6BkPqhU`

approval request の `threadId` / `turnId` / `itemId` は `server_requests/server-request-0001.json` で取得できた。解決時は `serverRequest/resolved` が `requestId` だけを返し、resolution enum や timestamp は含まなかった。

## Turn IDs

- `turn_id`: `019d496f-b951-7d81-b7e2-8e6ccd898d74`
- `history/history-0003.json` では `status = inProgress`
- `history/history-0005.json` では `status = interrupted`

`turn_id` は `responses/response-0002.json`、`server_requests/server-request-0001.json`、`requests/request-0004.json` の interrupt target、`stream/events.ndjson` の `turn/started` / `item/*` / `turn/completed`、`history/history-0003.json`、`history/history-0005.json` で一致した。

## Item IDs

- stream user message item id: `61b38eea-1fc8-445f-9622-1c2305c47ad7`
- stream commentary agent message item id: `msg_04283e6035b54e510169cd2af8c738819183e9aa4cbe3d59e0`
- stream approval item id: `call_1aV1K63PKowbIUOcu6BkPqhU`
- stream final agent message item id: `none observed`
- stream command execution item lifecycle: `none observed after approval request`
- history pending item ids: `item-1` (`userMessage`), `item-2` (`agentMessage`)
- history final item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` commentary)

stream 側 item id と history 側 item id は今回も一致しなかった。approval request の `itemId` は request payload でのみ見え、interrupt 後に `commandExecution` item の started/completed は流れず、history にも materialize されなかった。

## Event IDs

- native `event_id`: `not observed`
- approval 解決を識別できた native key: `serverRequest/resolved.params.requestId = 0`

通知の一意キーは method と行順、および approval 系では `requestId` までしか取れていない。
