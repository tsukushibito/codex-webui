# Metadata

- case_name: `p4-initial-history-only-load`
- observed_in_tasks_phase: `phase_4`
- run_key: `2026-04-01T17-37-18.207745Z-r01`
- executed_at_utc: `2026-04-01T17:37:18.205354Z`
- session_key: `sk-20260401-reconstruction-01`
- app_server_version: `unknown`
 source: In this run, the app-server-specific version source is not saved separately. `result.thread.cliVersion` is not adopted because it is the CLI version. 
- runtime_version: `codex-cli 0.118.0`
 source: `codex --version` and `result.thread.cliVersion`
- of `responses/response-0001.json` case_description: After creating threads with turn1 completed and turn2 pending approval in connection A, connection B Here is a case where we observe the range in which the history can be reconstructed just by `thread/read(includeTurns=true)` from the first time without subscribing to the stream. 
- input_summary: turn1 is `Reply with exactly one short sentence: baseline ok.`, turn2 is `Use a shell command to print the exact current UTC timestamp with nanoseconds using \`date -u +%Y-%m-%d%H:%M:%S.%NZ\`, then summarize it in one short sentence.`
- thread_id: `019d4a1e-fdcb-7f32-887c-78eedbf4d477`
- request_id: `0`
- operator_notes: An approval request was generated in connection A, but no reply was returned and the connection was closed. The first `thread/read(includeTurns=true)` of connection B was able to re-obtain `thread.status = active[waitingOnApproval]`, turn2 `status = inProgress`, turn1 final message and turn2 commentary message. `history/history-0004.json` and `history/history-0005.json` are isomorphic, and the approval request payload, native `request_id`, and approval `itemId` were not materialized into either. `preview` remained at turn1 prompt instead of latest turn this time.
