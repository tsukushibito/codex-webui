# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-baseline-01`
- `thread_id`: `019d4800-6e58-7fe1-991b-b333453f8b47`
- native `request_id`: `unknown`
- observed `turn_id`: `none observed`

`thread_id` matched with `result.thread.id` of `responses/response-0001.json`, `thread/started.params.thread.id` of `stream/events.ndjson`, and `result.thread.id` of `responses/response-0003.json`.

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `thread/read` with `includeTurns=true`
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read` with `includeTurns=false`

## Turn / Item Materialization

- `responses/response-0001.json`: `turns = []`
- `responses/response-0002.json`: error `includeTurns is unavailable before first user message`
- `responses/response-0003.json`: `turns = []`

In this case, neither turn nor item was materialized at all. It was not possible to read the history with `includeTurns=true` before the first user message.

## Event IDs

- native `event_id`: `not observed`
- The only methods observed in stream were `thread/started` and MCP startup status update.
