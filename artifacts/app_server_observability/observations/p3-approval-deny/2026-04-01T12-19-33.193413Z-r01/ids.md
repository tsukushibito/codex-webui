# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-approval-01`
- `thread_id`: `019d48fc-1517-71f2-acda-cf234456602f`
- native `request_id`: `1`

`thread_id` は `responses/response-0001.json`、`responses/response-0003.json`、`responses/response-0004.json`、`server_requests/server-request-0001.json`、`stream/events.ndjson` の全 thread 参照で一致した。native `request_id` は `server_requests/server-request-0001.json` の top-level `id = 1` と、`stream/events.ndjson` の `serverRequest/resolved.params.requestId = 1` で一致した。

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

approval request の `threadId` / `turnId` / `itemId` は `server_requests/server-request-0001.json` で取得できた。解決時は `serverRequest/resolved` が `requestId` だけを返し、resolution enum や timestamp は含まなかった。

## Turn IDs

- `turn_id`: `019d48fc-1674-7de2-bc3b-1588bf942ed4`
- `history/history-0003.json` では `status = inProgress`
- `history/history-0004.json` では `status = interrupted`

`turn_id` は `responses/response-0002.json`、`server_requests/server-request-0001.json`、`stream/events.ndjson` の `turn/started` / `item/*` / `turn/completed`、`history/history-0003.json`、`history/history-0004.json` で一致した。

## Item IDs

- stream user message item id: `0b6ffd1a-dac4-44d0-a88f-8bf1f27dce9a`
- stream commentary agent message item id: `msg_0e9098db8bcf2fb20169cd0d5ac0448191aaaa1ec2db329751`
- stream command execution item id: `call_i3ouzaxznOn0mrx62Xxj1eHW`
- stream final agent message item id: `none observed`
- history pending item ids: `item-1` (`userMessage`), `item-2` (`agentMessage`)
- history final item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` commentary)

stream 側 item id と history 側 item id は今回も一致しなかった。approval request の `itemId` は `commandExecution` item の id と一致したが、history には command execution item も approval item も materialize されなかった。deny 後は final `agentMessage` も materialize されなかった。

## Event IDs

- native `event_id`: `not observed`
- approval 解決を識別できた native key: `serverRequest/resolved.params.requestId = 1`

通知の一意キーは method と行順、および approval 系では `requestId` までしか取れていない。
