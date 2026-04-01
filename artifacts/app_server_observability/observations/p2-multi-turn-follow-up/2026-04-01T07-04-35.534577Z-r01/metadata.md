# Metadata

- case_name: `p2-multi-turn-follow-up`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T07-04-35.534577Z-r01`
- executed_at_utc: `2026-04-01T07:04:35.534577Z`
- session_key: `sk-20260401-baseline-01`
- app_server_version: `unknown`
  source: この run では app-server 固有 version source を成果物に別保存していない。`result.thread.cliVersion` は CLI version のため採用しない。
- runtime_version: `codex-cli 0.117.0`
  source: `codex --version` と `responses/response-0001.json` の `result.thread.cliVersion`
- case_description: 同一 thread 上で 2 turn を連続実行し、follow-up user message 時の thread 再利用と `idle -> active` 復帰を観測するケース。
- input_summary: turn1 input は `Reply with exactly: turn one ok`、turn2 input は `Reply with exactly: turn two ok`
- thread_id: `019d47dc-87a8-7af0-a53e-81cc548f9912`
- request_id: `unknown`
- operator_notes: request/response 採番は `0001=thread/start`, `0002=turn1/start`, `0003=thread/read after turn1`, `0004=turn2/start`, `0005=thread/read after turn2` とした。stream では `thread/status/changed` が `active -> idle -> active -> idle` と遷移した。native `event_id`、item/event timestamp、native `request_id` は今回も観測できなかった。
