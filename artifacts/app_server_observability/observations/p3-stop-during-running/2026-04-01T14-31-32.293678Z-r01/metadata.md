# Metadata

- case_name: `p3-stop-during-running`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-31-32.293678Z-r01`
- executed_at_utc: `2026-04-01T14:31:32.289898Z`
- session_key: `sk-20260401-terminal-01`
- app_server_version: `unknown`
 source: In this run, the app-server-specific version source is not saved separately. `result.thread.cliVersion` is not adopted because it is the CLI version. 
- runtime_version: `codex-cli 0.118.0`
 source: `codex --version` and `result.thread.cliVersion`
- of `responses/response-0001.json` case_description: Create a thread with `approvalPolicy = never`, and a long command execution A case where you send `turn/interrupt` immediately after starting and compare `thread/read` after running/stop. 
- input_summary: text input 1 item. The content is `Use a shell command to run \`sleep 10; printf 'done\\n'\`, then answer with exactly one short sentence containing the word done.`
- thread_id: `019d4974-eb2b-7f70-b7ef-08c9f78d0540`
- request_id: `none observed`
- operator_notes: In stream, `thread/status/changed` transitioned to `active[] -> idle`. Immediately after `commandExecution` item became `status = inProgress` in `item/started`, `turn/interrupt` of `requests/request-0004.json` was sent. The interrupt response of `responses/response-0004.json` is empty, after being resolved, `turn/completed` is `status = interrupted`, and in final `thread/read` / `history/history-0005.json`, only `idle` and interrupted turn remain without final `agentMessage` or `commandExecution` item. Unlike the approval system, there is no `waitingOnApproval` or `serverRequest/resolved`.
