# 判定メモ

## Case Info

- case_name: `p3-approval-stop`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-25-51.391748Z-r01`
- executed_at_utc: `2026-04-01T14:25:51.390798Z`
- session_key: `sk-20260401-approval-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d496f-b79a-7412-95c7-596844f5c2a6`
- request_id: `0`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `server_requests/server-request-0001.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0005.json`
- summary: `approvalPolicy = untrusted` で command execution approval を発生させ、client approval reply を返さず `turn/interrupt` を送った。pending 中は `thread.status = active(waitingOnApproval)` が thread/read でも見えたが、approval request 自体は history に materialize されなかった。interrupt 後は final `agentMessage` も `commandExecution` item も出ず、turn は `interrupted` で終了した。`serverRequest/resolved` は今回も `requestId` だけを返し、resolution 種別も `resolved_at` も分からなかった。

## Judgments

### `approval_id`

- 判定: 保留だが先行可
- 根拠: `server_requests/server-request-0001.json` の top-level `id = 0` と、`stream/events.ndjson` の `serverRequest/resolved.params.requestId = 0` が一致した。
- app 補完要否: このケース単体では不要。stop 近接ケースでも同じ安定性が出るかは要確認。
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
- 根拠: `server_requests/server-request-0001.json` と `stream/events.ndjson` の approval request には timestamp field が無い。pending `thread/read` の `updatedAt = 1775053562` は thread 更新時刻であり、request 専用ではない。
- app 補完要否: 要
- 補足: native event payload だけでは request 単位 timestamp を直接保持できない。
- 保留時のデフォルト判断: native が無い限り、app runtime の受信時刻を `requested_at` 候補として保持する。

### `resolved_at`

- 判定: 未完了
- 根拠: `stream/events.ndjson` の `serverRequest/resolved` は `threadId` と `requestId` しか持たず、resolved 専用 timestamp が無い。final `thread/read` の `updatedAt = 1775053562` も thread 更新時刻に留まる。
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
- 根拠: `stream/events.ndjson` で `turn/completed` の後に `serverRequest/resolved` with `requestId = 0` が出たが、この notification 自体は resolution enum も `resolved_at` も持たず、client approval reply も存在しない。
- app 補完要否: 要
- 補足: approve / deny と違い、このケースでは stop による resolution を示す専用 native payload が見えていない。
- 保留時のデフォルト判断: `approval.resolved` は `serverRequest/resolved` 単体で決めず、approval 中 stop を app runtime で別相関する前提にする。

### `waiting_approval`

- 判定: 保留だが先行可
- 根拠: `stream/events.ndjson` の `thread/status/changed` で `status.type = active` かつ `activeFlags = ["waitingOnApproval"]` が出ており、`responses/response-0003.json` の `thread/read` でも同じ status が再取得できた。
- app 補完要否: 不要
- 補足: pending approval 本体は history に無くても、status は履歴再取得で確認できた。
- 保留時のデフォルト判断: `active + waitingOnApproval` を `waiting_approval` の native 根拠として扱う。

### `通常 stop と approval 中 stop の差分`

- 判定: 保留だが先行可
- 根拠: このケースでは stop 前に `waitingOnApproval` があり、interrupt 後は `commandExecution` item started/completed が一切出ず、`serverRequest/resolved` が `turn/completed` の後ろに現れた。
- app 補完要否: なお通常 stop ケースとの比較は必要
- 補足: deny では `serverRequest/resolved` の後に `commandExecution.status = declined` が出たが、approval 中 stop ではその item 自体が materialize されなかった。
- 保留時のデフォルト判断: approval 中 stop は deny とも通常 stop とも別系列として扱い、少なくとも `waitingOnApproval` の有無で分岐させる。

### `stopped`

- 判定: 保留だが先行可
- 根拠: `requests/request-0004.json` の `turn/interrupt` に対し `responses/response-0004.json` は成功し、その後 `turn/completed` は `status = interrupted`、thread は `idle` に戻った。
- app 補完要否: 通常 stop ケース比較までは要
- 補足: approval 中 stop の native turn 終了形は deny と同じ `interrupted` だが、approval reply と `commandExecution` lifecycle が欠けている。
- 保留時のデフォルト判断: `turn/interrupt` 起点の `turn.status = interrupted` を `stopped` 候補として扱い、通常 stop ケースで再確認する。

### `completed`

- 判定: 不採用
- 根拠: final `thread/read` で thread は `idle` だが、turn は `status = interrupted` で終了し、final `agentMessage` も生成されていない。
- app 補完要否: 不要
- 補足: approval approve の `turn.status = completed` と明確に差分が出た。
- 保留時のデフォルト判断: approval 中 stop 後の `idle` は terminal `completed` ではなく、interrupted turn 完了後の待機状態として扱う。

### `approval 中 stop 時に approval を canceled と扱えるか`

- 判定: 未完了
- 根拠: native では client approval reply が存在せず、`serverRequest/resolved` も resolution 種別を返さない。stop によって approval がどう解決されたかは payload から直接は分からない。
- app 補完要否: 要
- 補足: 少なくとも今回の native 事実だけでは deny と同じ `canceled` を安全に確定できない。
- 保留時のデフォルト判断: approval 中 stop は approval `canceled` と断定せず、app runtime の stop 起点相関が入るまで保留にする。

### `approval の履歴再検出`

- 判定: 不採用
- 根拠: `history/history-0003.json` と `history/history-0005.json` の `turns[*].items` には `userMessage` と commentary `agentMessage` しか無く、approval request payload や request id、stop resolution は再構築できなかった。
- app 補完要否: 要
- 補足: history だけで再構築できたのは `waitingOnApproval` status と interrupted turn までだった。
- 保留時のデフォルト判断: approval resource と stable request mapping は app runtime 側で保持する前提にする。

### `session start`

- 判定: 保留だが先行可
- 根拠: このケースでも `thread/start` は idle thread を作る create primitive として振る舞い、実際の activity 開始は `turn/start` で起きた。approval 観測は Phase 2 の create / start 一次判断を覆していない。
- app 補完要否: façade action としては要
- 補足: approval 導入後も start without input の native primitive は観測していない。
- 保留時のデフォルト判断: `session start` は引き続き App-owned façade action 前提で進める。

## Open Questions

- 通常 stop でも `turn.status = interrupted` と `thread.status = idle` の組み合わせになるか。
- approval 中 stop で `serverRequest/resolved` が `turn/completed` より後ろに出るのが安定挙動か。
- approval 中 stop を approval `canceled` と安全に写像するには、追加の app-owned 相関が必要か。

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`
- server_requests: `server_requests/server-request-0001.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0005.json`
