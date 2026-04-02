# ID Notes

## Session Grouping

- `session_key`: `sk-20260401-reconstruction-01`
- `thread_id`: `019d4991-9162-7b82-8804-b539df2d37b5`
- native `request_id`: `0`

`thread_id` は `responses/response-0001.json`、`responses/response-0003.json`、`responses/response-0005.json`、`responses/response-0006.json`、`server_requests/server-request-0001.json`、`stream/events.ndjson` で一致した。native `request_id` は pending approval request の `server_requests/server-request-0001.json` でのみ観測され、history reload では再取得できなかった。

## Transport Request Mapping

- `request-0001.json`: connection A, JSON-RPC request id `2`, method `thread/start`
- `request-0002.json`: connection A, JSON-RPC request id `3`, method `turn/start` for turn1
- `request-0003.json`: connection A, JSON-RPC request id `4`, method `thread/read` after turn1 completed
- `request-0004.json`: connection A, JSON-RPC request id `5`, method `turn/start` for turn2
- `request-0005.json`: connection A, JSON-RPC request id `6`, method `thread/read` while approval pending
- `request-0006.json`: connection B, JSON-RPC request id `2`, method `thread/read` after disconnect reload

transport request id は connection B で再初期化されたため、client 側の JSON-RPC request id は connection をまたぐ stable key にはならない。

## Approval Request IDs

- server request method: `item/commandExecution/requestApproval`
- server request id: `0`
- approval turn id: `019d4991-a2b8-7973-8de7-e511105cb39d`
- approval item id: `call_F4qrZaXxwxCgxKezesJaS7bQ`

approval request の `threadId` / `turnId` / `itemId` は `server_requests/server-request-0001.json` で取得できた。disconnect 後の `history/history-0006.json` には request object も request id も approval item id も残らなかった。

## Turn IDs

- `turn1_id`: `019d4991-92a7-7490-8de5-379af03eb020`
- `turn2_id`: `019d4991-a2b8-7973-8de7-e511105cb39d`
- `history/history-0003.json` では turn1 `status = completed`
- `history/history-0005.json` と `history/history-0006.json` では turn2 `status = inProgress`

turn id は stream と history で一致し、disconnect 後の reload でも同一 turn id を再取得できた。

## Item IDs

- stream turn1 user message item id: `ca6d5e9c-619d-48af-a5c0-b63cbe607667`
- stream turn1 final agent message item id: `msg_0f2fec7daeeeb3340169cd339e18d88191ab853a1a3caf315e`
- stream turn2 user message item id: `b37069cd-083c-4312-a6e2-2f35a9321ee3`
- stream turn2 commentary agent message item id: `msg_0f2fec7daeeeb3340169cd33a491508191b23a5a721a1d7d52`
- stream approval item id: `call_F4qrZaXxwxCgxKezesJaS7bQ`
- history item ids after turn1: `item-1` (`userMessage`), `item-2` (`agentMessage`)
- history item ids after reload: `item-1` / `item-2` for turn1, `item-3` (`userMessage`) / `item-4` (`agentMessage` commentary) for turn2

stream 側 item id と history 側 item id は一致しなかった。disconnect 後の history では message items は再構築できたが、approval item は materialize されなかった。

## Event IDs

- native `event_id`: `not observed`
- latest status 再取得に使えた native key: `thread.status.type = active`, `activeFlags = ["waitingOnApproval"]`

notification の一意キーは method と行順、および approval 系では request id までしか取れていない。disconnect 後に event identity を history だけで復元する方法は見えなかった。
