# Phase 4 Final Decisions

## Summary

Integrate the observation results from Phase 2-4 and fix the following final decisions for use in the public design.

- Adopt native `thread_id` for `session_id`
- Do not adopt native item IDs for `message_id`
- Do not adopt native request IDs for `approval_id`
- `turn_id` is worth retaining for internal/debug use
- `event_id` is app-owned
- `sequence` is app-owned
- `session start` is an app-owned facade action
- Messages can be reconstructed primarily from history
- Approvals cannot be reconstructed from history alone

## Final ID Policy

### `session_id`

- Judgment: adopt
- Source: native `thread_id`
- Evidence: identity remained stable across follow-up turns, disconnect reload, and initial history-only load
- Notes: the same source can be used for both public and internal views

### `message_id`

- Judgment: reject
- Candidate source: native item ID
- Evidence: the item ID seen in the stream does not match the item ID in history
- Notes: use an app-owned stable key for public exposure

### `approval_id`

- Judgment: reject
- Candidate source: native server request ID
- Evidence: it is stable on the stream but disappears when history is re-fetched
- Notes: it can be used for debug correlation, but a runtime stable key is required for a public stable ID

### `turn_id`

- Judgment: adopt
- Usage: internal/debug only
- Evidence: it matched across response / stream / history / reload
- Notes: do not use it as the primary ID in the public API

### `event_id`

- Judgment: reject
- Candidate source: native event identity
- Evidence: native `event_id` was not observed, and event identity cannot be reconstructed from history
- Notes: use an app-owned stable event key

## Final Signal And Status Mapping

### Message Events

- `message.user`: `item/completed` with `userMessage`
- `message.assistant.delta`: `item/agentMessage/delta`
- `message.assistant.completed`: non-empty `item/completed` with `agentMessage`, or history materialization
- Notes: empty `agentMessage` is a candidate for exclusion from the public projection

### Approval Events

- `approval.requested`: server request `item/commandExecution/requestApproval`
- `approval.resolved`: `serverRequest/resolved` alone is insufficient; client reply/raw correlation is required
- Notes: with history only, neither the approval resource nor the resolution metadata can be reconstructed

### Error Events

- `error.raised`: `item/completed` with `commandExecution.status = failed`
- Notes: keep it separate from terminal session `failed`

### Status Mapping

- `running`: `thread.status = active` with empty `activeFlags`
- `waiting_input`: `thread.status = idle` after a completed turn
- `waiting_approval`: `thread.status = active[waitingOnApproval]`
- `stopped`: `turn.status = interrupted` alone is insufficient; correlation with stop-related raw requests is required
- `failed`: treated as a runtime projection, not a native terminal session status
- `completed`: do not adopt as a native terminal session status

## History Reconstruction Limits

### Reconstructable From History

- completed user/assistant messages
- In-progress commentary message
- latest `thread.status`
- latest `turn.status`
- thread / turn identity

### Not Reconstructable From History Alone

- Approval request payload
- Native approval request ID
- Approval item ID
- Approval resolution metadata
- Event sequence
- Event identity

### Timestamp Conclusion

- Thread-level `updatedAt` can be used to confirm reloading of the latest state
- It cannot be used to determine event / item ordering within the same state
- Dedicated timestamps for items / approvals / events were not observed

## App-Owned Required Fields

- `sequence`
- `active_approval_id`
- approval payload snapshot
- approval stable key
- event stable key
- message stable key
- session overlay
- idempotency key
- `workspace_id`

## Spec Delta Candidates

- Do not base the approval public resource on native history reconstruction; use the runtime snapshot as the source of truth
- Make the message public resource history-led, with stream serving only as delta assistance
- State explicitly that `session start` is a facade action decoupled from any native primitive
- State explicitly that `sequence` and `event_id` are app-owned rather than native-derived
- Do not conflate `completed` / `failed` with native terminal session statuses

## Cross References

- [p2-normal-turn-complete](/workspace/repos/codex-webui/artifacts/app_server_observability/observations/p2-normal-turn-complete/2026-04-01T06-39-35.575874Z-r01/judgment.md)
- [p3-approval-approve](/workspace/repos/codex-webui/artifacts/app_server_observability/observations/p3-approval-approve/2026-04-01T11-29-50.497538Z-r01/judgment.md)
- [p3-transient-failure](/workspace/repos/codex-webui/artifacts/app_server_observability/observations/p3-transient-failure/2026-04-01T14-48-00.993Z-r01/judgment.md)
- [p4-stream-disconnect-reload](/workspace/repos/codex-webui/artifacts/app_server_observability/observations/p4-stream-disconnect-reload/2026-04-01T15-02-49.912Z-r01/judgment.md)
- [p4-initial-history-only-load](/workspace/repos/codex-webui/artifacts/app_server_observability/observations/p4-initial-history-only-load/2026-04-01T17-37-18.207745Z-r01/judgment.md)
