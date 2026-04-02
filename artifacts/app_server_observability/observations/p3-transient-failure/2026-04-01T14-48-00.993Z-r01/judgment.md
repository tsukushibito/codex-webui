# Judgment memo

## Case Info

- case_name: `p3-transient-failure`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-48-00.993Z-r01`
- executed_at_utc: `2026-04-01T14:48:00.993Z`
- session_key: `sk-20260401-terminal-02`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d4984-0160-71f3-a4cb-764a7e596a5a`
- request_id: `none observed`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0004.json`
- summary: When I executed the non-zero exit shell command only once with `approvalPolicy = never`, in stream `item/completed` with `commandExecution.status = failed` and `exitCode = 42` appeared. On the other hand, the turn itself returned the final `agentMessage` and became `completed`, and the thread also returned to `idle`. There is no failed `commandExecution` item or turn error left in history, only final `agentMessage` and `turn.status = completed` are materialized.

## Judgments

### `error.raised`

- Judgment: Pending, but can proceed 
- Reason: `commandExecution.status = failed`, `exitCode = 42`, `aggregatedOutput = "boom\n"` were observed in `item/completed` of `stream/events.ndjson`. There is no dedicated error notification or `turn.error`. 
- app Completion required: Required 
- Note: `error.raised` exclusive signal was not visible in native, and no failed item was left in history. 
- Default judgment when pending: `item/completed` with failed `commandExecution` is projected in runtime as the first candidate for `error.raised`.

### `failed`

- Judgment: Rejected 
- Rationale: Only `commandExecution` item was failed, `turn/completed` was `status = completed`, and even in final `thread/read` thread was `idle` and `turn.error = null`. 
- app Completion required: Required 
- Note: If native item failure is directly mapped to terminal `failed`, the case of returning final answer and returning to `waiting_input` within the same turn will be misclassified. 
- Default judgment when on hold: terminal `failed` is not the native item status, but is set only when the runtime judges that it is a failure that should terminate the continuation of the same session.

### `Distinguish between temporary failure/terminal failure`

- Judgment: Pending, but can proceed 
- Rationale: Despite `commandExecution.status = failed` this time, the assistant returned the final `agentMessage`, the turn returned to `completed`, and the thread returned to `idle`. 
- app Completion required: Required 
- Supplement: At least a shell command failure with a non-zero exit can be treated as a transient failure. With only native, the session-level status indicating "termination failure" is not visible. 
- Default judgment when pending: failure where turn is `completed` and thread returns to `idle` is considered transient and is separated from terminal `failed`.

### `completed`

- Judgment: Pending, but possible to proceed 
- Rationale: `turn/completed` was `status = completed`, and even `history/history-0004.json`, turn was `completed`. 
- app Completion required: Required 
- Supplement: Since a turn can be completed even if it includes a command execution failure, it is more stable to check whether the public `completed` is ``whether the agent returned a response and closed the turn.'' 
- Default judgment when pending: `turn.status = completed` with final `agentMessage` is treated as the basis for `completed` / `waiting_input` system.

### `running`

- Judgment: Pending, but possible to proceed 
- Reason: `thread/status/changed: active[]` was displayed, and `status = active[]` was also reacquired in `history/history-0003.json`. 
- app Completion required: Not required
- Supplement: `waitingOnApproval` flag of approval type is not displayed. 
- Default judgment when pending: `active[]` is normally treated as the native basis for running.

### `Redetection of command execution failure history`

- Judgment: Rejected 
- Rationale: `turns[*].items` of `history/history-0003.json` and `history/history-0004.json` only had `userMessage` and `agentMessage`, and failed `commandExecution` item could not be reconstructed. 
- app Completion required: Required 
- Note: If failure information derived from stream is not retained in runtime, error resource cannot be restored at the first load. 
- Default judgment when holding: It is assumed that the raw and app-owned error projection of failure items are kept separately.

### `session start`

- Judgment: Pending, but can be preceded 
- Rationale: In this case too, `thread/start` acted as a create primitive to create an idle thread, and the actual start of the activity occurred at `turn/start`. 
- Necessity of app complementation: Necessary as a façade action 
- Supplement: Failure observation does not overturn the primary judgment of create / start in Phase 2. 
- Default judgment when on hold: `session start` continues assuming App-owned façade action.

## Open Questions

- Are there any other cases where native session / turn directly returns `failed`? 
- When making `error.raised` a public resource, should it be kept as an independent event/resource without turning it into a message? 
- stream How far do you want to recover transient failure on unconnected first load?

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0004.json`
