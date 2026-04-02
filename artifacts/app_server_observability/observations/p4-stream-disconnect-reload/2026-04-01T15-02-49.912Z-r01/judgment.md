# 判定メモ

## Case Info

- case_name: `p4-stream-disconnect-reload`
- observed_in_tasks_phase: `phase_4`
- run_key: `2026-04-01T15-02-49.912Z-r01`
- executed_at_utc: `2026-04-01T15:02:49.912Z`
- session_key: `sk-20260401-reconstruction-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d4991-9162-7b82-8804-b539df2d37b5`
- request_id: `0`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `requests/request-0006.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `responses/response-0006.json`, `server_requests/server-request-0001.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0005.json`, `history/history-0006.json`
- summary: turn1 completed と turn2 pending approval を stream で観測したあと、approval reply を返さずに stream connection を切断した。新しい connection B から `thread/read(includeTurns=true)` だけを行うと、messages と `thread.status = active[waitingOnApproval]`、turn2 `status = inProgress` は再取得できた。一方、approval request payload、native request id、approval item id は history に materialize されず、approval resource 自体は復元できなかった。

## Judgments

### `messages 再構築`

- 判定: 保留だが先行可
- 根拠: `history/history-0006.json` だけで turn1 の `userMessage` / final `agentMessage`、turn2 の `userMessage` / commentary `agentMessage` を復元できた。
- 補足: disconnect 前の `history/history-0005.json` と reload 後の `history/history-0006.json` は message 群について同形だった。
- 保留時のデフォルト判断: message resource は history 主体で再構築し、stream は delta 補助として扱う。

### `approvals 再構築`

- 判定: 不採用
- 根拠: `server_requests/server-request-0001.json` にあった approval request payload、native `request_id = 0`、approval `itemId` は `history/history-0005.json` と `history/history-0006.json` のどちらにも materialize されなかった。
- 補足: history 側で分かるのは `thread.status = active[waitingOnApproval]` と turn2 `status = inProgress` までで、approval object 自体は復元できない。
- 保留時のデフォルト判断: approval resource は app runtime 側で stable key と payload snapshot を保持する前提にする。

### `latest status 推定`

- 判定: 保留だが先行可
- 根拠: disconnect 前の `history/history-0005.json` と reload 後の `history/history-0006.json` の両方で `thread.status = active[waitingOnApproval]` を再取得できた。
- 補足: pending approval object は無くても、latest status は history だけで再推定できた。
- 保留時のデフォルト判断: latest status は `thread.status` と latest turn status から復元する。

### `ID 安定性一覧`

- 判定: 保留だが先行可
- 根拠: `thread_id` と `turn_id` は disconnect をまたいでも history reload で再取得できた。一方 `message_id = native item ID` は stream/history で不一致、`approval_id = native request ID` は history で再取得できない。
- 補足: connection B で transport request id が再初期化されたため、JSON-RPC request id は stable key にならない。
- 保留時のデフォルト判断: `session_id = native thread ID` は採用寄り、`message_id` と `approval_id` は app-owned 補完前提のまま保留にする。

### `sequence`

- 判定: 保留だが先行可
- 根拠: history では item 配列順は取れるが、approval request 自体が欠落し、stream 上の event sequence を完全には再現できない。
- 補足: `history/history-0006.json` だけでは turn2 commentary の後に approval request が来た事実を順序つきで復元できない。
- 保留時のデフォルト判断: `sequence` は app-owned で持つ前提にする。

### `event_id`

- 判定: 保留だが先行可
- 根拠: native `event_id` は今回も露出せず、disconnect 後の history から event identity を再構築する方法も見えなかった。
- 補足: 復元できたのは state と items までで、stream notification 単位の identity は残らない。
- 保留時のデフォルト判断: `event_id` は app-owned 採番前提で進める。

### `signal / event 対応最終表`

- 判定: 保留だが先行可
- 根拠: `message.user` と `message.assistant.completed` は history reload でも追えるが、`approval.requested` は stream の `item/commandExecution/requestApproval` にしか出てこない。
- 補足: `error.raised` は今回のケースでは対象外。`approval.resolved` も未発生。
- 保留時のデフォルト判断: message 系は history 再構築可、approval 系は stream / runtime snapshot 前提で統合する。

### `app-owned 必須項目`

- 判定: 保留だが先行可
- 根拠: history だけでは approval payload と request stable key が消えるため、少なくとも `active_approval_id`、approval payload snapshot、`sequence`、event stable key は native だけで賄えない。
- 補足: `workspace_id`、session overlay、idempotency key の必要性自体は今回のケースでは未否定だが、最終列挙は `p4-initial-history-only-load` と合わせて行う方が安全。
- 保留時のデフォルト判断: approval / event / sequence の欠落を埋める app-owned 項目を必須候補として保持する。

## Open Questions

- `p4-initial-history-only-load` でも pending approval status と message 群が同じ形で復元できるか。
- `preview` が latest turn ではなく turn1 prompt のまま残る挙動を、再構築材料として無視してよいか。
- approval pending 中の reload 後に、別経路で request metadata を取れる native API があるか。

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `requests/request-0006.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `responses/response-0006.json`
- server_requests: `server_requests/server-request-0001.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0005.json`, `history/history-0006.json`
