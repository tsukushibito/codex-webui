# Metadata

- case_name: `p3-approval-stop`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-25-51.391748Z-r01`
- executed_at_utc: `2026-04-01T14:25:51.390798Z`
- session_key: `sk-20260401-approval-01`
- app_server_version: `unknown`
  source: この run では app-server 固有 version source を別保存していない。`result.thread.cliVersion` は CLI version のため採用しない。
- runtime_version: `codex-cli 0.118.0`
  source: `codex --version` と `responses/response-0001.json` の `result.thread.cliVersion`
- case_description: `approvalPolicy = untrusted` で thread を作成し、command execution approval を発生させた直後に approval reply を返さず `turn/interrupt` を送り、pending / stop 後の `thread/read` を比較するケース。
- input_summary: text input 1 件。内容は `Use a shell command to print the exact current UTC timestamp with nanoseconds using \`date -u +%Y-%m-%dT%H:%M:%S.%NZ\`, then summarize it in one short sentence.`
- thread_id: `019d496f-b79a-7412-95c7-596844f5c2a6`
- request_id: `0`
- operator_notes: stream では `thread/status/changed` が `active[] -> active[waitingOnApproval] -> idle` と遷移した。approval request は `server_requests/server-request-0001.json` の `item/commandExecution/requestApproval` with `id = 0` で観測され、その後 client approval reply は返さず `requests/request-0004.json` の `turn/interrupt` を送った。`responses/response-0004.json` の interrupt response は空で、resolved 後は `turn/completed` が `status = interrupted`、final `thread/read` / `history/history-0005.json` には final `agentMessage` も `commandExecution` item も無いまま `idle` と interrupted turn だけが残った。`serverRequest/resolved` は今回も `requestId = 0` の解決事実までは示したが、resolution 種別と `resolved_at` は持たなかった。
