# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-reconstruction-01`
- `thread_id`: `019d4a1e-fdcb-7f32-887c-78eedbf4d477`
- native `request_id`: `0`

`thread_id` は `responses/response-0001.json`、`server_requests/server-request-0001.json`、`responses/response-0004.json`、`responses/response-0005.json` で一致した。native `request_id` は pending approval request の `server_requests/server-request-0001.json` でのみ観測され、history-only load では再取得できなかった。

## Transport Request Mapping

- `request-0001.json`: connection A, JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: connection A, JSON-RPC request id `3`, method `turn/start` for turn1
- `request-0003.json`: connection A, JSON-RPC request id `4`, method `turn/start` for turn2
- `request-0004.json`: connection B, JSON-RPC request id `2`, method `thread/read` first history-only load
- `request-0005.json`: connection B, JSON-RPC request id `3`, method `thread/read` repeat history-only load

transport request id は connection B で再初期化されたため、client 側の JSON-RPC request id は connection をまたぐ stable key にはならない。

## Approval Request IDs

- server request method: `item/commandExecution/requestApproval`
- server request id: `0`
- approval turn id: `019d4a1f-194e-7ce1-95e8-1899657b9ace`
- approval item id: `call_3Jc2EeQx5rkK9iaCD8MvJOgT`

approval request の `threadId` / `turnId` / `itemId` は `server_requests/server-request-0001.json` で取得できた。`history/history-0004.json` と `history/history-0005.json` には request object も request id も approval item id も残らなかった。

## Turn IDs

- `turn1_id`: `019d4a1f-0170-7493-99cb-01de77beda2c`
- `turn2_id`: `019d4a1f-194e-7ce1-95e8-1899657b9ace`
- `history/history-0004.json` では turn1 `status = completed`, turn2 `status = inProgress`
- `history/history-0005.json` でも turn1 `status = completed`, turn2 `status = inProgress`

turn id は setup connection A の `responses/response-0002.json` / `responses/response-0003.json` と history-only load の `history/history-0004.json` / `history/history-0005.json` で一致した。

## Item IDs

- history turn1 item ids: `item-1` (`userMessage`), `item-2` (`agentMessage` final)
- history turn2 item ids: `item-3` (`userMessage`), `item-4` (`agentMessage` commentary)
- history-only load で再取得できなかった item: approval item `call_3Jc2EeQx5rkK9iaCD8MvJOgT`

history-only load では message items は安定して再取得できたが、approval item は materialize されなかった。`message_id = native item ID` は stream 側との不一致問題が残るため、今回も採用根拠にはならない。

## Event IDs

- native `event_id`: `not observed`
- latest status 再取得に使えた native key: `thread.status.type = active`, `activeFlags = ["waitingOnApproval"]`
- timestamp-ish field seen on thread snapshots: `updatedAt = 1775065050` for both `history-0004` and `history-0005`

history-only 初回 load でも event identity は残らなかった。`updatedAt` は同一状態の再読込で変化せず、event 順序の stable key にはならない。
