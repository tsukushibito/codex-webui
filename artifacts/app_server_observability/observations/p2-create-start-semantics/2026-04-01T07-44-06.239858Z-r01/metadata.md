# Metadata

- case_name: `p2-create-start-semantics`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T07-44-06.239858Z-r01`
- executed_at_utc: `2026-04-01T07:44:06.239858Z`
- session_key: `sk-20260401-baseline-01`
- app_server_version: `unknown`
  source: この run では app-server 固有 version source を成果物に別保存していない。`result.thread.cliVersion` は CLI version のため採用しない。
- runtime_version: `codex-cli 0.117.0`
  source: `codex --version` と `responses/response-0001.json` の `result.thread.cliVersion`
- case_description: input を一切送らず、`thread/start` 直後の thread 状態と readback 可否を観測する create/start semantics ケース。
- input_summary: user input なし。`thread/start` の後に `thread/read(includeTurns=true)` を試し、その後 `thread/read(includeTurns=false)` で readback した。
- thread_id: `019d4800-6e58-7fe1-991b-b333453f8b47`
- request_id: `unknown`
- operator_notes: `thread/start` 直後の thread は `idle` だった。`thread/read(includeTurns=true)` は `thread ... is not materialized yet; includeTurns is unavailable before first user message` で失敗した一方、`includeTurns=false` なら同じ thread を `idle` / `turns=[]` で再取得できた。今回の protocol surface では、input を伴わない独立の `turn/start` や `session start` 相当 request は観測していない。
