# 判定メモ

## Case Info

- case_name: `p2-normal-turn-complete`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T06-39-35.575874Z-r01`
- executed_at_utc: `2026-04-01T06:39:35.575874Z`
- session_key: `sk-20260401-p2-normal-turn-complete-01`
- app_server_version: `0.117.0`
- runtime_version: `codex-cli 0.117.0`
- thread_id: `019d47c5-7968-7992-80f3-c6bb56e06bef`
- request_id: `unknown`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `stream/events.ndjson`, `history/history-0003.json`
- summary: 通常 1 turn 完了は観測できた。`thread_id` と `turn_id` は stream / response / history で一致した一方、message item id は stream と history で不一致だった。native `event_id` は観測できなかった。

## Judgments

### `session_id`

- 判定: 保留だが先行可
- 根拠: `responses/response-0001.json` の `result.thread.id`、`stream/events.ndjson` の thread 系通知、`responses/response-0003.json` の `result.thread.id` がすべて `019d47c5-7968-7992-80f3-c6bb56e06bef` で一致した。
- 補足: 1 thread 内の通常 1 turn でしか見ていないため、再取得後同一性と follow-up turn 再利用は後続 case で継続確認が必要。
- 保留時のデフォルト判断: Phase 2 の先行実装では `session_id = native thread ID` 候補として扱い、`p2-multi-turn-follow-up` で再確認する。

### `message_id`

- 判定: 不採用
- 根拠: `stream/events.ndjson` の user message / agent message item id はそれぞれ UUID と `msg_*` だが、`history/history-0003.json` では同じ論理 message が `item-1` / `item-2` になっており一致しない。
- 補足: 現時点で、stream と history の双方を横断できる単一の native item ID は観測できていない。
- 保留時のデフォルト判断: app-owned stable message_id を使い、native item id は source metadata として保持する。

### `turn_id`

- 判定: 保留だが先行可
- 根拠: `responses/response-0002.json` の `result.turn.id`、`stream/events.ndjson` の `turn/started` / `item/*` / `turn/completed`、`history/history-0003.json` の `turns[0].id` が一致した。
- 補足: 単一 turn では十分一貫しているが、完了判定や request 紐付けに本当に使うかは follow-up case が必要。
- 保留時のデフォルト判断: internal/debug 用の有力候補として保持し、public contract にはまだ出さない。

### `event_id`

- 判定: 不採用
- 根拠: `stream/events.ndjson` の全通知に native `event_id` フィールドが無く、行順以外の安定な event 識別子を観測できなかった。
- 補足: `thread/status/changed` など method 名はあるが、event 単位 ID は露出していない。
- 保留時のデフォルト判断: app-owned opaque event ID を採番する。

### `message.user`

- 判定: 保留だが先行可
- 根拠: `stream/events.ndjson` で `item/completed` の `item.type = userMessage` が user message の完全 payload を持っている。
- 補足: `item/started` でも同じ payload は見えるが、projection の canonical event としては completed 側の方が扱いやすい。
- 保留時のデフォルト判断: `item/completed` with `item.type = userMessage` を `message.user` の一次候補とする。

### `message.assistant.delta`

- 判定: 保留だが先行可
- 根拠: `stream/events.ndjson` に `item/agentMessage/delta` が 3 回出現し、同じ `itemId = msg_097661efcf21df110169ccbdd84bbc8191982a89d3ee40b58d` に対して `"ob"`, `"servation"`, `" ok"` が流れた。
- 補足: delta は stream 専用の一時イベントで、history には現れない。
- 保留時のデフォルト判断: `item/agentMessage/delta` を assistant streaming delta の一次候補として扱う。

### `message.assistant.completed`

- 判定: 保留だが先行可
- 根拠: `stream/events.ndjson` の `item/completed` with `item.type = agentMessage` が最終 text `observation ok` を持ち、`history/history-0003.json` の agentMessage と内容が一致した。
- 補足: completed 時の stream item id と history item id は一致しないため、message 完了イベントと message stable ID は分けて考える必要がある。
- 保留時のデフォルト判断: `item/completed` with `item.type = agentMessage` を `message.assistant.completed` の一次候補とする。

### `running`

- 判定: 保留だが先行可
- 根拠: `stream/events.ndjson` に `thread/status/changed` with `status.type = active` があり、その後に item 生成と delta が続いた。
- 補足: `activeFlags` は空配列で、approval 待ちや user input 待ちではない active 状態だった。
- 保留時のデフォルト判断: `thread/status/changed` with `status.type = active` を `running` 候補として扱う。

### `waiting_input`

- 判定: 保留だが先行可
- 根拠: assistant message 完了後に `thread/status/changed` with `status.type = idle` が出て、その直後に `turn/completed` が来た。`thread/read` の final status も `idle` だった。
- 補足: `idle` をそのまま `waiting_input` と同一視してよいかは no-assistant case と multi-turn case が必要。
- 保留時のデフォルト判断: approval 非依存の通常完了では `idle` を `waiting_input` 候補として扱う。

### `session.status_changed`

- 判定: 保留だが先行可
- 根拠: native で `thread/status/changed` 通知があり、`active -> idle` の遷移を直接観測できた。
- 補足: session 専用 event は見えず、現状の最有力候補は thread ステータス通知。
- 保留時のデフォルト判断: `thread/status/changed` を session status 変更の native 候補として採用し、Phase 4 で最終化する。

## Open Questions

- 未観測事項: native `event_id`、item 単位 timestamp、event 単位 timestamp、follow-up turn での thread 再利用、assistant message が出ない turn。
- 後続フェーズで再観測する case: `p2-multi-turn-follow-up`, `p2-no-assistant-message`, `p2-create-start-semantics`

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`
