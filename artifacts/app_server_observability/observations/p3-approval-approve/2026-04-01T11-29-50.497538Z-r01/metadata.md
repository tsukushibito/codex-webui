# Metadata

- case_name: `p3-approval-approve`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T11-29-50.497538Z-r01`
- executed_at_utc: `2026-04-01T11:29:50.497538Z`
- session_key: `sk-20260401-approval-01`
- app_server_version: `unknown`
 source: In this run, the app-server-specific version source is not saved separately. `result.thread.cliVersion` is not adopted because it is the CLI version. 
- runtime_version: `codex-cli 0.118.0`
 source: `codex --version` and `result.thread.cliVersion`
- of `responses/response-0001.json` case_description: Create a thread with `approvalPolicy = untrusted` and use command execution approval The case where you raise and resolve with `accept` and compare `thread/read` after pending / resolved. 
- input_summary: text input 1 item. The content is `Use a shell command to print the exact current UTC timestamp with nanoseconds using \`date -u +%Y-%m-%dT%H:%M:%S.%NZ\`, then summarize it in one short sentence.`
- thread_id: `019d48ce-933a-7a70-bab8-1caaae131711`
- request_id: `0`
- operator_notes: In stream, `thread/status/changed` transitioned to `active[] -> active[waitingOnApproval] -> active[] -> idle`. The approval request was observed as `item/commandExecution/requestApproval` with `id = 0` in `server_requests/server-request-0001.json`, and the client reply was `decision = accept` in `server_responses/server-response-0001.json`. `serverRequest/resolved` showed the resolution of `requestId = 0`, but did not have the resolution type and `resolved_at`. The approval resource itself was not materialized in the pending / resolved `thread/read`, and only the `waitingOnApproval` status was displayed during pending, and only the final `agentMessage` was added to `responses/response-0004.json` / `history/history-0004.json` and `idle` after resolved.
