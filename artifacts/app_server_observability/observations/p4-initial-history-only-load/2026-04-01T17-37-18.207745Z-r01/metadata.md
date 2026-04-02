# Metadata

- case_name: `p4-initial-history-only-load`
- observed_in_tasks_phase: `phase_4`
- run_key: `2026-04-01T17-37-18.207745Z-r01`
- executed_at_utc: `2026-04-01T17:37:18.205354Z`
- session_key: `sk-20260401-reconstruction-01`
- app_server_version: `unknown`
  source: この run では app-server 固有 version source を別保存していない。`result.thread.cliVersion` は CLI version のため採用しない。
- runtime_version: `codex-cli 0.118.0`
  source: `codex --version` と `responses/response-0001.json` の `result.thread.cliVersion`
- case_description: connection A で turn1 completed と turn2 pending approval の thread を作成したあと、connection B では stream を一度も購読せず、初回から `thread/read(includeTurns=true)` だけで履歴再構築できる範囲を観測するケース。
- input_summary: turn1 は `Reply with exactly one short sentence: baseline ok.`、turn2 は `Use a shell command to print the exact current UTC timestamp with nanoseconds using \`date -u +%Y-%m-%dT%H:%M:%S.%NZ\`, then summarize it in one short sentence.`
- thread_id: `019d4a1e-fdcb-7f32-887c-78eedbf4d477`
- request_id: `0`
- operator_notes: connection A で approval request を発生させたが reply は返さず、そのまま close した。connection B の初回 `thread/read(includeTurns=true)` で `thread.status = active[waitingOnApproval]`、turn2 `status = inProgress`、turn1 final message と turn2 commentary message を再取得できた。`history/history-0004.json` と `history/history-0005.json` は同形で、approval request payload、native `request_id`、approval `itemId` はどちらにも materialize されなかった。`preview` は今回も latest turn ではなく turn1 prompt のままだった。
