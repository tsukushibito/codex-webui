# Judgment memo

## Case Info

- case_name: `p4-stream-disconnect-reload`
- observed_in_tasks_phase: `phase_4`
- run_key: `2026-04-01T15-02-49.912Z-r01`
- executed_at_utc: `2026-04-01T15:02:49.912Z`
- session_key: `sk-20260401-reconstruction-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d4991-9162-7b82-8804-b539df2d37b5`
- request_id: `0`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `requests/request-0006.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `responses/response-0006.json`, `server_requests/server-request-0001.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0005.json`, `history/history-0006.json`
- summary: After observing turn1 completed and turn2 pending approval on the stream, the stream connection was disconnected without returning an approval reply. When I just performed `thread/read(includeTurns=true)` from the new connection B, I was able to re-obtain messages, `thread.status = active[waitingOnApproval]`, and turn2 `status = inProgress`. On the other hand, the approval request payload, native request id, and approval item id were not materialized into history, and the approval resource itself could not be restored.

## Judgments

### `messages rebuild`

- Judgment: Pending, but can go ahead 
- Reason: `userMessage` / final `agentMessage` of turn1 and `userMessage` / commentary `agentMessage` of turn2 could be restored using only `history/history-0006.json`. 
- Note: `history/history-0005.json` before disconnect and `history/history-0006.json` after reload were isomorphic for the message group. 
- Default judgment when on hold: message resource is reconstructed as history principal, and stream is treated as delta auxiliary.

### `approvals rebuild`

- Judgment: Rejected 
- Rationale: The approval request payload, native `request_id = 0`, and approval `itemId` in `server_requests/server-request-0001.json` were not materialized to either `history/history-0005.json` or `history/history-0006.json`. 
- Note: The history side only knows up to `thread.status = active[waitingOnApproval]` and turn2 `status = inProgress`, and the approval object itself cannot be restored. 
- Default judgment when pending: Approval resource is assumed to hold stable key and payload snapshot on the app runtime side.

### `latest status estimate`

- Judgment: Pending, but can proceed 
- Rationale: `thread.status = active[waitingOnApproval]` was able to be reacquired in both `history/history-0005.json` before disconnect and `history/history-0006.json` after reload. 
- Note: Even without the pending approval object, the latest status could be re-estimated using history alone. 
- Default judgment when pending: latest status is restored from `thread.status` and latest turn status.

### `ID stability list`

- Judgment: Pending but can proceed 
- Rationale: `thread_id` and `turn_id` could be reacquired by history reload even after disconnecting. On the other hand, `message_id = native item ID` does not match in stream/history, and `approval_id = native request ID` cannot be retrieved again in history. 
- Note: JSON-RPC request id does not become a stable key because transport request id was reinitialized in connection B. 
- Default judgment when pending: `session_id = native thread ID` is more likely to be adopted, and `message_id` and `approval_id` are left on hold with app-owned completion assumption.

### `sequence`

- Judgment: Pending, but can be preceded 
- Rationale: Although the item array order can be obtained in history, the approval request itself is missing, and the event sequence on stream cannot be completely reproduced. 
- Note: `history/history-0006.json` alone cannot restore the fact that the approval request came after the turn2 commentary in an ordered manner. 
- Default judgment when pending: `sequence` is assumed to be app-owned.

### `event_id`

- Judgment: Pending, but can proceed 
- Rationale: The native `event_id` was not exposed this time either, and there was no way to reconstruct the event identity from the history after disconnect. 
- Supplement: Only the state and items were restored, and the identity of the stream notification unit does not remain. 
- Default judgment when on hold: `event_id` is assumed to be app-owned.

### `signal/event correspondence final table`

- Judgment: Pending but can be preceded 
- Rationale: `message.user` and `message.assistant.completed` can be traced by history reload, but `approval.requested` only appears in `item/commandExecution/requestApproval` of stream. 
- Note: `error.raised` is not applicable in this case. `approval.resolved` has also not occurred. 
- Default judgment when pending: message type can be reconstructed as history, approval type can be integrated on the premise of stream / runtime snapshot.

### `app-owned required field`

- Judgment: Pending, but can go ahead 
- Rationale: Since the approval payload and request stable key disappear with history alone, at least `active_approval_id`, approval payload snapshot, `sequence`, and event stable key cannot be covered by native alone. 
- Note: Although the necessity of `workspace_id`, session overlay, and idempotency key itself has not been denied in this case, it is safer to perform the final enumeration together with `p4-initial-history-only-load`. 
- Default decision when on hold: Fill in gaps in approval / event / sequence Keep app-owned items as required candidates.

## Open Questions

- Is it possible to restore the pending approval status and messages in the same format even with `p4-initial-history-only-load`? 
- Is it okay to ignore the behavior where `preview` remains at turn1 prompt instead of latest turn as material for rebuilding? 
- Is there a native API that can retrieve request metadata via another route after reloading while approval is pending?

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `requests/request-0006.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `responses/response-0006.json`
- server_requests: `server_requests/server-request-0001.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0005.json`, `history/history-0006.json`
