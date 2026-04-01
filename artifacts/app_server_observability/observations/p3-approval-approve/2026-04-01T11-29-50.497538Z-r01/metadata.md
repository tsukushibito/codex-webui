# Metadata

- case_name: `p3-approval-approve`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T11-29-50.497538Z-r01`
- executed_at_utc: `2026-04-01T11:29:50.497538Z`
- session_key: `sk-20260401-approval-01`
- app_server_version: `unknown`
  source: この run では app-server 固有 version source を別保存していない。`result.thread.cliVersion` は CLI version のため採用しない。
- runtime_version: `codex-cli 0.118.0`
  source: `codex --version` と `responses/response-0001.json` の `result.thread.cliVersion`
- case_description: `approvalPolicy = untrusted` で thread を作成し、command execution approval を発生させて `accept` で解決し、pending / resolved 後の `thread/read` を比較するケース。
- input_summary: text input 1 件。内容は `Use a shell command to print the exact current UTC timestamp with nanoseconds using \`date -u +%Y-%m-%dT%H:%M:%S.%NZ\`, then summarize it in one short sentence.`
- thread_id: `019d48ce-933a-7a70-bab8-1caaae131711`
- request_id: `0`
- operator_notes: stream では `thread/status/changed` が `active[] -> active[waitingOnApproval] -> active[] -> idle` と遷移した。approval request は `server_requests/server-request-0001.json` の `item/commandExecution/requestApproval` with `id = 0` で観測され、client reply は `server_responses/server-response-0001.json` の `decision = accept` だった。`serverRequest/resolved` は `requestId = 0` の解決事実までは示したが、resolution 種別と `resolved_at` は持たなかった。pending / resolved の `thread/read` には approval resource 自体は materialize されず、pending 時は `waitingOnApproval` status、resolved 後は `responses/response-0004.json` / `history/history-0004.json` に final `agentMessage` 追加と `idle` だけが見えた。
