# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-terminal-02`
- `thread_id`: `019d4984-0160-71f3-a4cb-764a7e596a5a`
- native `request_id`: `not observed`

approval 系 server request は発生しておらず、stream / history / response でも request-like native id は見えなかった。

## Transport Request Mapping

- `request-0001.json`: JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: JSON-RPC request id `3`, method `turn/start`
- `request-0003.json`: JSON-RPC request id `4`, method `thread/read` after command failure candidate
- `request-0004.json`: JSON-RPC request id `5`, method `thread/read` after turn completion

## Turn IDs

- `turn_id`: `019d4984-0359-7912-a0fb-fe40a06d6cf9`
- `responses/response-0002.json` では `status = inProgress`
- `history/history-0003.json` では `status = inProgress`
- `history/history-0004.json` では `status = completed`

`turn_id` は `responses/response-0002.json`、`stream/events.ndjson` の `turn/started` / `item/*` / `turn/completed`、`history/history-0003.json`、`history/history-0004.json` で一致した。

## Item IDs

- stream user message item id: `69d353d3-ec2c-4b7a-b5a3-fe990c3656d1`
- stream commentary agent message item id: `msg_0129119c917480620169cd302a8ae0819195c836b9e87460b1`
- stream command execution item id: `call_BbxAh1ihiP76Wt8BT93RQiyI`
- stream final agent message item id: `msg_0129119c917480620169cd3030b2088191af95fab70a4cf9e4`
- history pending item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` commentary)
- history final item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` commentary), `item-3` (`agentMessage` final_answer)

stream 側 item id と history 側 item id は今回も一致しなかった。failed `commandExecution` item は stream でのみ見え、history には materialize されなかった。

## Event IDs

- native `event_id`: `not observed`
- transient failure を識別できた native key: `item/completed` with `item.type = commandExecution`, `status = failed`, `exitCode = 42`

通知の一意キーは method と行順、および失敗 command execution では item id までしか取れていない。
