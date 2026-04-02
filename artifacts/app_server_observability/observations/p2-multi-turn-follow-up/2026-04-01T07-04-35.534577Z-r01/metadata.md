# Metadata

- case_name: `p2-multi-turn-follow-up`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T07-04-35.534577Z-r01`
- executed_at_utc: `2026-04-01T07:04:35.534577Z`
- session_key: `sk-20260401-baseline-01`
- app_server_version: `unknown`
 source: In this run, the app-server-specific version source is not saved separately in the artifact. `result.thread.cliVersion` is not adopted because it is the CLI version. 
- runtime_version: `codex-cli 0.117.0`
 source: `codex --version` and `result.thread.cliVersion`
- of `responses/response-0001.json` case_description: Continuously execute 2 turns on the same thread, and the thread at the time of follow-up user message A case to observe reuse and `idle -> active` reversion. 
- input_summary: turn1 input is `Reply with exactly: turn one ok`, turn2 input is `Reply with exactly: turn two ok`
- thread_id: `019d47dc-87a8-7af0-a53e-81cc548f9912`
- request_id: `unknown`
- operator_notes: request/response numbering is `0001=thread/start`, `0002=turn1/start`, `0003=thread/read after turn1`, `0004=turn2/start`, `0005=thread/read after turn2`. In stream, `thread/status/changed` transitioned to `active -> idle -> active -> idle`. Native `event_id`, item/event timestamp, and native `request_id` could not be observed this time either.
