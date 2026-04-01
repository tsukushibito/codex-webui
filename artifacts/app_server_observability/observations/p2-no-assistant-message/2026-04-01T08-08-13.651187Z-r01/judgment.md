# 判定メモ

## Case Info

- case_name: `p2-no-assistant-message`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T08-08-13.651187Z-r01`
- executed_at_utc: `2026-04-01T08:08:13.651187Z`
- session_key: `sk-20260401-baseline-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.117.0`
- thread_id: `019d4816-6ff1-7ca3-927f-4779c96544ff`
- request_id: `unknown`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `stream/events.ndjson`, `history/history-0003.json`
- summary: shell command 実行だけで turn は完了した。stream には `commandExecution` item と空文字 `agentMessage` item が出たが、history には `userMessage` しか残らず、assistant message が出ないまま turn 完了したケースとして扱える。

## Judgments

### `assistant message が出ない turn の扱い`

- 判定: 保留だが先行可
- 根拠: `stream/events.ndjson` では `commandExecution` item の started/completed があり、その後の `agentMessage` item も `text = ""` のまま completed した。`history/history-0003.json` の turn items は `userMessage` 1 件だけで、assistant message は materialize されなかった。
- 補足: native stream には空文字 agentMessage lifecycle が存在するため、「stream に agentMessage 型通知が一切無い」わけではない。公開 message projection で assistant message を作る条件は、少なくとも非空 text または history materialization を要求した方が安全に見える。
- 保留時のデフォルト判断: empty `agentMessage` は message projection から除外し、history に assistant message が無い turn は「assistant message なし完了」として扱う。

### `message.user`

- 判定: 保留だが先行可
- 根拠: `item/completed` with `item.type = userMessage` は通常系と同じく完全 payload を持ち、history の `userMessage` と対応した。
- 補足: no-assistant case でも user side の signal 候補は変わらない。
- 保留時のデフォルト判断: `item/completed` with `item.type = userMessage` を `message.user` の一次候補とする。

### `message.assistant.completed`

- 判定: 保留だが先行可
- 根拠: stream 上の `item/completed` with `item.type = agentMessage` は存在するが `text = ""` で、history 側に item が materialize されなかった。
- 補足: completed 通知だけでは公開 assistant message 完了イベントに昇格できないケースがある。
- 保留時のデフォルト判断: `message.assistant.completed` は非空 text か history materialization を伴う場合にのみ採用し、empty agentMessage completed は除外する。

### `running`

- 判定: 保留だが先行可
- 根拠: turn 開始時に `thread/status/changed` with `status.type = active` が出て、通常系と同じく実行中を示した。
- 補足: no-assistant case でも running 候補は変わらない。
- 保留時のデフォルト判断: `thread/status/changed` with `status.type = active` を `running` 候補として扱う。

### `waiting_input`

- 判定: 保留だが先行可
- 根拠: `commandExecution` 完了と空文字 agentMessage completed の後に `thread/status/changed` with `status.type = idle` が出て、`turn/completed` を経て history 再取得でも assistant message 無しで turn が閉じた。
- 補足: assistant text が無くても `idle` に戻る根拠は得られた。
- 保留時のデフォルト判断: assistant text が無い turn でも final `idle` を `waiting_input` 候補として扱う。

### `session.status_changed`

- 判定: 保留だが先行可
- 根拠: no-assistant case でも `thread/status/changed` が `active -> idle` を表した。
- 補足: assistant text の有無に依存せず、status 変更候補として機能した。
- 保留時のデフォルト判断: `thread/status/changed` を session status 変更の native 候補として維持する。

## Open Questions

- 未観測事項: item/event timestamp、native `event_id`、empty agentMessage を native 事実としてどこまで保存すべきかの最終方針。
- 後続フェーズで再観測する case: なし。Phase 2 checklist 更新時に通常系ケースと統合判断する。

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`
