# 判定メモ

## Case Info

- case_name: `p4-initial-history-only-load`
- observed_in_tasks_phase: `phase_4`
- run_key: `2026-04-01T17-37-18.207745Z-r01`
- executed_at_utc: `2026-04-01T17:37:18.205354Z`
- session_key: `sk-20260401-reconstruction-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d4a1e-fdcb-7f32-887c-78eedbf4d477`
- request_id: `0`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `server_requests/server-request-0001.json`, `stream/no-stream.md`, `history/history-0004.json`, `history/history-0005.json`
- summary: connection A で pending approval の thread を作成したあと、connection B では stream を一度も購読せず、初回から `thread/read(includeTurns=true)` のみを実行した。初回 read だけで turn1 completed messages と turn2 commentary message、`thread.status = active[waitingOnApproval]`、turn2 `status = inProgress` は再取得できた。一方、approval request payload、native `request_id`、approval `itemId` は history に materialize されず、approval resource 自体は初回 history-only load でも復元できなかった。

## Judgments

### `messages 再構築`

- 判定: 保留だが先行可
- 根拠: `history/history-0004.json` の初回 read だけで turn1 の `userMessage` / final `agentMessage` と、turn2 の `userMessage` / commentary `agentMessage` を再構築できた。
- 補足: `history/history-0005.json` でも同じ item 群が保持され、初回 load と再読込で message materialization は安定していた。
- 保留時のデフォルト判断: message resource は history 主体で再構築し、stream は delta 補助として扱う。

### `approvals 再構築`

- 判定: 不採用
- 根拠: `server_requests/server-request-0001.json` にあった approval request payload、native `request_id = 0`、approval `itemId = call_3Jc2EeQx5rkK9iaCD8MvJOgT` は `history/history-0004.json` と `history/history-0005.json` のどちらにも materialize されなかった。
- 補足: history-only load で分かるのは `thread.status = active[waitingOnApproval]` と turn2 `status = inProgress` までで、approval object 自体は復元できない。`p4-stream-disconnect-reload` と同じ結論になった。
- 保留時のデフォルト判断: approval resource は app runtime 側で stable key と payload snapshot を保持する前提にする。

### `latest status 推定`

- 判定: 保留だが先行可
- 根拠: connection B の初回 `thread/read` で `thread.status = active[waitingOnApproval]` と turn2 `status = inProgress` を再取得できた。
- 補足: pending approval object が無くても、latest status 自体は history-only 初回 load だけで推定できた。
- 保留時のデフォルト判断: latest status は `thread.status` と latest turn status から復元する。

### `ID 安定性一覧`

- 判定: 保留だが先行可
- 根拠: `thread_id` と `turn_id` は setup connection A と history-only connection B の間で一致した。一方 `approval_id = native request ID` と approval `itemId` は history で再取得できず、`message_id = native item ID` も history item ids だけでは最終方針を支えない。
- 補足: connection B では transport request id が再初期化されたため、client 側 JSON-RPC request id は stable key にならない。
- 保留時のデフォルト判断: `session_id = native thread ID` は採用寄り、`message_id` と `approval_id` は app-owned 補完前提のまま保留にする。

### `create / start semantics`

- 判定: 保留だが先行可
- 根拠: このケースでも `thread/start` は idle thread を作る create primitive で、実際の activity 開始は turn1 / turn2 の `turn/start` で起きた。initial history-only load の追加観測は Phase 2 の判断を覆していない。
- 補足: pending approval thread を別 connection から初回 read できても、native `session start` 相当の独立 primitive は観測していない。
- 保留時のデフォルト判断: `session start` は引き続き App-owned facade action 前提で進める。

### `sequence`

- 判定: 保留だが先行可
- 根拠: history では turn 順と item 配列順は取れるが、approval request 自体が欠落しているため stream 上の発生順を完全には再現できない。
- 補足: `history/history-0004.json` と `history/history-0005.json` の `updatedAt` はどちらも `1775065050` で変わらず、同一状態の再読込では timestamp も順序補助にならない。
- 保留時のデフォルト判断: `sequence` は app-owned で持つ前提にする。

### `event_id`

- 判定: 保留だが先行可
- 根拠: history-only 初回 load でも native `event_id` は露出せず、notification 単位の identity を復元する材料は見えなかった。
- 補足: 復元できたのは thread / turn / items / latest status までで、event identity は state から逆算できない。
- 保留時のデフォルト判断: `event_id` は app-owned 採番前提で進める。

### `signal / event 対応最終表`

- 判定: 保留だが先行可
- 根拠: `message.user` と `message.assistant.completed` 相当は history-only 初回 load でも追えるが、`approval.requested` は `server_requests/server-request-0001.json` にしか出てこない。
- 補足: `approval.resolved` と `error.raised` は今回のケースでは未発生。pending approval の存在は status からは分かるが、approval event 自体は再構築できない。
- 保留時のデフォルト判断: message 系は history 再構築可、approval 系は stream / runtime snapshot 前提で統合する。

### `app-owned 必須項目`

- 判定: 保留だが先行可
- 根拠: history-only 初回 load でも approval payload、`active_approval_id`、event stable key は消えており、native だけでは pending approval resource を公開用に復元できない。
- 補足: `preview` が latest turn ではなく turn1 prompt のまま残ったため、session overlay または app-owned preview 補正の必要性も未否定になった。
- 保留時のデフォルト判断: 少なくとも `active_approval_id`、approval payload snapshot、`sequence`、event stable key、必要なら session overlay を app-owned 必須候補として保持する。

### `timestamp / 順序補助`

- 判定: 不採用
- 根拠: `history/history-0004.json` と `history/history-0005.json` は `updatedAt = 1775065050` で同一、item 単位 timestamp も request / approval 専用 timestamp も無く、同一状態内の順序判定補助としては使えなかった。
- 補足: history 再取得時の thread-level `updatedAt` は latest state の再読込には使えても、event / item sequence の stable ordering source にはならない。
- 保留時のデフォルト判断: 順序は app-owned `sequence` を正本にし、timestamp は補助に留める。

## Open Questions

- pending approval request を history-only load から再構築できる別 native API があるか。
- `preview` が latest turn ではなく最初の prompt を保持する挙動を、公開 session summary で無視してよいか。
- resolved approval でも history-only 初回 load から resolution metadata を取れる経路があるか。

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`
- server_requests: `server_requests/server-request-0001.json`
- stream: `stream/no-stream.md`
- history: `history/history-0004.json`, `history/history-0005.json`
