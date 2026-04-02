# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-terminal-01`
- `thread_id`: `019d4974-eb2b-7f70-b7ef-08c9f78d0540`
- native `request_id`: `not observed`

`thread_id` matched in all thread references of `responses/response-0001.json`, `responses/response-0003.json`, `responses/response-0005.json`, and `stream/events.ndjson`. Since no approval server request has occurred, native `request_id` is not observed in this case.

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `turn/start`
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read` while command execution running
- `request-0004.json`: JSON-RPC request id `5`, method `turn/interrupt`
- `request-0005.json`: JSON-RPC request id `6`, method `thread/read` after interrupt completion

## Turn IDs

- `turn_id`: `019d4974-ed89-7141-aeb4-71e525ad82a2`
- `status = inProgress`
- in `history/history-0003.json` `status = interrupted` in `history/history-0005.json`

`turn_id` is `responses/response-0002.json`, interrupt target in `requests/request-0004.json`, `turn/started` / `item/*` / in `stream/events.ndjson` Matched `turn/completed`, `history/history-0003.json`, `history/history-0005.json`.

## Item IDs

- stream user message item id: `b4fa6279-1b0e-4642-ac89-9d3b26aa362e`
- stream commentary agent message item id: `msg_0f79b5e5e815e48c0169cd2c4d10f48191b5ab92a0e6597791`
- stream command execution item id: `call_GiITlrOl0rz4A04ioOBotltK`
- stream final agent message item id: `none observed`
- history pending item ids: `item-1` (`userMessage`), `item-2` (`agentMessage`)
- history final item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` commentary)

The item id on the stream side and the item id on the history side did not match this time as well. `commandExecution` item was visible up to `started` in the stream, but `completed` after interrupt was not observed and was not materialized in history. The final `agentMessage` was also not generated.

## Event IDs

- native `event_id`: `not observed`
- Native key that could identify stop: `turn/interrupt` in `requests/request-0004.json` and `turn/completed.turn.status = interrupted` in `stream/events.ndjson`

The unique key for notifications only includes method and line order.
