# Metadata

- case_name: `p3-approval-stop`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-25-51.391748Z-r01`
- executed_at_utc: `2026-04-01T14:25:51.390798Z`
- session_key: `sk-20260401-approval-01`
- app_server_version: `unknown`
 source: In this run, the app-server-specific version source is not saved separately. `result.thread.cliVersion` is not adopted because it is the CLI version. 
- runtime_version: `codex-cli 0.118.0`
 source: `codex --version` and `result.thread.cliVersion`
- of `responses/response-0001.json` case_description: Create a thread with `approvalPolicy = untrusted` and use command execution approval A case where a `turn/interrupt` is sent without returning an approval reply immediately after a ``thread/read` is compared after a pending/stop. 
- input_summary: text input 1 item. The content is `Use a shell command to print the exact current UTC timestamp with nanoseconds using \`date -u +%Y-%m-%dT%H:%M:%S.%NZ\`, then summarize it in one short sentence.`
- thread_id: `019d496f-b79a-7412-95c7-596844f5c2a6`
- request_id: `0`
- operator_notes: In stream, `thread/status/changed` transitioned to `active[] -> active[waitingOnApproval] -> idle`. The approval request was observed in `item/commandExecution/requestApproval` with `id = 0` in `server_requests/server-request-0001.json`, and then a `turn/interrupt` in `requests/request-0004.json` was sent without returning a client approval reply. The interrupt response of `responses/response-0004.json` is empty, after being resolved, `turn/completed` is `status = interrupted`, and in final `thread/read` / `history/history-0005.json`, only `idle` and interrupted turn remain without final `agentMessage` or `commandExecution` item. `serverRequest/resolved` once again showed the resolved fact of `requestId = 0`, but did not have the resolution type and `resolved_at`.
