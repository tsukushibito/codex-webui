# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-terminal-01`
- `thread_id`: `019d4974-eb2b-7f70-b7ef-08c9f78d0540`
- native `request_id`: `not observed`

`thread_id` は `responses/response-0001.json`、`responses/response-0003.json`、`responses/response-0005.json`、`stream/events.ndjson` の全 thread 参照で一致した。approval 系 server request は発生していないため、native `request_id` は今回の case では観測していない。

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `turn/start`
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read` while command execution running
- `request-0004.json`: JSON-RPC request id `5`, method `turn/interrupt`
- `request-0005.json`: JSON-RPC request id `6`, method `thread/read` after interrupt completion

## Turn IDs

- `turn_id`: `019d4974-ed89-7141-aeb4-71e525ad82a2`
- `history/history-0003.json` では `status = inProgress`
- `history/history-0005.json` では `status = interrupted`

`turn_id` は `responses/response-0002.json`、`requests/request-0004.json` の interrupt target、`stream/events.ndjson` の `turn/started` / `item/*` / `turn/completed`、`history/history-0003.json`、`history/history-0005.json` で一致した。

## Item IDs

- stream user message item id: `b4fa6279-1b0e-4642-ac89-9d3b26aa362e`
- stream commentary agent message item id: `msg_0f79b5e5e815e48c0169cd2c4d10f48191b5ab92a0e6597791`
- stream command execution item id: `call_GiITlrOl0rz4A04ioOBotltK`
- stream final agent message item id: `none observed`
- history pending item ids: `item-1` (`userMessage`), `item-2` (`agentMessage`)
- history final item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` commentary)

stream 側 item id と history 側 item id は今回も一致しなかった。`commandExecution` item は stream で `started` までは見えたが、interrupt 後の `completed` は観測されず、history にも materialize されなかった。final `agentMessage` も生成されなかった。

## Event IDs

- native `event_id`: `not observed`
- stop を識別できた native key: `requests/request-0004.json` の `turn/interrupt` と、`stream/events.ndjson` の `turn/completed.turn.status = interrupted`

通知の一意キーは method と行順までしか取れていない。
