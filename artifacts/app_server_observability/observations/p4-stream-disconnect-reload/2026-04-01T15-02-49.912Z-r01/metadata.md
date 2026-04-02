# Metadata

- case_name: `p4-stream-disconnect-reload`
- observed_in_tasks_phase: `phase_4`
- run_key: `2026-04-01T15-02-49.912Z-r01`
- executed_at_utc: `2026-04-01T15:02:49.912Z`
- session_key: `sk-20260401-reconstruction-01`
- app_server_version: `unknown`
 source: In this run, the app-server-specific version source is not saved separately. `result.thread.cliVersion` is not adopted because it is the CLI version. 
- runtime_version: `codex-cli 0.118.0`
 source: `codex --version` and `result.thread.cliVersion`
- of `responses/response-0001.json` case_description: Normally complete turn1 in the same thread, leave approval request pending in turn2 A case where the stream is disconnected and reloaded with just `thread/read(includeTurns=true)` from a new connection. 
- input_summary: turn1 is `Reply with exactly one short sentence: baseline ok.`, turn2 is `Use a shell command to print the exact current UTC timestamp with nanoseconds using \`date -u +%Y-%m-%d%H:%M:%S.%NZ\`, then summarize it in one short sentence.`
- thread_id: `019d4991-9162-7b82-8804-b539df2d37b5`
- request_id: `0`
- operator_notes: In connection A, after observing turn1 completed and turn2 pending approval in the stream, the WebSocket was closed without returning an approval reply. In connection B, only `thread/read(includeTurns=true)` is executed without using stream, `history/history-0006.json` is isomorphic to `history/history-0005.json`, `thread.status = active[waitingOnApproval]`, turn2 `status = inProgress`, turn2 items are `userMessage` and commentary `agentMessage` I was able to reacquire it. On the other hand, the pending approval request payload, native `request_id`, and approval `itemId` were not materialized into history, and the approval resource itself could not be reconstructed.
