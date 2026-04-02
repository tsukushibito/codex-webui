# Metadata

- case_name: `p4-stream-disconnect-reload`
- observed_in_tasks_phase: `phase_4`
- run_key: `2026-04-01T15-02-49.912Z-r01`
- executed_at_utc: `2026-04-01T15:02:49.912Z`
- session_key: `sk-20260401-reconstruction-01`
- app_server_version: `unknown`
  source: この run では app-server 固有 version source を別保存していない。`result.thread.cliVersion` は CLI version のため採用しない。
- runtime_version: `codex-cli 0.118.0`
  source: `codex --version` と `responses/response-0001.json` の `result.thread.cliVersion`
- case_description: 同一 thread で turn1 を通常完了させ、turn2 では approval request を pending のまま残して stream を切断し、新しい接続から `thread/read(includeTurns=true)` だけで reload したケース。
- input_summary: turn1 は `Reply with exactly one short sentence: baseline ok.`、turn2 は `Use a shell command to print the exact current UTC timestamp with nanoseconds using \`date -u +%Y-%m-%dT%H:%M:%S.%NZ\`, then summarize it in one short sentence.`
- thread_id: `019d4991-9162-7b82-8804-b539df2d37b5`
- request_id: `0`
- operator_notes: connection A では turn1 completed と turn2 pending approval を stream で観測した後、approval reply を返さずに WebSocket を close した。connection B では stream を使わず `thread/read(includeTurns=true)` だけを実行し、`history/history-0006.json` は `history/history-0005.json` と同形で `thread.status = active[waitingOnApproval]`、turn2 `status = inProgress`、turn2 items は `userMessage` と commentary `agentMessage` までを再取得できた。一方、pending approval request payload、native `request_id`、approval `itemId` は history に materialize されず、approval resource 自体は再構築できなかった。
