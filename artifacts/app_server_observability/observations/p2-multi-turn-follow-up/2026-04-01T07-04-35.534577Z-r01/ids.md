# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-baseline-01`
- `thread_id`: `019d47dc-87a8-7af0-a53e-81cc548f9912`
- native `request_id`: `unknown`

`thread_id` は `responses/response-0001.json`、`responses/response-0003.json`、`responses/response-0005.json`、`stream/events.ndjson` の全 thread 通知で一致した。turn を跨いでも thread は再利用された。

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `turn/start` for turn1
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read` after turn1
- `request-0004.json`: JSON-RPC request id `5`, method `turn/start` for turn2
- `request-0005.json`: JSON-RPC request id `6`, method `thread/read` after turn2

## Turn IDs

- `turn1_id`: `019d47dc-897a-77e2-92a9-704c54136fdb`
- `turn2_id`: `019d47dc-cff5-7253-a09d-ee11d07e71f0`
- `history/history-0005.json` の `turns` 配列順は turn1, turn2 の順で、両方とも completed だった

turn1/turn2 の各 `turn_id` は `responses/response-0002.json` / `responses/response-0004.json`、`stream/events.ndjson` の `turn/started` / `item/*` / `turn/completed`、`history/history-0005.json` の `turns[*].id` で一致した。

## Item IDs

### turn1

- stream user message item id: `34d8cca1-9534-4b39-a2f4-d5c8b9409e6e`
- stream agent message item id: `msg_0551705b29e8004b0169ccc3ca74bc81919f8150ecb794e195`
- history user message item id: `item-1`
- history agent message item id: `item-2`

### turn2

- stream user message item id: `85ffb15f-24ee-4e98-b942-ab6296027bbb`
- stream agent message item id: `msg_0551705b29e8004b0169ccc3cf81888191b15a897e6985dc9d`
- history user message item id: `item-3`
- history agent message item id: `item-4`

2 turn とも、stream 側 item id と history 側 item id は一致しなかった。history では `item-1` からの通し番号に見える。

## Event IDs

- native `event_id`: `not observed`
- 通知の一意キーは method と行順しか取れていない
