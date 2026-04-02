# Metadata

- case_name: `p2-normal-turn-complete`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T06-39-35.575874Z-r01`
- executed_at_utc: `2026-04-01T06:39:35.575874Z`
- session_key: `sk-20260401-p2-normal-turn-complete-01`
- app_server_version: `unknown`
 source: In this run, the app-server-specific version source is not saved separately in the artifact. `result.thread.cliVersion` is not adopted because it is the CLI version. 
- runtime_version: `codex-cli 0.117.0`
 source: `codex --version` and `result.thread.cliVersion`
- in `responses/response-0001.json` case_description: Normal 1 turn completion case without approval. Create a thread with `thread/start`, complete one `turn/start`, and finally retrieve the history again with `thread/read`. 
- input_summary: text input 1 item. The contents are `Say exactly: observation ok`
- thread_id: `019d47c5-7968-7992-80f3-c6bb56e06bef`
- request_id: `unknown`
- operator_notes: request/response numbering is `0001=thread/start`, `0002=turn/start`, `0003=thread/read`. `mcpServer/startupStatus/updated`, `account/rateLimits/updated`, `thread/tokenUsage/updated` were mixed in the stream. The native `event_id` was not exposed, and the item/event unit timestamp could not be observed in this case.
