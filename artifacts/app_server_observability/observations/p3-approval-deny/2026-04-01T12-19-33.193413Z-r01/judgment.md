# 判定メモ

## Case Info

- case_name: `p3-approval-deny`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T12-19-33.193413Z-r01`
- executed_at_utc: `2026-04-01T12:19:33.189848Z`
- session_key: `sk-20260401-approval-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d48fc-1517-71f2-acda-cf234456602f`
- request_id: `1`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `server_requests/server-request-0001.json`, `server_responses/server-response-0001.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0004.json`
- summary: `approvalPolicy = untrusted` で command execution approval を発生させ、client reply `decision = cancel` の後に `serverRequest/resolved` を観測した。pending 中は `thread.status = active(waitingOnApproval)` が thread/read でも見えたが、approval request 自体は history に materialize されなかった。resolved 後は command execution item が `declined` で完了し、turn は final `agentMessage` なしで `interrupted` になった。`serverRequest/resolved` 単体では今回も resolution 種別も `resolved_at` も分からず、deny 判定は client reply の raw 証跡と組み合わせて初めて確定できた。

## Judgments

### `approval_id`

- 判定: 保留だが先行可
- 根拠: `server_requests/server-request-0001.json` の top-level `id = 1` と、`stream/events.ndjson` の `serverRequest/resolved.params.requestId = 1` が一致した。
- app 補完要否: このケース単体では不要。approval 中 stop でも同じ安定性が出るかは要確認。
- 補足: `thread/read` の pending / resolved history には request object 自体が materialize されず、履歴だけでは request id を再検出できなかった。
- 保留時のデフォルト判断: native request ID を `approval_id` 第一候補として扱い、後続ケースで不安定なら runtime stable key にフォールバックする。

### `approval_category`

- 判定: 保留だが先行可
- 根拠: request method が `item/commandExecution/requestApproval` で、`params.command` / `params.commandActions` を伴っていた。
- app 補完要否: 公開 enum への投影は必要。
- 補足: 少なくともこのケースは command execution approval として分類できる。
- 保留時のデフォルト判断: method が `item/commandExecution/requestApproval` の場合は command execution category に写像する。

### `title / summary`

- 判定: 保留だが先行可
- 根拠: native request に専用 `title` / `summary` field は無く、`params.command` が最も近い要約情報だった。
- app 補完要否: 要
- 補足: `command = /bin/bash -lc 'date -u +%Y-%m-%dT%H:%M:%S.%NZ'` をそのまま summary 候補として使える。
- 保留時のデフォルト判断: title が無ければ `command` を summary に流用する。

### `description / reason`

- 判定: 未完了
- 根拠: `server_requests/server-request-0001.json` に `reason` は無く、history 側にも説明文は出ていない。
- app 補完要否: 要
- 補足: `cwd` や `commandActions` はあるが、ユーザー向け説明文には足りない。
- 保留時のデフォルト判断: native `reason` が無い場合は command と cwd を使った app 合成説明を前提にする。

### `operation_summary`

- 判定: 保留だが先行可
- 根拠: `server_requests/server-request-0001.json` に `command`、`cwd`、`commandActions`、`proposedExecpolicyAmendment`、`availableDecisions` が含まれていた。
- app 補完要否: 不要
- 補足: command execution approval では native だけで十分な操作要約を組み立てやすい。
- 保留時のデフォルト判断: `command` と `cwd` を主、`commandActions` と decisions を補助として使う。

### `requested_at`

- 判定: 未完了
- 根拠: `server_requests/server-request-0001.json` と `stream/events.ndjson` の approval request には timestamp field が無い。pending `thread/read` の `updatedAt = 1775045980` は thread 更新時刻であり、request 専用ではない。
- app 補完要否: 要
- 補足: native event payload だけでは request 単位 timestamp を直接保持できない。
- 保留時のデフォルト判断: native が無い限り、app runtime の受信時刻を `requested_at` 候補として保持する。

### `resolved_at`

- 判定: 未完了
- 根拠: `stream/events.ndjson` の `serverRequest/resolved` は `threadId` と `requestId` しか持たず、resolved 専用 timestamp が無い。final `thread/read` の `updatedAt = 1775045980` も thread 更新時刻に留まる。
- app 補完要否: 要
- 補足: request-specific resolved timestamp は native payload から直接取れない。
- 保留時のデフォルト判断: native が無い限り、app runtime の `serverRequest/resolved` 受信時刻を `resolved_at` 候補として保持する。

### `approval.requested`

- 判定: 保留だが先行可
- 根拠: `stream/events.ndjson` で `thread/status/changed: active[waitingOnApproval]` の直後に `item/commandExecution/requestApproval` が出た。
- app 補完要否: canonical event 化には軽い補完が必要
- 補足: request payload 本体は server request frame にのみあり、history には残らなかった。
- 保留時のデフォルト判断: native server request の受信を `approval.requested` 候補として扱う。

### `approval.resolved`

- 判定: 未完了
- 根拠: `stream/events.ndjson` で `server_responses/server-response-0001.json` の `decision = cancel` 後に `serverRequest/resolved` with `requestId = 1` が出たが、この notification 自体は resolution enum も `resolved_at` も持たない。
- app 補完要否: 要
- 補足: approve case と同じく、native event 単体では approve / deny / stop を区別できない。今回は client reply raw を相関させて deny と言えた。
- 保留時のデフォルト判断: `approval.resolved` は `serverRequest/resolved` 単体で決めず、少なくとも対応する client reply と組み合わせて resolution を補完する前提にする。

### `waiting_approval`

- 判定: 保留だが先行可
- 根拠: `stream/events.ndjson` の `thread/status/changed` で `status.type = active` かつ `activeFlags = ["waitingOnApproval"]` が出ており、`responses/response-0003.json` の `thread/read` でも同じ status が再取得できた。
- app 補完要否: 不要
- 補足: pending approval 本体は history に無くても、status は履歴再取得で確認できた。
- 保留時のデフォルト判断: `active + waitingOnApproval` を `waiting_approval` の native 根拠として扱う。

### `deny 後の native 変化`

- 判定: 保留だが先行可
- 根拠: `serverRequest/resolved` の後に `item/completed` で `commandExecution.status = declined`、`thread/status/changed: active[]`、`turn/completed` with `turn.status = interrupted`、`thread/status/changed: idle` の順で観測された。
- app 補完要否: 不要
- 補足: approve case と違い、deny 後は command execution 実行も final `agentMessage` も発生しなかった。
- 保留時のデフォルト判断: deny 後は `waiting_approval -> active[] -> interrupted turn -> idle` を既定遷移候補として扱う。

### `approval の履歴再検出`

- 判定: 不採用
- 根拠: `history/history-0003.json` と `history/history-0004.json` の `turns[*].items` には `userMessage` と commentary `agentMessage` しか無く、approval request payload や request id、deny decision を再構築できなかった。
- app 補完要否: 要
- 補足: history だけで再構築できたのは `waitingOnApproval` status と interrupted turn までだった。
- 保留時のデフォルト判断: approval resource と stable request mapping は app runtime 側で保持する前提にする。

### `completed`

- 判定: 不採用
- 根拠: final `thread/read` で thread は `idle` だが、turn は `status = interrupted` で終了し、final `agentMessage` も生成されていない。
- app 補完要否: 不要
- 補足: approve case の `turn.status = completed` と明確に差分が出た。
- 保留時のデフォルト判断: deny 後の `idle` は terminal `completed` ではなく、interrupted turn 完了後の待機状態として扱う。

### `stopped`

- 判定: 未完了
- 根拠: 今回は user deny であり、`turn/interrupt` や stop action は打っていない。
- app 補完要否: 要確認
- 補足: deny と approval 中 stop の差分は `p3-approval-stop` で別観測が必要。
- 保留時のデフォルト判断: deny を `stopped` と同一視しない。

### `session start`

- 判定: 保留だが先行可
- 根拠: このケースでも `thread/start` は idle thread を作る create primitive として振る舞い、実際の activity 開始は `turn/start` で起きた。approval 観測は Phase 2 の create / start 一次判断を覆していない。
- app 補完要否: façade action としては要
- 補足: approval 導入後も start without input の native primitive は観測していない。
- 保留時のデフォルト判断: `session start` は引き続き App-owned façade action 前提で進める。

## Open Questions

- `approval 中 stop` でも native request ID が `serverRequest/resolved` まで同一か。
- deny と approval 中 stop の両方で `turn.status = interrupted` になるか。
- `requested_at` / `resolved_at` を native から直接取れる経路が別にあるか。

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`
- server_requests: `server_requests/server-request-0001.json`
- server_responses: `server_responses/server-response-0001.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0004.json`
