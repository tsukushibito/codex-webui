# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-approval-01`
- `thread_id`: `019d496f-b79a-7412-95c7-596844f5c2a6`
- native `request_id`: `0`

`thread_id` matched in all thread references of `responses/response-0001.json`, `responses/response-0003.json`, `responses/response-0005.json`, `server_requests/server-request-0001.json`, and `stream/events.ndjson`. Native `request_id` matched with top-level `id = 0` in `server_requests/server-request-0001.json` and `serverRequest/resolved.params.requestId = 0` in `stream/events.ndjson`.

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `turn/start`
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read` while approval pending
- `request-0004.json`: JSON-RPC request id `5`, method `turn/interrupt`
- `request-0005.json`: JSON-RPC request id `6`, method `thread/read` after interrupt completion

## Server-Initiated Approval Mapping

- `server-request-0001.json`: server initiated JSON-RPC request id `0`, method `item/commandExecution/requestApproval`
- `server-response`: `none observed`

Since `turn/interrupt` was sent during approval pending, there was no client reply to server request unlike approve/deny.

## Approval Request IDs

- server request method: `item/commandExecution/requestApproval`
- server request id: `0`
- approval turn id: `019d496f-b951-7d81-b7e2-8e6ccd898d74`
- approval item id: `call_1aV1K63PKowbIUOcu6BkPqhU`

`threadId` / `turnId` / `itemId` of approval request could be obtained from `server_requests/server-request-0001.json`. When resolved, `serverRequest/resolved` returned only the `requestId` and did not include the resolution enum or timestamp.

## Turn IDs

- `turn_id`: `019d496f-b951-7d81-b7e2-8e6ccd898d74`
- `status = inProgress`
- in `history/history-0003.json` `status = interrupted` in `history/history-0005.json`

`turn_id` is `responses/response-0002.json`, `server_requests/server-request-0001.json`, interrupt target of `requests/request-0004.json`, `turn/started` / `item/*` / of `stream/events.ndjson` Matched `turn/completed`, `history/history-0003.json`, `history/history-0005.json`.

## Item IDs

- stream user message item id: `61b38eea-1fc8-445f-9622-1c2305c47ad7`
- stream commentary agent message item id: `msg_04283e6035b54e510169cd2af8c738819183e9aa4cbe3d59e0`
- stream approval item id: `call_1aV1K63PKowbIUOcu6BkPqhU`
- stream final agent message item id: `none observed`
- stream command execution item lifecycle: `none observed after approval request`
- history pending item ids: `item-1` (`userMessage`), `item-2` (`agentMessage`)
- history final item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` commentary)

The item id on the stream side and the item id on the history side did not match this time as well. The `itemId` of the approval request was visible only in the request payload, and the started/completed of the `commandExecution` item did not flow after the interrupt, nor was it materialized in the history.

## Event IDs

- native `event_id`: `not observed`
- approval Resolution could be identified native key: `serverRequest/resolved.params.requestId = 0`

The unique keys for notifications are only method, line order, and `requestId` in the approval system.
