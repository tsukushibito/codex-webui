# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-baseline-01`
- `thread_id`: `019d47dc-87a8-7af0-a53e-81cc548f9912`
- native `request_id`: `unknown`

`thread_id` matched in all thread notifications of `responses/response-0001.json`, `responses/response-0003.json`, `responses/response-0005.json`, and `stream/events.ndjson`. Threads were reused even across turns.

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `turn/start` for turn1
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read` after turn1
- `request-0004.json`: JSON-RPC request id `5`, method `turn/start` for turn2
- `request-0005.json`: JSON-RPC request id `6`, method `thread/read` after turn2

## Turn IDs

- `turn1_id`: `019d47dc-897a-77e2-92a9-704c54136fdb`
- `turn2_id`: `019d47dc-cff5-7253-a09d-ee11d07e71f0`
- The `turns` array order of `history/history-0005.json` was turn1, turn2, both of which were completed.

Each `turn_id` of turn1/turn2 is `responses/response-0002.json` / `responses/response-0004.json`, `turn/started` / `item/*` / `turn/completed` of `stream/events.ndjson`, and `history/history-0005.json`. Matched with `turns[*].id`.

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

In both turns, the item id on the stream side and the item id on the history side did not match. In history, it looks like a serial number starting from `item-1`.

## Event IDs

- native `event_id`: `not observed`
- Unique key of notification has only method and line order
