# 判定メモ

## Case Info

- case_name: `p3-transient-failure`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-48-00.993Z-r01`
- executed_at_utc: `2026-04-01T14:48:00.993Z`
- session_key: `sk-20260401-terminal-02`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d4984-0160-71f3-a4cb-764a7e596a5a`
- request_id: `none observed`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0004.json`
- summary: `approvalPolicy = never` で non-zero exit の shell command を 1 回だけ実行させたところ、stream では `item/completed` with `commandExecution.status = failed` と `exitCode = 42` が出た。一方で turn 自体は final `agentMessage` を返して `completed` し、thread も `idle` に戻った。history には failed `commandExecution` item も turn error も残らず、final `agentMessage` と `turn.status = completed` だけが materialize された。

## Judgments

### `error.raised`

- 判定: 保留だが先行可
- 根拠: `stream/events.ndjson` の `item/completed` で `commandExecution.status = failed`、`exitCode = 42`、`aggregatedOutput = "boom\n"` を観測した。専用の error notification や `turn.error` は出ていない。
- app 補完要否: 要
- 補足: native には `error.raised` 専用 signal は見えず、history にも failed item は残らなかった。
- 保留時のデフォルト判断: `item/completed` with failed `commandExecution` を `error.raised` の第一候補として runtime で投影する。

### `failed`

- 判定: 不採用
- 根拠: failed だったのは `commandExecution` item だけで、`turn/completed` は `status = completed`、final `thread/read` でも thread は `idle`、`turn.error = null` だった。
- app 補完要否: 要
- 補足: native item failure をそのまま terminal `failed` に写像すると、同じ turn 内で final answer を返して `waiting_input` へ戻るケースを誤分類する。
- 保留時のデフォルト判断: terminal `failed` は native item status ではなく、runtime が「同一 session の継続を打ち切るべき失敗」と判断した場合にのみ置く。

### `一時失敗 / 終端失敗の区別`

- 判定: 保留だが先行可
- 根拠: 今回は `commandExecution.status = failed` にもかかわらず、assistant は final `agentMessage` を返し、turn は `completed`、thread は `idle` に戻った。
- app 補完要否: 要
- 補足: 少なくとも non-zero exit の shell command failure は transient failure として扱える。native だけでは「終端失敗」を示す session-level status は見えていない。
- 保留時のデフォルト判断: turn が `completed` し thread が `idle` に戻る failure は transient とみなし、terminal `failed` とは分ける。

### `completed`

- 判定: 保留だが先行可
- 根拠: `turn/completed` は `status = completed`、`history/history-0004.json` でも turn は `completed` だった。
- app 補完要否: 要
- 補足: command execution failure を含んでも turn は completed しうるため、公開 `completed` は「エージェントが応答を返して turn を閉じたか」を見る方が安定する。
- 保留時のデフォルト判断: final `agentMessage` を伴う `turn.status = completed` は `completed` / `waiting_input` 系の根拠として扱う。

### `running`

- 判定: 保留だが先行可
- 根拠: `thread/status/changed: active[]` が出ており、`history/history-0003.json` でも `status = active[]` を再取得できた。
- app 補完要否: 不要
- 補足: approval 系の `waitingOnApproval` flag は出ていない。
- 保留時のデフォルト判断: `active[]` を通常 running の native 根拠として扱う。

### `command execution failure の履歴再検出`

- 判定: 不採用
- 根拠: `history/history-0003.json` と `history/history-0004.json` の `turns[*].items` には `userMessage` と `agentMessage` しか無く、failed `commandExecution` item は再構築できなかった。
- app 補完要否: 要
- 補足: stream 由来の failure 情報を runtime で保持しないと、初回ロード時に error resource を復元できない。
- 保留時のデフォルト判断: failure item の raw と app-owned error projection を別に保持する前提にする。

### `session start`

- 判定: 保留だが先行可
- 根拠: このケースでも `thread/start` は idle thread を作る create primitive として振る舞い、実際の activity 開始は `turn/start` で起きた。
- app 補完要否: façade action としては要
- 補足: failure 観測は Phase 2 の create / start 一次判断を覆していない。
- 保留時のデフォルト判断: `session start` は引き続き App-owned façade action 前提で進める。

## Open Questions

- native session / turn が `failed` を直接返すケースが別にあるか。
- `error.raised` を public resource 化する際、message 化せず独立 event/resource として保持すべきか。
- stream 未接続の初回ロードで transient failure をどこまで復元したいか。

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0004.json`
