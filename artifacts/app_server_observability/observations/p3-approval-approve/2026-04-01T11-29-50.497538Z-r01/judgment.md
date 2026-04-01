# 判定メモ

## Case Info

- case_name: `p3-approval-approve`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T11-29-50.497538Z-r01`
- executed_at_utc: `2026-04-01T11:29:50.497538Z`
- session_key: `sk-20260401-approval-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d48ce-933a-7a70-bab8-1caaae131711`
- request_id: `0`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `server_requests/server-request-0001.json`, `server_responses/server-response-0001.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0004.json`
- summary: `approvalPolicy = untrusted` で command execution approval を発生させ、client reply `decision = accept` の後に `serverRequest/resolved` を観測した。pending 中は `thread.status = active(waitingOnApproval)` が thread/read でも見えたが、approval request 自体は history に materialize されなかった。`serverRequest/resolved` 単体では resolution 種別も `resolved_at` も分からず、今回の `approve` 判定は client reply の raw 証跡と組み合わせて初めて確定できた。

## Judgments

### `approval_id`

- 判定: 保留だが先行可
- 根拠: `server_requests/server-request-0001.json` の top-level `id = 0` と、`stream/events.ndjson` の `serverRequest/resolved.params.requestId = 0` が一致した。
- app 補完要否: このケース単体では不要。deny / stop でも同じ安定性が出るかは要確認。
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
- 根拠: `server_requests/server-request-0001.json` と `stream/events.ndjson` の approval request には timestamp field が無い。pending `thread/read` の `updatedAt = 1775042998` は thread 更新時刻であり、request 専用ではない。
- app 補完要否: 要
- 補足: native event payload だけでは request 単位 timestamp を直接保持できない。
- 保留時のデフォルト判断: native が無い限り、app runtime の受信時刻を `requested_at` 候補として保持する。

### `resolved_at`

- 判定: 未完了
- 根拠: `stream/events.ndjson` の `serverRequest/resolved` は `threadId` と `requestId` しか持たず、resolved 専用 timestamp が無い。final `thread/read` の `updatedAt = 1775043004` も thread 更新時刻に留まる。
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
- 根拠: `stream/events.ndjson` で `server_responses/server-response-0001.json` の `decision = accept` 後に `serverRequest/resolved` with `requestId = 0` が出たが、この notification 自体は resolution enum も `resolved_at` も持たない。
- app 補完要否: 要
- 補足: 今回の run では client reply raw と `requestId` を相関させることで「approve だった」と言えたが、native event 単体では approve / deny / stop を区別できない。
- 保留時のデフォルト判断: `approval.resolved` は `serverRequest/resolved` 単体で決めず、少なくとも対応する client reply と組み合わせて resolution を補完する前提にする。

### `waiting_approval`

- 判定: 保留だが先行可
- 根拠: `stream/events.ndjson` の `thread/status/changed` で `status.type = active` かつ `activeFlags = [\"waitingOnApproval\"]` が出ており、`responses/response-0003.json` の `thread/read` でも同じ status が再取得できた。
- app 補完要否: 不要
- 補足: pending approval 本体は history に無くても、status は履歴再取得で確認できた。
- 保留時のデフォルト判断: `active + waitingOnApproval` を `waiting_approval` の native 根拠として扱う。

### `approval 解決後の waiting_input`

- 判定: 保留だが先行可
- 根拠: `serverRequest/resolved` の後に `thread/status/changed: active[]`、command execution 完了、final `agentMessage` 完了、`thread/status/changed: idle`、`turn/completed` の順で観測された。
- app 補完要否: 不要
- 補足: approve 後は即 idle ではなく、一度 active[] に戻ってから通常完了へ流れた。
- 保留時のデフォルト判断: approve 後は `waiting_approval -> running -> waiting_input` を既定遷移として扱う。

### `approval の履歴再検出`

- 判定: 不採用
- 根拠: `history/history-0003.json` と `history/history-0004.json` の `turns[*].items` には `userMessage` と `agentMessage` しか無く、approval request payload や request id を再構築できなかった。
- app 補完要否: 要
- 補足: history だけで再構築できたのは `waitingOnApproval` status と turn/message の増分だけだった。
- 保留時のデフォルト判断: approval resource と stable request mapping は app runtime 側で保持する前提にする。

### `completed`

- 判定: 未完了
- 根拠: このケースの最終 native 状態は `thread.status = idle` と `turn.status = completed` で、Phase 2 の通常完了と同じく `waiting_input` 候補に見える。terminal status としての `completed` を置く根拠にはならない。
- app 補完要否: 要確認
- 補足: approval を経ても session terminal completed の signal は別に観測されていない。
- 保留時のデフォルト判断: approval approve 後の final `idle` は terminal `completed` ではなく `waiting_input` 側に寄せる。

### `session start`

- 判定: 保留だが先行可
- 根拠: このケースでも `thread/start` は idle thread を作る create primitive として振る舞い、実際の activity 開始は `turn/start` で起きた。approval 観測は Phase 2 の create / start 一次判断を覆していない。
- app 補完要否: façade action としては要
- 補足: approval 導入後も start without input の native primitive は観測していない。
- 保留時のデフォルト判断: `session start` は引き続き App-owned façade action 前提で進める。

## Open Questions

- `deny` と `approval 中 stop` でも native request ID が `serverRequest/resolved` まで同一か。
- resolved 後の history に request resolution metadata が出ないのが command execution approval 固有か、approval 全般の仕様か。
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
