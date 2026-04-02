# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-baseline-01`
- `thread_id`: `019d4816-6ff1-7ca3-927f-4779c96544ff`
- `turn_id`: `019d4816-71b6-7641-bb18-47987b41599e`
- native `request_id`: `unknown`

`thread_id` matched in `responses/response-0001.json`, thread notification in `stream/events.ndjson`, and `result.thread.id` in `responses/response-0003.json`. `turn_id` matched in `responses/response-0002.json`, stream item notification, and `turn/completed`.

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `turn/start`
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read`

## Item IDs

- stream user message item id: `70a8486a-91e4-4875-a3ed-02a390726f59`
- stream reasoning item id: `rs_06029f294800b8850169ccd28eeeb481918af10806d7a80586`
- stream commandExecution item id: `call_VHgqnzrhv3hv63ZV7BE72cAp`
- stream empty agentMessage item id: `msg_06029f294800b8850169ccd294794481919f5b4cdff313aaef`
- history user message item id: `item-1`
- history assistant message item id: `none observed`

`agentMessage` started/completed appeared on the stream, but `text` was an empty string. The agentMessage item itself did not exist in the history of `thread/read`.

## Message Projection Exclusion Note

- `commandExecution` item is a candidate for exclusion in message projection 
- The empty string `agentMessage` is also not materialized in history, so it is a candidate for exclusion in public message projection.

## Event IDs

- native `event_id`: `not observed`
- Unique key of notification has only method and line order
