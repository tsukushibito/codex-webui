# Metadata

- case_name: `p3-approval-deny`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T12-19-33.193413Z-r01`
- executed_at_utc: `2026-04-01T12:19:33.189848Z`
- session_key: `sk-20260401-approval-01`
- app_server_version: `unknown`
 source: In this run, the app-server-specific version source is not saved separately. `result.thread.cliVersion` is not adopted because it is the CLI version. 
- runtime_version: `codex-cli 0.118.0`
 source: `codex --version` and `result.thread.cliVersion`
- of `responses/response-0001.json` case_description: Create a thread with `approvalPolicy = untrusted` and use command execution approval A case where you generate a ``cancel``, resolve it with ``cancel``, and compare ``thread/read`` after pending / resolved. 
- input_summary: text input 1 item. The content is `Use a shell command to print the exact current UTC timestamp with nanoseconds using \`date -u +%Y-%m-%dT%H:%M:%S.%NZ\`, then summarize it in one short sentence.`
- thread_id: `019d48fc-1517-71f2-acda-cf234456602f`
- request_id: `1`
- operator_notes: In stream, `thread/status/changed` transitioned to `active[] -> active[waitingOnApproval] -> active[] -> idle`. The approval request was observed as `item/commandExecution/requestApproval` with `id = 1` in `server_requests/server-request-0001.json`, and the client reply was `decision = cancel` in `server_responses/server-response-0001.json`. `serverRequest/resolved` showed the resolution of `requestId = 1`, but did not have the resolution type and `resolved_at`. After being resolved, command execution item becomes `status = declined` in `item/completed`, `turn/completed` becomes `status = interrupted`, and only `idle` and interrupted turn remain in final `thread/read` / `history/history-0004.json` without final `agentMessage`.
