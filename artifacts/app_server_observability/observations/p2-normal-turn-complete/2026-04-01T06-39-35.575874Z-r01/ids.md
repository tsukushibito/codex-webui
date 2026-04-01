# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-p2-normal-turn-complete-01`
- `thread_id`: `019d47c5-7968-7992-80f3-c6bb56e06bef`
- native `request_id`: `unknown`

`thread_id` は `responses/response-0001.json` の `result.thread.id`、`stream/events.ndjson` の `thread/started` / `thread/status/changed` / `turn/started` / `item/*` / `turn/completed`、`responses/response-0003.json` の `result.thread.id` で一致した。

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `turn/start`
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read`

## Turn IDs

- observed `turn_id`: `019d47c5-7a83-7730-98af-85618767ee29`
- source:
  - `responses/response-0002.json` の `result.turn.id`
  - `stream/events.ndjson` の `turn/started.params.turn.id`
  - `stream/events.ndjson` の `item/*` 各通知の `params.turnId`
  - `stream/events.ndjson` の `turn/completed.params.turn.id`
  - `responses/response-0003.json` の `result.thread.turns[0].id`

## Item IDs

- stream user message item id: `8f1b3f0a-9d9a-4513-8da8-d15a3d456953`
- stream reasoning item id: `rs_097661efcf21df110169ccbdd7250c8191bfbd65db3e7a9d7c`
- stream agent message item id: `msg_097661efcf21df110169ccbdd84bbc8191982a89d3ee40b58d`
- history user message item id: `item-1`
- history agent message item id: `item-2`

同一論理 message に見える item でも、stream 側 item id と history 側 item id が一致しなかった。`message_id = native item ID` の採用はこの case だけでも不安定である。

## Event IDs

- native `event_id`: `not observed`
- notification method は `stream/events.ndjson` の行順でのみ追跡できる
