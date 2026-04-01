# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-approval-01`
- `thread_id`: `019d48ce-933a-7a70-bab8-1caaae131711`
- native `request_id`: `0`

`thread_id` は `responses/response-0001.json`、`responses/response-0003.json`、`responses/response-0004.json`、`server_requests/server-request-0001.json`、`stream/events.ndjson` の全 thread 参照で一致した。native `request_id` は `server_requests/server-request-0001.json` の top-level `id = 0` と、`stream/events.ndjson` の `serverRequest/resolved.params.requestId = 0` で一致した。

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

approval request の `threadId` / `turnId` / `itemId` は `server_requests/server-request-0001.json` で取得できた。解決時は `serverRequest/resolved` が `requestId` だけを返し、resolution enum や timestamp は含まなかった。

## Turn IDs

- `turn_id`: `019d48ce-9490-7891-97a0-d41691531ba1`
- `history/history-0003.json` では `status = inProgress`
- `history/history-0004.json` では `status = completed`

`turn_id` は `responses/response-0002.json`、`server_requests/server-request-0001.json`、`stream/events.ndjson` の `turn/started` / `item/*` / `turn/completed`、`history/history-0003.json`、`history/history-0004.json` で一致した。

## Item IDs

- stream user message item id: `d1518172-7951-456d-87e6-b7529ef957a0`
- stream commentary agent message item id: `msg_04401d01cb60348b0169cd01b4e5548191b92b04853430ffbb`
- stream command execution item id: `call_fS7O1ZAIvR6XxfJdOFWEisk7`
- stream final agent message item id: `msg_04401d01cb60348b0169cd01bb77f48191a723217078c8e2b0`
- history pending item ids: `item-1` (`userMessage`), `item-2` (`agentMessage`)
- history final item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` commentary), `item-3` (`agentMessage` final_answer)

stream 側 item id と history 側 item id は今回も一致しなかった。approval request の `itemId` は `commandExecution` item の id と一致したが、history には command execution item も approval item も materialize されなかった。

## Event IDs

- native `event_id`: `not observed`
- approval 解決を識別できた native key: `serverRequest/resolved.params.requestId = 0`

通知の一意キーは method と行順、および approval 系では `requestId` までしか取れていない。
