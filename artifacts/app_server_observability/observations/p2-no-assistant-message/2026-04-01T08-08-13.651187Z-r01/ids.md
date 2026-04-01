# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-baseline-01`
- `thread_id`: `019d4816-6ff1-7ca3-927f-4779c96544ff`
- `turn_id`: `019d4816-71b6-7641-bb18-47987b41599e`
- native `request_id`: `unknown`

`thread_id` は `responses/response-0001.json`、`stream/events.ndjson` の thread 系通知、`responses/response-0003.json` の `result.thread.id` で一致した。`turn_id` は `responses/response-0002.json`、stream の item 通知、`turn/completed` で一致した。

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

stream 上では `agentMessage` started/completed が出たが、`text` は空文字だった。`thread/read` の history には agentMessage item 自体が存在しなかった。

## Message Projection Exclusion Note

- `commandExecution` item は message projection 対象外候補
- 空文字の `agentMessage` も history に materialize されていないため、公開 message projection では除外候補

## Event IDs

- native `event_id`: `not observed`
- 通知の一意キーは method と行順しか取れていない
