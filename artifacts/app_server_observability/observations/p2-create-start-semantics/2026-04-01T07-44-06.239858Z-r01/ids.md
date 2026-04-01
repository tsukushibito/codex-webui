# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-baseline-01`
- `thread_id`: `019d4800-6e58-7fe1-991b-b333453f8b47`
- native `request_id`: `unknown`
- observed `turn_id`: `none observed`

`thread_id` は `responses/response-0001.json` の `result.thread.id`、`stream/events.ndjson` の `thread/started.params.thread.id`、`responses/response-0003.json` の `result.thread.id` で一致した。

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `thread/read` with `includeTurns=true`
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read` with `includeTurns=false`

## Turn / Item Materialization

- `responses/response-0001.json`: `turns = []`
- `responses/response-0002.json`: error `includeTurns is unavailable before first user message`
- `responses/response-0003.json`: `turns = []`

このケースでは turn も item も一切 materialize されなかった。first user message 前に `includeTurns=true` で履歴を読むことはできなかった。

## Event IDs

- native `event_id`: `not observed`
- stream で観測できた method は `thread/started` と MCP startup status 更新だけだった
