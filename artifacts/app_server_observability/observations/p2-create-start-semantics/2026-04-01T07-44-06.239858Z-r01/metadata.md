# Metadata

- case_name: `p2-create-start-semantics`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T07-44-06.239858Z-r01`
- executed_at_utc: `2026-04-01T07:44:06.239858Z`
- session_key: `sk-20260401-baseline-01`
- app_server_version: `unknown`
 source: In this run, the app-server-specific version source is not saved separately in the artifact. `result.thread.cliVersion` is not adopted because it is the CLI version. 
- runtime_version: `codex-cli 0.117.0`
 source: `codex --version` and `result.thread.cliVersion`
- of `responses/response-0001.json` case_description: Do not send any input, thread state and readback immediately after `thread/start` Create/start semantics case to observe availability. 
- input_summary: No user input. I tried `thread/read(includeTurns=true)` after `thread/start` and then readback with `thread/read(includeTurns=false)`. 
- thread_id: `019d4800-6e58-7fe1-991b-b333453f8b47`
- request_id: `unknown`
- operator_notes: The thread immediately after `thread/start` was `idle`. `thread/read(includeTurns=true)` failed with `thread ... is not materialized yet; includeTurns is unavailable before first user message`, while `includeTurns=false` allowed the same thread to be reacquired with `idle` / `turns=[]`. In this protocol surface, we do not observe independent `turn/start` or `session start` requests that do not involve input.
