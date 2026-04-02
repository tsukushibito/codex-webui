# Judgment memo

## Case Info

- case_name: `p4-initial-history-only-load`
- observed_in_tasks_phase: `phase_4`
- run_key: `2026-04-01T17-37-18.207745Z-r01`
- executed_at_utc: `2026-04-01T17:37:18.205354Z`
- session_key: `sk-20260401-reconstruction-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.118.0`
- thread_id: `019d4a1e-fdcb-7f32-887c-78eedbf4d477`
- request_id: `0`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `server_requests/server-request-0001.json`, `stream/no-stream.md`, `history/history-0004.json`, `history/history-0005.json`
- summary: After creating a pending approval thread in connection A, connection B never subscribed to the stream and only executed `thread/read(includeTurns=true)` from the beginning. I was able to re-obtain turn1 completed messages, turn2 commentary message, `thread.status = active[waitingOnApproval]`, and turn2 `status = inProgress` with just the first read. On the other hand, the approval request payload, native `request_id`, and approval `itemId` were not materialized to history, and the approval resource itself could not be restored even with the first history-only load.

## Judgments

### `messages rebuild`

- Judgment: Pending, but possible to proceed 
- Rationale: `userMessage` / final `agentMessage` of turn1 and `userMessage` / commentary `agentMessage` of turn2 could be reconstructed just by reading `history/history-0004.json` for the first time. 
- Note: The same item group was retained in `history/history-0005.json`, and the message materialization was stable during the first load and reload. 
- Default judgment when on hold: message resource is reconstructed as history principal, and stream is treated as delta auxiliary.

### `approvals rebuild`

- Judgment: Rejected 
- Reason: The approval request payload in `server_requests/server-request-0001.json`, native `request_id = 0`, approval `itemId = call_3Jc2EeQx5rkK9iaCD8MvJOgT` is `history/history-0004.json`. Neither was materialized in `history/history-0005.json`. 
- Note: history-only load only shows `thread.status = active[waitingOnApproval]` and turn2 `status = inProgress`, and the approval object itself cannot be restored. I got the same conclusion as `p4-stream-disconnect-reload`. 
- Default judgment when pending: Approval resource is assumed to hold stable key and payload snapshot on the app runtime side.

### `latest status estimate`

- Judgment: Pending, but can proceed 
- Reason: `thread.status = active[waitingOnApproval]` and turn2 `status = inProgress` were reacquired in the first `thread/read` of connection B. 
- Note: Even without the pending approval object, the latest status itself could be estimated by just the history-only first load. 
- Default judgment when pending: latest status is restored from `thread.status` and latest turn status.

### `ID stability list`

- Judgment: Pending but can proceed 
- Rationale: `thread_id` and `turn_id` matched between setup connection A and history-only connection B. On the other hand, `approval_id = native request ID` and approval `itemId` cannot be reacquired using history, and `message_id = native item ID` does not support the final policy with history item ids alone. 
- Note: In connection B, the transport request id was reinitialized, so the client side JSON-RPC request id does not become a stable key. 
- Default judgment when pending: `session_id = native thread ID` is more likely to be adopted, and `message_id` and `approval_id` are left on hold with app-owned completion assumption.

### `create / start semantics`

- Judgment: Pending, but can be preceded 
- Rationale: In this case as well, `thread/start` is a create primitive that creates an idle thread, and the actual start of the activity occurred at `turn/start` of turn1 / turn2. Additional observations of initial history-only load did not overturn the Phase 2 decision. 
- Note: Even if the pending approval thread can be read from another connection for the first time, an independent primitive equivalent to native `session start` is not observed. 
- Default judgment when on hold: `session start` continues assuming App-owned facade action.

### `sequence`

- Judgment: Pending, but can be preceded 
- Rationale: In history, turn order and item array order can be obtained, but the order of occurrence on stream cannot be completely reproduced because the approval request itself is missing. 
- Supplement: `updatedAt` of `history/history-0004.json` and `history/history-0005.json` are both `1775065050` and do not change, and timestamp does not help in ordering when reloading the same state. 
- Default judgment when pending: `sequence` is assumed to be app-owned.

### `event_id`

- Judgment: Pending, but can proceed 
- Rationale: History-only The native `event_id` was not exposed even in the first load, and there was no material to restore the identity of the notification unit. 
- Note: Only thread / turn / items / latest status could be restored, and event identity cannot be calculated backwards from state. 
- Default judgment when on hold: `event_id` is assumed to be app-owned.

### `signal/event correspondence final table`

- Judgment: Pending, but can be preceded 
- Rationale: `message.user` and `message.assistant.completed` can be tracked by history-only initial load, but `approval.requested` only appears in `server_requests/server-request-0001.json`. 
- Supplement: `approval.resolved` and `error.raised` did not occur in this case. The existence of pending approval can be seen from the status, but the approval event itself cannot be reconstructed. 
- Default judgment when pending: message type can be reconstructed as history, approval type can be integrated on the premise of stream / runtime snapshot.

### `app-owned required field`

- Judgment: Pending, but can go ahead 
- Rationale: history-only The approval payload, `active_approval_id`, and event stable key have disappeared even on the first load, and the pending approval resource cannot be restored for publication using only native. 
- Note: Since `preview` remained at turn1 prompt instead of latest turn, the need for session overlay or app-owned preview correction was also not ruled out. 
- Default decision on hold: Keep at least `active_approval_id`, approval payload snapshot, `sequence`, event stable key, and session overlay if necessary as app-owned mandatory candidates.

### `timestamp / ordering aid`

- Judgment: Rejected 
- Rationale: `history/history-0004.json` and `history/history-0005.json` are the same with `updatedAt = 1775065050`, and there is no timestamp for each item or timestamp for request/approval, and they cannot be used as an aid for determining the order within the same state. 
- Note: Although thread-level `updatedAt` when reacquiring history can be used to reload the latest state, it cannot be used as a stable ordering source for event / item sequence. 
- Default judgment when pending: App-owned `sequence` is used as the original, and timestamp is used as an auxiliary.

## Open Questions

- Is there another native API that can rebuild a pending approval request from a history-only load? 
- Can the behavior of `preview` retaining the first prompt instead of the latest turn be ignored in the public session summary? 
- Even with resolved approval, is there a path to get resolution metadata from the history-only initial load?

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`
- server_requests: `server_requests/server-request-0001.json`
- stream: `stream/no-stream.md`
- history: `history/history-0004.json`, `history/history-0005.json`
