# Judgment memo

## Case Info

- case_name: `p3-approval-deny`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T12-19-33.193413Z-r01`
- executed_at_utc: `2026-04-01T12:19:33.189848Z`
- session_key: `sk-20260401-approval-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d48fc-1517-71f2-acda-cf234456602f`
- request_id: `1`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `server_requests/server-request-0001.json`, `server_responses/server-response-0001.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0004.json`
- summary: Command execution approval occurred with `approvalPolicy = untrusted`, and `serverRequest/resolved` was observed after client reply `decision = cancel`. While pending, `thread.status = active(waitingOnApproval)` was visible in thread/read, but the approval request itself was not materialized into history. After being resolved, the command execution item completed as `declined` and the turn became `interrupted` without a final `agentMessage`. `serverRequest/resolved` alone did not know the resolution type or `resolved_at`, and the deny judgment could only be determined by combining it with the raw trail of the client reply.

## Judgments

### `approval_id`

- Judgment: Pending, but can proceed 
- Reason: Top-level `id = 1` of `server_requests/server-request-0001.json` and `serverRequest/resolved.params.requestId = 1` of `stream/events.ndjson` matched. 
- app Completion required: Not required in this case alone. It is necessary to confirm whether the same stability is obtained even during approval and stop. 
- Supplement: The request object itself was not materialized in the pending / resolved history of `thread/read`, and the request id could not be redetected using the history alone. 
- Default decision when pending: treat native request ID as `approval_id` first candidate, fall back to runtime stable key if unstable in subsequent case.

### `approval_category`

- Judgment: Pending, but can proceed 
- Rationale: The request method was `item/commandExecution/requestApproval`, accompanied by `params.command` / `params.commandActions`. 
- app Completion required: Projection to public enum is required. 
- Note: At least this case can be classified as command execution approval. 
- Default judgment when pending: If method is `item/commandExecution/requestApproval`, map to command execution category.

### `title / summary`

- Judgment: Pending, but can proceed 
- Rationale: There is no dedicated `title` / `summary` field for native request, and `params.command` was the closest summary information. 
- app Completion required: Required 
- Note: `command = /bin/bash -lc 'date -u +%Y-%m-%dT%H:%M:%S.%NZ'` can be used as is as a summary candidate. 
- Default judgment when on hold: If there is no title, use `command` as summary.

### `description / reason`

- Judgment: Incomplete 
- Rationale: There is no `reason` in `server_requests/server-request-0001.json`, and there is no explanatory text on the history side. 
- app Completion required: Required 
- Note: There are `cwd` and `commandActions`, but they are not sufficient for user explanations. 
- Default judgment when pending: If there is no native `reason`, assume app synthesis explanation using command and cwd.

### `operation_summary`

- Judgment: Pending, but possible 
- Rationale: `server_requests/server-request-0001.json` contained `command`, `cwd`, ​​`commandActions`, `proposedExecpolicyAmendment`, and `availableDecisions`. 
- app Completion required: Not required
- Supplement: For command execution approval, it is easy to assemble a sufficient operation summary with only native. 
- Default decision when on hold: Use `command` and `cwd` primarily, and use `commandActions` and decisions as support.

### `requested_at`

- Judgment: Not completed 
- Rationale: There is no timestamp field in the approval requests of `server_requests/server-request-0001.json` and `stream/events.ndjson`. `updatedAt = 1775045980` of pending `thread/read` is the thread update time, not exclusive to request. 
- app Completion required: Required 
- Supplement: The timestamp per request cannot be directly stored using the native event payload alone. 
- Default judgment when pending: Unless native is present, the reception time of app runtime is retained as a `requested_at` candidate.

### `resolved_at`

- Judgment: Incomplete 
- Rationale: `serverRequest/resolved` in `stream/events.ndjson` only has `threadId` and `requestId`, and there is no dedicated timestamp for resolved. `updatedAt = 1775045980` of final `thread/read` also remains at the thread update time. 
- app Completion required: Required 
- Note: request-specific resolved timestamp cannot be obtained directly from the native payload. 
- Default judgment when pending: Unless native is present, the `serverRequest/resolved` reception time of the app runtime is held as a `resolved_at` candidate.

### `approval.requested`

- Judgment: Pending but can be preceded 
- Reason: `item/commandExecution/requestApproval` appeared immediately after `thread/status/changed: active[waitingOnApproval]` in `stream/events.ndjson`. 
- Need for app completion: Light completion is required to make it a canonical event 
- Note: The request payload body is only in the server request frame and is not saved in the history. 
- Default judgment when pending: Treat reception of native server request as `approval.requested` candidate.

### `approval.resolved`

- Judgment: Not completed 
- Reason: `serverRequest/resolved` with `requestId = 1` appeared after `decision = cancel` of `server_responses/server-response-0001.json` in `stream/events.ndjson`, but this notification itself also has resolution enum `resolved_at` I don't have either. 
- app Completion required: Required 
- Supplement: As with approve case, approve / deny / stop cannot be distinguished from native event alone. This time I was able to correlate the client reply raw and say deny. 
- Default judgment when pending: `approval.resolved` is not determined by `serverRequest/resolved` alone, but is assumed to complement resolution in combination with at least the corresponding client reply.

### `waiting_approval`

- Judgment: Pending but can be preceded 
- Reason: `status.type = active` and `activeFlags = ["waitingOnApproval"]` appear in `thread/status/changed` of `stream/events.ndjson`, and the same status appears in `thread/read` of `responses/response-0003.json` was able to be reacquired. 
- app Completion required: Not required 
- Note: Even if the pending approval body was not in the history, the status could be confirmed by re-acquiring the history. 
- Default decision on pending: Treat `active + waitingOnApproval` as the native basis for `waiting_approval`.

### `native change after deny`

- Judgment: Pending but can be preceded 
- Reason: `commandExecution.status = declined`, `thread/status/changed: active[]`, `turn/completed` with `turn.status = interrupted`, `thread/status/changed: idle` were observed in `item/completed` after `serverRequest/resolved`. 
- app Completion required: Not required 
- Note: Unlike the approve case, neither command execution nor final `agentMessage` occurred after deny. 
- Default judgment when pending: After deny, treat `waiting_approval -> active[] -> interrupted turn -> idle` as the default transition candidate.

### `Approval history redetection`

- Judgment: Rejected 
- Rationale: `turns[*].items` of `history/history-0003.json` and `history/history-0004.json` only had `userMessage` and commentary `agentMessage`, and the approval request payload, request id, and deny decision could not be reconstructed. 
- app Completion required: Required
- Supplement: Only history could rebuild up to `waitingOnApproval` status and interrupted turn. 
- Default judgment when pending: Approval resource and stable request mapping are assumed to be maintained on the app runtime side.

### `completed`

- Judgment: Rejected 
- Rationale: In final `thread/read`, thread is `idle`, but turn ends with `status = interrupted`, and final `agentMessage` is not generated. 
- app Completion required: Not required 
- Note: There is a clear difference from `turn.status = completed` of approve case. 
- Default judgment when holding: `idle` after deny is treated as a waiting state after completing an interrupted turn, not as a terminal `completed`.

### `stopped`

- Judgment: Incomplete 
- Reason: This time it was a user deny, and no `turn/interrupt` or stop action was entered. 
- app Completion required: Confirmation required 
- Supplement: The difference between deny and stop during approval requires separate observation with `p3-approval-stop`. 
- Default decision on hold: Do not equate deny with `stopped`.

### `session start`

- Judgment: Pending, but can be preceded 
- Rationale: In this case too, `thread/start` acted as a create primitive to create an idle thread, and the actual start of the activity occurred at `turn/start`. The approval observation does not overturn the Phase 2 create/start primary judgment. 
- Necessity of app completion: Necessary as a façade action 
- Note: Even after introducing approval, we have not observed any native primitives with start without input. 
- Default judgment when on hold: `session start` continues assuming App-owned façade action.

## Open Questions

- Is the native request ID the same as `serverRequest/resolved` even during `stop` during approval? 
- Does `turn.status = interrupted` occur for both deny and stop during approval? 
- Is there another route that allows `requested_at` / `resolved_at` to be taken directly from native?

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`
- server_requests: `server_requests/server-request-0001.json`
- server_responses: `server_responses/server-response-0001.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0004.json`
