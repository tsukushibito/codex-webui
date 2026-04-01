# 判定メモ

## Case Info

- case_name: `p3-stop-during-running`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-31-32.293678Z-r01`
- executed_at_utc: `2026-04-01T14:31:32.289898Z`
- session_key: `sk-20260401-terminal-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d4974-eb2b-7f70-b7ef-08c9f78d0540`
- request_id: `none observed`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0005.json`
- summary: `approvalPolicy = never` で長めの command execution を started させ、その実行中に `turn/interrupt` を送った。running 中は `thread.status = active[]` が thread/read でも見えた。interrupt 後は final `agentMessage` も `commandExecution` completed も出ず、turn は `interrupted` で終了した。approval 中 stop と違って `waitingOnApproval` と `serverRequest/resolved` は出ていない。

## Judgments

### `request_id`

- 判定: 不採用
- 根拠: approval 系 server request は発生せず、`stream/events.ndjson` に request-like native id は出ていない。
- app 補完要否: 不要
- 補足: このケースでは request ID 軸は比較に使えない。
- 保留時のデフォルト判断: approval を伴わない通常 stop では request ID 無し前提で扱う。

### `running`

- 判定: 保留だが先行可
- 根拠: `stream/events.ndjson` で `thread/status/changed: active[]` が出ており、`responses/response-0003.json` の `thread/read` でも `status = active[]` を再取得できた。
- app 補完要否: 不要
- 補足: approval 中 stop と違い `waitingOnApproval` flag は出ていない。
- 保留時のデフォルト判断: `active[]` を通常 running の native 根拠として扱う。

### `stopped`

- 判定: 保留だが先行可
- 根拠: `requests/request-0004.json` の `turn/interrupt` に対し `responses/response-0004.json` は成功し、その後 `turn/completed` は `status = interrupted`、thread は `idle` に戻った。
- app 補完要否: 不要
- 補足: approval 中 stop と同じく turn 終了形は `interrupted` だった。
- 保留時のデフォルト判断: `turn/interrupt` 起点の `turn.status = interrupted` を `stopped` 候補として扱う。

### `completed`

- 判定: 不採用
- 根拠: final `thread/read` で thread は `idle` だが、turn は `status = interrupted` で終了し、final `agentMessage` も生成されていない。
- app 補完要否: 不要
- 補足: 通常完了ケースや approval approve と明確に差分が出た。
- 保留時のデフォルト判断: 通常 stop 後の `idle` は terminal `completed` ではなく、interrupted turn 完了後の待機状態として扱う。

### `通常 stop と approval 中 stop の差分`

- 判定: 保留だが先行可
- 根拠: 通常 stop では `waitingOnApproval` が無く、`serverRequest/resolved` も出ず、`commandExecution` item は `started` のみで `completed` が観測されなかった。一方 approval 中 stop では pending `waitingOnApproval` があり、`serverRequest/resolved` が turn 完了後に出た。
- app 補完要否: 不要
- 補足: 両者とも最終的な `turn.status = interrupted` と `thread.status = idle` は同じだった。
- 保留時のデフォルト判断: stop 種別の識別は少なくとも `waitingOnApproval` と approval request の有無で分岐させる。

### `approval 中 stop を approval canceled と混同しない方針`

- 判定: 保留だが先行可
- 根拠: 通常 stop では approval resource 自体が存在せず、それでも `turn.status = interrupted` と `thread.status = idle` は approval 中 stop と同形だった。
- app 補完要否: 不要
- 補足: `interrupted` だけでは approval 由来 canceled と通常 stop を区別できない。
- 保留時のデフォルト判断: approval request が無い stop を approval `canceled` と混同しない。

### `command execution stop 後の native 変化`

- 判定: 保留だが先行可
- 根拠: `item/started` で `commandExecution.status = inProgress` は出たが、interrupt 後に `item/completed` は観測されなかった。代わりに `turn/completed` with `status = interrupted` と `thread/status/changed: idle` で終了した。
- app 補完要否: 要確認
- 補足: interrupt された command execution の終端状態を native item status からは直接取れていない。
- 保留時のデフォルト判断: command execution stop の終端は item 単体ではなく turn interruption と thread idle を主根拠にする。

### `session start`

- 判定: 保留だが先行可
- 根拠: このケースでも `thread/start` は idle thread を作る create primitive として振る舞い、実際の activity 開始は `turn/start` で起きた。
- app 補完要否: façade action としては要
- 補足: stop 観測は Phase 2 の create / start 一次判断を覆していない。
- 保留時のデフォルト判断: `session start` は引き続き App-owned façade action 前提で進める。

## Open Questions

- interrupt された `commandExecution` item が native で `completed` / `failed` / 別 status を出さないのが安定仕様か。
- stop 近接ケースで `turn/completed` と `thread/status/changed: idle` の順序が前後しうるか。
- `p3-transient-failure` で `failed` と `interrupted` の差分がどこまで明確に出るか。

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0005.json`
