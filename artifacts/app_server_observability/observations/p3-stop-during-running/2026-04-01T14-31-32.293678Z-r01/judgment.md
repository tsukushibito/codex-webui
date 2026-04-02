# Judgment memo

## Case Info

- case_name: `p3-stop-during-running`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-31-32.293678Z-r01`
- executed_at_utc: `2026-04-01T14:31:32.289898Z`
- session_key: `sk-20260401-terminal-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d4974-eb2b-7f70-b7ef-08c9f78d0540`
- request_id: `none observed`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0005.json`
- summary: I started a long command execution with `approvalPolicy = never` and sent a `turn/interrupt` during the execution. While running, `thread.status = active[]` was also visible in thread/read. After interrupt, neither final `agentMessage` nor `commandExecution` completed was issued, and turn ended with `interrupted`. During approval, unlike stop, `waitingOnApproval` and `serverRequest/resolved` are not displayed.

## Judgments

### `request_id`

- Judgment: Rejected
- Rationale: No approval-related server requests occur, and no request-like native id appears in `stream/events.ndjson`. 
- app Completion required: Not required 
- Note: In this case, the request ID axis cannot be used for comparison. 
- Default judgment when on hold: Normal stop without approval is handled on the assumption that there is no request ID.

### `running`

- Judgment: Pending, but possible to proceed 
- Reason: `thread/status/changed: active[]` was displayed in `stream/events.ndjson`, and `status = active[]` was also reacquired in `thread/read` of `responses/response-0003.json`. 
- app Completion required: Not required 
- Note: During approval, unlike stop, `waitingOnApproval` flag is not displayed. 
- Default judgment when pending: `active[]` is normally treated as the native basis for running.

### `stopped`

- Judgment: Pending, but can be preceded 
- Rationale: `responses/response-0004.json` succeeded in response to `turn/interrupt` of `requests/request-0004.json`, and then `turn/completed` returned to `status = interrupted` and thread returned to `idle`. 
- app Completion required: Not required 
- Supplement: During approval, like stop, the turn ending form was `interrupted`. 
- Default judgment when suspended: Treat `turn.status = interrupted` at the starting point of `turn/interrupt` as a `stopped` candidate.

### `completed`

- Judgment: Rejected 
- Rationale: In final `thread/read`, thread is `idle`, but turn ends with `status = interrupted`, and final `agentMessage` is not generated. 
- app Completion required: Not required
- Supplement: There was a clear difference from the normal completion case and approval approve. 
- Default judgment when on hold: Normally, `idle` after stop is not treated as terminal `completed`, but as a waiting state after completing an interrupted turn.

### `Difference between normal stop and stop during approval`

- Judgment: Pending but can be preceded 
- Rationale: Usually stop does not have `waitingOnApproval`, `serverRequest/resolved` does not appear, and `commandExecution` item only shows `started` and `completed` is not observed. On the other hand, during approval, there was a pending `waitingOnApproval`, and `serverRequest/resolved` appeared after the turn was completed. 
- app Completion required: Not required 
- Note: In both cases, the final `turn.status = interrupted` and `thread.status = idle` were the same. 
- Default judgment when on hold: stop The type is distinguished based on at least `waitingOnApproval` and the presence or absence of an approval request.

### `Policy not to confuse stop during approval with approval canceled`

- Judgment: Pending but can be preceded 
- Rationale: Normally, the approval resource itself does not exist in stop, and even so, `turn.status = interrupted` and `thread.status = idle` were isomorphic to stop during approval. 
- app Completion required: Not required
- Supplement: `interrupted` alone cannot distinguish between approval-derived canceled and normal stop. 
- Default decision when on hold: Don't confuse stop with no approval request with approval `canceled`.

### `native change after command execution stop`

- Judgment: Pending, but possible to proceed 
- Reason: `commandExecution.status = inProgress` was observed in `item/started`, but `item/completed` was not observed after interrupt. Instead, it ended with `turn/completed` with `status = interrupted` and `thread/status/changed: idle`. 
- app Completion required: Check 
- Note: The terminal status of the interrupted command execution cannot be obtained directly from the native item status. 
- Default judgment when suspending: The termination of command execution stop is based mainly on turn interruption and thread idle, not on the item itself.

### `session start`

- Judgment: Pending, but can be preceded 
- Rationale: In this case too, `thread/start` acted as a create primitive to create an idle thread, and the actual start of the activity occurred at `turn/start`. 
- Necessity of app complementation: Necessary as a façade action 
- Supplement: Stop observation does not overturn the create / start primary judgment of Phase 2. 
- Default judgment when on hold: `session start` continues assuming App-owned façade action.

## Open Questions

- Is it a stable specification that the interrupted `commandExecution` item is native and does not display `completed` / `failed` / other status? 
- Can the order of `turn/completed` and `thread/status/changed: idle` be reversed in the stop proximity case? 
- How clear is the difference between `failed` and `interrupted` in `p3-transient-failure`?

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0005.json`
