# Judgment memo

## Case Info

- case_name: `p3-approval-stop`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-25-51.391748Z-r01`
- executed_at_utc: `2026-04-01T14:25:51.390798Z`
- session_key: `sk-20260401-approval-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d496f-b79a-7412-95c7-596844f5c2a6`
- request_id: `0`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `server_requests/server-request-0001.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0005.json`
- summary: Command execution approval occurred with `approvalPolicy = untrusted`, and `turn/interrupt` was sent without returning client approval reply. While pending, `thread.status = active(waitingOnApproval)` was visible in thread/read, but the approval request itself was not materialized into history. After the interrupt, neither the final `agentMessage` nor the `commandExecution` item was issued, and the turn ended with `interrupted`. `serverRequest/resolved` again returned only `requestId`, and neither the resolution type nor `resolved_at` was known.

## Judgments

### `approval_id`

- Judgment: Pending, but can proceed 
- Reason: Top-level `id = 0` of `server_requests/server-request-0001.json` and `serverRequest/resolved.params.requestId = 0` of `stream/events.ndjson` matched. 
- app Completion required: Not required in this case alone. It is necessary to confirm whether the same stability can be obtained in the case of stop proximity. 
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
- Rationale: There is no timestamp field in the approval requests of `server_requests/server-request-0001.json` and `stream/events.ndjson`. `updatedAt = 1775053562` of pending `thread/read` is the thread update time, not exclusive to request. 
- app Completion required: Required 
- Supplement: The timestamp per request cannot be directly stored using the native event payload alone. 
- Default judgment when pending: Unless native is present, the reception time of app runtime is retained as a `requested_at` candidate.

### `resolved_at`

- Judgment: Incomplete 
- Rationale: `serverRequest/resolved` in `stream/events.ndjson` only has `threadId` and `requestId`, and there is no dedicated timestamp for resolved. `updatedAt = 1775053562` of final `thread/read` also remains at the thread update time. 
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
- Reason: `serverRequest/resolved` with `requestId = 0` appeared after `turn/completed` in `stream/events.ndjson`, but this notification itself does not have a resolution enum or `resolved_at`, and there is no client approval reply. 
- app Completion required: Required 
- Note: Unlike approve / deny, in this case the dedicated native payload indicating resolution by stop is not visible. 
- Default judgment when pending: `approval.resolved` is not determined by `serverRequest/resolved` alone, but assumes that stop during approval is correlated separately in app runtime.

### `waiting_approval`

- Judgment: Pending but can be preceded 
- Reason: `status.type = active` and `activeFlags = ["waitingOnApproval"]` appear in `thread/status/changed` of `stream/events.ndjson`, and the same status appears in `thread/read` of `responses/response-0003.json` was able to be reacquired. 
- app Completion required: Not required 
- Note: Even if the pending approval body was not in the history, the status could be confirmed by re-acquiring the history. 
- Default decision on pending: Treat `active + waitingOnApproval` as the native basis for `waiting_approval`.

### `Difference between normal stop and stop during approval`

- Judgment: Pending but can be preceded 
- Rationale: In this case, there was `waitingOnApproval` before stop, and after interrupt, `commandExecution` item started/completed did not appear at all, and `serverRequest/resolved` appeared after `turn/completed`. 
- app Completion required: It is necessary to compare with the normal stop case 
- Note: In deny, `commandExecution.status = declined` appeared after `serverRequest/resolved`, but in stop during approval, the item itself was not materialized. 
- Default judgment when on hold: During approval, stop is treated as a different series from deny and normal stop, and at least branches depending on the presence or absence of `waitingOnApproval`.

### `stopped`

- Judgment: Pending, but can be preceded 
- Rationale: `responses/response-0004.json` succeeded in response to `turn/interrupt` of `requests/request-0004.json`, and then `turn/completed` returned to `status = interrupted` and thread returned to `idle`. 
- app Completion required: Normally stop until case comparison is required 
- Note: During approval, the native turn termination form of stop is `interrupted`, which is the same as deny, but approval reply and `commandExecution` lifecycle are missing. 
- Default judgment when suspended: Treat `turn.status = interrupted` at the origin of `turn/interrupt` as a `stopped` candidate, and reconfirm normally in the stop case.

### `completed`

- Judgment: Rejected 
- Rationale: In final `thread/read`, thread is `idle`, but turn ends with `status = interrupted`, and final `agentMessage` is not generated. 
- app Completion required: Not required 
- Note: There is a clear difference from `turn.status = completed` of approval approval. 
- Default judgment when on hold: During approval, `idle` after stop is not treated as terminal `completed`, but as a waiting state after the completion of interrupted turn.

### `Can approval be treated as canceled when it is stopped during approval?`

- Judgment: Incomplete 
- Rationale: There is no client approval reply in native, and `serverRequest/resolved` does not return the resolution type. It is not directly clear from the payload how approval is resolved by stop. 
- app Completion required: Required 
- Supplement: At least with this native fact alone, `canceled`, which is the same as deny, cannot be safely determined. 
- Default judgment when on hold: During approval, stop does not conclude that the approval is `canceled`, and it is put on hold until the app runtime's stop origin correlation is received.

### `Approval history redetection`

- Judgment: Rejected 
- Rationale: `turns[*].items` of `history/history-0003.json` and `history/history-0005.json` only had `userMessage` and commentary `agentMessage`, and the approval request payload, request id, and stop resolution could not be reconstructed. 
- app Completion required: Required
- Supplement: Only history could rebuild up to `waitingOnApproval` status and interrupted turn. 
- Default judgment when pending: Approval resource and stable request mapping are assumed to be maintained on the app runtime side.

### `session start`

- Judgment: Pending, but can be preceded 
- Rationale: In this case too, `thread/start` acted as a create primitive to create an idle thread, and the actual start of the activity occurred at `turn/start`. The approval observation does not overturn the Phase 2 create/start primary judgment. 
- Necessity of app completion: Necessary as a façade action 
- Note: Even after introducing approval, we have not observed any native primitives with start without input. 
- Default judgment when on hold: `session start` continues assuming App-owned façade action.

## Open Questions

- Is it a combination of `turn.status = interrupted` and `thread.status = idle` even for normal stop? 
- Is it stable behavior that `serverRequest/resolved` appears after `turn/completed` during stop during approval? 
- Do we need additional app-owned correlations to safely map stop during approval to approval `canceled`?

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`
- server_requests: `server_requests/server-request-0001.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0005.json`
