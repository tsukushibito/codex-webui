# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-approval-01`
- `thread_id`: `019d48fc-1517-71f2-acda-cf234456602f`
- native `request_id`: `1`

`thread_id` matched in all thread references of `responses/response-0001.json`, `responses/response-0003.json`, `responses/response-0004.json`, `server_requests/server-request-0001.json`, and `stream/events.ndjson`. Native `request_id` matched with top-level `id = 1` in `server_requests/server-request-0001.json` and `serverRequest/resolved.params.requestId = 1` in `stream/events.ndjson`.

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `turn/start`
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read` while approval pending
- `request-0004.json`: JSON-RPC request id `5`, method `thread/read` after approval resolve and turn completion

## Server-Initiated Approval Mapping

- `server-request-0001.json`: server initiated JSON-RPC request id `1`, method `item/commandExecution/requestApproval`
- `server-response-0001.json`: client reply to server request id `1`, result `decision = cancel`

## Approval Request IDs

- server request method: `item/commandExecution/requestApproval`
- server request id: `1`
- approval turn id: `019d48fc-1674-7de2-bc3b-1588bf942ed4`
- approval item id: `call_i3ouzaxznOn0mrx62Xxj1eHW`

`threadId` / `turnId` / `itemId` of approval request could be obtained from `server_requests/server-request-0001.json`. When resolved, `serverRequest/resolved` returned only the `requestId` and did not include the resolution enum or timestamp.

## Turn IDs

- `turn_id`: `019d48fc-1674-7de2-bc3b-1588bf942ed4`
- `status = inProgress`
- in `history/history-0003.json` `status = interrupted` in `history/history-0004.json`

`turn_id` is `turn/started` / `item/*` / in `responses/response-0002.json`, `server_requests/server-request-0001.json`, `stream/events.ndjson` Matched `turn/completed`, `history/history-0003.json`, `history/history-0004.json`.

## Item IDs

- stream user message item id: `0b6ffd1a-dac4-44d0-a88f-8bf1f27dce9a`
- stream commentary agent message item id: `msg_0e9098db8bcf2fb20169cd0d5ac0448191aaaa1ec2db329751`
- stream command execution item id: `call_i3ouzaxznOn0mrx62Xxj1eHW`
- stream final agent message item id: `none observed`
- history pending item ids: `item-1` (`userMessage`), `item-2` (`agentMessage`)
- history final item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` commentary)

The item id on the stream side and the item id on the history side did not match this time as well. The `itemId` of the approval request matched the id of the `commandExecution` item, but neither the command execution item nor the approval item was materialized in the history. After deny, final `agentMessage` was not materialized either.

## Event IDs

- native `event_id`: `not observed`
- approval resolution could be identified native key: `serverRequest/resolved.params.requestId = 1`

The unique keys for notifications are only method, line order, and `requestId` in the approval system.
