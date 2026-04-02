# Judgment memo

## Case Info

- case_name: `p2-multi-turn-follow-up`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T07-04-35.534577Z-r01`
- executed_at_utc: `2026-04-01T07:04:35.534577Z`
- session_key: `sk-20260401-baseline-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.117.0`
- thread_id: `019d47dc-87a8-7af0-a53e-81cc548f9912`
- request_id: `unknown`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`, `stream/events.ndjson`, `history/history-0003.json`, `history/history-0005.json`
- summary: 2 turns were completed in the same thread. `thread_id` is also reused in follow-up user messages, and `thread/status/changed` transitions as `active -> idle -> active -> idle`. The stream/history mismatch of message item id was also reproduced in the second turn.

## Judgments

### `session_id`

- Judgment: Pending but possible to proceed 
- Rationale: `thread_id = 019d47dc-87a8-7af0-a53e-81cc548f9912` is maintained in both turn1 and turn2, and `responses/response-0003.json` and `thread.id` of `responses/response-0005.json` was also the same. 
- Note: Since thread reuse was confirmed even with follow-up turn, the `session_id = native thread ID` candidate is stronger than in the previous case. 
- Default decision when pending: In the preliminary implementation of Phase 2, we will proceed with `session_id = native thread ID` as a candidate for adoption.

### `message_id`

- Judgment: Rejected 
- Reason: In both turn1 and turn2, the user/assistant item id on the stream side and the item id from `item-1` on the history side did not match. 
- Note: The discrepancy was not reproduced in a single turn, but also in multiple turns. 
- Default decision when holding: Use app-owned stable message_id and keep native item id as source metadata.

### `turn_id`

- Judgment: Pending, but can proceed 
- Reason: `turn1_id` and `turn2_id` are different values, and within each turn, response / stream / history matched. 
- Supplement: It seems to be useful for boundary identification for each turn, but request linking and exposure to public contract are still pending. 
- Default decision when holding: Keep as a strong candidate for internal/debug.

### `event_id`

- Judgment: Rejected
- Reason: Native `event_id` never appeared even in 2 turns of notifications. 
- Note: Stable event identifiers other than line order and method name cannot be observed. 
- Default judgment when on hold: Assign an app-owned opaque event ID.

### `message.user`

- Judgment: Pending, but can proceed 
- Rationale: Both turn1 and turn2 had a complete payload in `item/completed` with `item.type = userMessage`. 
- Note: The same pattern was reproduced on the follow-up turn. 
- Default judgment when pending: `item/completed` with `item.type = userMessage` is the primary candidate for `message.user`.

### `message.assistant.delta`

- Judgment: Pending, but can proceed 
- Reason: `item/agentMessage/delta` appeared three times in both turn1 and turn2, and an increment text was hung on the same `itemId`. 
- Note: The agent message item ID for each turn is different, but the delta group is combined into one itemId within the turn. 
- Default judgment when pending: Treat `item/agentMessage/delta` as the primary candidate for assistant streaming delta.

### `message.assistant.completed`

- Judgment: Pending, but can proceed 
- Rationale: In both turn1 and turn2, `item/completed` with `item.type = agentMessage` has the final text, which matches the text on the history side. 
- Note: The mismatch between stream item id and history item id when completed continued. 
- Default judgment when pending: `item/completed` with `item.type = agentMessage` is the primary candidate for `message.assistant.completed`.

### `running`

- Judgment: Pending, but can proceed 
- Reason: `thread/status/changed` with `status.type = active` appeared both before the start of turn1 and before the start of turn2. 
- Note: `activeFlags` was an empty array in both turns. 
- Default judgment when pending: Treat `thread/status/changed` with `status.type = active` as a `running` candidate.

### `waiting_input`

- Judgment: Pending, but can be preceded 
- Reason: `thread/status/changed` with `status.type = idle` appeared after turn1 was completed, and turn2 could be started in the same thread. The final status was `idle` even after turn2 was completed. 
- Note: I have confirmed that `idle` is ready to accept follow-ups. 
- Default judgment when pending: approval In the non-dependent normal system, `idle` is treated as a `waiting_input` candidate.

### `session.status_changed`

- Judgment: Pending, but can be preceded 
- Rationale: `thread/status/changed` directly represents the transition sequence of `active -> idle -> active -> idle`. 
- Note: follow-up turn can also be used as a basis for return. 
- Default decision when pending: adopt `thread/status/changed` as a native candidate for session status change.

## Open Questions

- Unobserved items: native `event_id`, timestamp per item, timestamp per event, initial semantics of turn and create/start without assistant message. 
- Re-observe in subsequent phase case: `p2-no-assistant-message`, `p2-create-start-semantics`

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `requests/request-0004.json`, `requests/request-0005.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `responses/response-0004.json`, `responses/response-0005.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`, `history/history-0005.json`
