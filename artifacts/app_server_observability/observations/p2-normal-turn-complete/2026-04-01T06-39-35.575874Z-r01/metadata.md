# Metadata

- case_name: `p2-normal-turn-complete`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T06-39-35.575874Z-r01`
- executed_at_utc: `2026-04-01T06:39:35.575874Z`
- session_key: `sk-20260401-p2-normal-turn-complete-01`
- app_server_version: `0.117.0`
  source: `responses/response-0001.json` の `result.thread.cliVersion` と initialize response の `userAgent`
- runtime_version: `codex-cli 0.117.0`
  source: `codex --version`
- case_description: approval を含まない通常 1 turn 完了ケース。`thread/start` で thread を作成し、1 回の `turn/start` を完了させ、最後に `thread/read` で履歴を再取得する。
- input_summary: text input 1 件。内容は `Say exactly: observation ok`
- thread_id: `019d47c5-7968-7992-80f3-c6bb56e06bef`
- request_id: `unknown`
- operator_notes: request/response の採番は `0001=thread/start`, `0002=turn/start`, `0003=thread/read` とした。stream には `mcpServer/startupStatus/updated`, `account/rateLimits/updated`, `thread/tokenUsage/updated` が混在した。native `event_id` は露出せず、item/event 単位 timestamp も今回の case では観測できなかった。
