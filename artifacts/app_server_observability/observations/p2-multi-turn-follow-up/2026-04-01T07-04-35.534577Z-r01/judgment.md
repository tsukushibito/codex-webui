# 判定メモ

## Case Info

- case_name: `p2-multi-turn-follow-up`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T07-04-35.534577Z-r01`
- executed_at_utc: `2026-04-01T07:04:35.534577Z`
- session_key: `sk-20260401-baseline-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.117.0`
- thread_id: `019d47dc-87a8-7af0-a53e-81cc548f9912`
- request_id: `unknown`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0005.json`
- summary: 同一 thread で 2 turn を完了できた。follow-up user message でも `thread_id` は再利用され、`thread/status/changed` は `active -> idle -> active -> idle` で遷移した。message item id の stream/history 不一致は 2 turn 目でも再現した。

## Judgments

### `session_id`

- 判定: 保留だが先行可
- 根拠: turn1 と turn2 の両方で `thread_id = 019d47dc-87a8-7af0-a53e-81cc548f9912` が維持され、`responses/response-0003.json` と `responses/response-0005.json` の `thread.id` も同一だった。
- 補足: follow-up turn でも thread 再利用は確認できたため、`session_id = native thread ID` 候補は前ケースより強くなった。
- 保留時のデフォルト判断: Phase 2 の先行実装では `session_id = native thread ID` を採用候補として進める。

### `message_id`

- 判定: 不採用
- 根拠: turn1 でも turn2 でも、stream 側 user/assistant item id と history 側 `item-1` からの item id が一致しなかった。
- 補足: 不一致は単発ではなく、複数 turn でも再現した。
- 保留時のデフォルト判断: app-owned stable message_id を使い、native item id は source metadata として保持する。

### `turn_id`

- 判定: 保留だが先行可
- 根拠: `turn1_id` と `turn2_id` は別値で、各 turn 内では response / stream / history で一致した。
- 補足: turn ごとの境界識別には使えそうだが、request 紐付けや public contract への露出はまだ保留する。
- 保留時のデフォルト判断: internal/debug 用の有力候補として保持する。

### `event_id`

- 判定: 不採用
- 根拠: 2 turn 分の通知でも native `event_id` は一度も現れなかった。
- 補足: 行順と method 名以外の安定 event 識別子を観測できていない。
- 保留時のデフォルト判断: app-owned opaque event ID を採番する。

### `message.user`

- 判定: 保留だが先行可
- 根拠: turn1/turn2 ともに `item/completed` with `item.type = userMessage` が完全 payload を持っていた。
- 補足: follow-up turn でも同じパターンが再現した。
- 保留時のデフォルト判断: `item/completed` with `item.type = userMessage` を `message.user` の一次候補とする。

### `message.assistant.delta`

- 判定: 保留だが先行可
- 根拠: turn1/turn2 ともに `item/agentMessage/delta` が 3 回ずつ出て、同一 `itemId` に増分 text がぶら下がった。
- 補足: 各 turn の agent message item id は別だが、turn 内では delta 群が 1 itemId にまとまった。
- 保留時のデフォルト判断: `item/agentMessage/delta` を assistant streaming delta の一次候補として扱う。

### `message.assistant.completed`

- 判定: 保留だが先行可
- 根拠: turn1/turn2 ともに `item/completed` with `item.type = agentMessage` が最終 text を持ち、history 側 text と一致した。
- 補足: completed 時の stream item id と history item id の不一致は継続した。
- 保留時のデフォルト判断: `item/completed` with `item.type = agentMessage` を `message.assistant.completed` の一次候補とする。

### `running`

- 判定: 保留だが先行可
- 根拠: turn1 開始前と turn2 開始前の両方で `thread/status/changed` with `status.type = active` が現れた。
- 補足: `activeFlags` は両 turn とも空配列だった。
- 保留時のデフォルト判断: `thread/status/changed` with `status.type = active` を `running` 候補として扱う。

### `waiting_input`

- 判定: 保留だが先行可
- 根拠: turn1 完了後に `thread/status/changed` with `status.type = idle` が出て、その同じ thread で turn2 を開始できた。turn2 完了後も final status は `idle` だった。
- 補足: `idle` が follow-up を受け付ける状態であることは確認できた。
- 保留時のデフォルト判断: approval 非依存の通常系では `idle` を `waiting_input` 候補として扱う。

### `session.status_changed`

- 判定: 保留だが先行可
- 根拠: `thread/status/changed` が `active -> idle -> active -> idle` の遷移列を直接表した。
- 補足: follow-up turn 復帰根拠としても使える。
- 保留時のデフォルト判断: `thread/status/changed` を session status 変更の native 候補として採用する。

## Open Questions

- 未観測事項: native `event_id`、item 単位 timestamp、event 単位 timestamp、assistant message が出ない turn、create/start の初期意味論。
- 後続フェーズで再観測する case: `p2-no-assistant-message`, `p2-create-start-semantics`

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0005.json`
