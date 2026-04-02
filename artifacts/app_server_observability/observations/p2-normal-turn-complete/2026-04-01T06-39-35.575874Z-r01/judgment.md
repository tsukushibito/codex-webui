# Judgment memo

## Case Info

- case_name: `p2-normal-turn-complete`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T06-39-35.575874Z-r01`
- executed_at_utc: `2026-04-01T06:39:35.575874Z`
- session_key: `sk-20260401-p2-normal-turn-complete-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.117.0`
- thread_id: `019d47c5-7968-7992-80f3-c6bb56e06bef`
- request_id: `unknown`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `stream/events.ndjson`, `history/history-0003.json`
- summary: Normally 1 turn completion could be observed. `thread_id` and `turn_id` matched in stream / response / history, while message item id did not match in stream and history. Native `event_id` could not be observed.

## Judgments

### `session_id`

- Judgment: Pending but can be preceded 
- Reason: `result.thread.id` of `responses/response-0001.json`, thread notification of `stream/events.ndjson`, `result.thread.id` of `responses/response-0003.json` are all Matched with `019d47c5-7968-7992-80f3-c6bb56e06bef`. 
- Note: Since it is normally seen only in one turn within one thread, identity after reacquisition and follow-up turn reuse must be continuously confirmed in subsequent cases. 
- Default judgment when pending: In the preliminary implementation of Phase 2, `session_id = native thread ID` is treated as a candidate and reconfirmed with `p2-multi-turn-follow-up`.

### `message_id`

- Judgment: Rejected 
- Rationale: The user message / agent message item id in `stream/events.ndjson` are UUID and `msg_*`, respectively, but in `history/history-0003.json`, the same logical message is `item-1` / `item-2`, which do not match. 
- Note: At present, we have not observed a single native item ID that can cross both stream and history. 
- Default decision when holding: Use app-owned stable message_id and keep native item id as source metadata.

### `turn_id`

- Judgment: Pending but can be preceded 
- Reason: `result.turn.id` of `responses/response-0002.json`, `turn/started` / `item/*` / `turn/completed` of `stream/events.ndjson`, `turns[0].id` of `history/history-0003.json` matched. 
- Note: A single turn is consistent enough, but a follow-up case is required to determine if it is really used for completion determination or request binding. 
- Default decision when on hold: Keep as a strong candidate for internal/debug and do not submit to public contract yet.

### `event_id`

- Judgment: Rejected 
- Rationale: All notifications in `stream/events.ndjson` did not have a native `event_id` field, and stable event identifiers other than row order could not be observed. 
- Supplement: There are method names such as `thread/status/changed`, but the event unit ID is not exposed. 
- Default judgment when on hold: Assign an app-owned opaque event ID.

### `message.user`

- Judgment: Pending, but possible to proceed 
- Rationale: `item.type = userMessage` of `item/completed` in `stream/events.ndjson` has a complete payload of user message. 
- Note: The same payload can be seen in `item/started`, but the completed side is easier to handle as a canonical event of projection. 
- Default judgment when pending: `item/completed` with `item.type = userMessage` is the primary candidate for `message.user`.

### `message.assistant.delta`

- Judgment: Pending but can be preceded 
- Reason: `item/agentMessage/delta` appears three times in `stream/events.ndjson`, and `"ob"` for the same `itemId = msg_097661efcf21df110169ccbdd84bbc8191982a89d3ee40b58d`, `"servation"`, `" ok"` was heard. 
- Note: delta is a temporary event exclusive to stream and does not appear in history. 
- Default judgment when pending: Treat `item/agentMessage/delta` as the primary candidate for assistant streaming delta.

### `message.assistant.completed`

- Judgment: Pending but can be preceded 
- Rationale: `item/completed` with `item.type = agentMessage` of `stream/events.ndjson` has the final text `observation ok`, and the content matches the agentMessage of `history/history-0003.json`. 
- Note: Since the stream item id and history item id at the time of completed do not match, the message completion event and message stable ID need to be considered separately. 
- Default judgment when pending: `item/completed` with `item.type = agentMessage` is the primary candidate for `message.assistant.completed`.

### `running`

- Judgment: Pending, but can proceed 
- Rationale: `stream/events.ndjson` had `thread/status/changed` with `status.type = active`, followed by item generation and delta. 
- Note: `activeFlags` was an empty array and was in the active state, not waiting for approval or user input. 
- Default judgment when pending: Treat `thread/status/changed` with `status.type = active` as a `running` candidate.

### `waiting_input`

- Judgment: Pending, but can be preceded 
- Rationale: `thread/status/changed` with `status.type = idle` appears after the completion of the assistant message, and immediately after that, `turn/completed` appears. The final status of `thread/read` was also `idle`. 
- Supplement: Whether `idle` can be equated with `waiting_input`, no-assistant case and multi-turn case are required. 
- Default judgment when pending: approval In non-dependent normal completion, `idle` is treated as a `waiting_input` candidate.

### `session.status_changed`

- Judgment: Pending, but can be preceded 
- Reason: There was a `thread/status/changed` notification in native, and the `active -> idle` transition could be directly observed. 
- Note: The session-only event is not visible, and the current most likely candidate is thread status notification. 
- Default decision when pending: `thread/status/changed` is adopted as a native candidate for session status change and finalized in Phase 4.

## Open Questions

- Unobserved items: native `event_id`, timestamp per item, timestamp per event, thread reuse in follow-up turn, turn without assistant message. 
- Re-observe in subsequent phase case: `p2-multi-turn-follow-up`, `p2-no-assistant-message`, `p2-create-start-semantics`

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`
