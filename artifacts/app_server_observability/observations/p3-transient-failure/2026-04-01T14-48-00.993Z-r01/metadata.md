# Metadata

- case_name: `p3-transient-failure`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-48-00.993Z-r01`
- executed_at_utc: `2026-04-01T14:48:00.993Z`
- session_key: `sk-20260401-terminal-02`
- app_server_version: `unknown`
 source: In this run, the app-server-specific version source is not saved separately. `result.thread.cliVersion` is not adopted because it is the CLI version. 
- runtime_version: `codex-cli 0.118.0`
 source: `codex --version` and `result.thread.cliVersion`
- of `responses/response-0001.json` case_description: Create thread with `approvalPolicy = never` and use non-zero exit A case where you want to execute a shell command only once and observe whether a command execution failure is treated as a transient failure. 
- input_summary: text input 1 item. The content is `Use a shell command to run \`printf 'boom\\n' >&2; exit 42\`, do not retry, and if it fails answer with exactly one short sentence that includes the text exit 42.`
- thread_id: `019d4984-0160-71f3-a4cb-764a7e596a5a`
- request_id: `none observed`
- operator_notes: In stream, `thread/status/changed` transitioned to `active[] -> idle`. I observed `commandExecution.status = failed` and `exitCode = 42` in `item/completed`, but then a final `agentMessage` was generated, `turn/completed` showed `status = completed`, and thread was `idle` even in final `thread/read` / `history/history-0004.json`. Neither failed `commandExecution` item nor turn error were materialized in history, and only commentary / final `agentMessage` and `turn.status = completed` remained.
