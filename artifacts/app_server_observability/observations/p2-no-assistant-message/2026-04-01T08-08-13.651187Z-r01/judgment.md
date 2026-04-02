# Judgment memo

## Case Info

- case_name: `p2-no-assistant-message`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T08-08-13.651187Z-r01`
- executed_at_utc: `2026-04-01T08:08:13.651187Z`
- session_key: `sk-20260401-baseline-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.117.0`
- thread_id: `019d4816-6ff1-7ca3-927f-4779c96544ff`
- request_id: `unknown`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `stream/events.ndjson`, `history/history-0003.json`
- summary: Turn was completed just by executing the shell command. A `commandExecution` item and an empty string `agentMessage` item appear in the stream, but only `userMessage` remains in the history, which can be treated as a case where the turn completed without an assistant message appearing.

## Judgments

### `Handling a turn without an assistant message`

- Judgment: Pending, but can be preceded 
- Rationale: In `stream/events.ndjson`, the `commandExecution` item was started/completed, and the subsequent `agentMessage` item was also completed with `text = ""`. There was only one turn item in `history/history-0003.json`, `userMessage`, and the assistant message was not materialized. 
- Supplement: Since the empty character agentMessage lifecycle exists in the native stream, it does not mean that there is no agentMessage type notification at all in the stream. The conditions for creating an assistant message in a public message projection seem safer by requiring at least non-empty text or history materialization. 
- Default judgment when pending: empty `agentMessage` is excluded from message projection, and turn without assistant message in history is treated as "completed without assistant message".

### `message.user`

- Judgment: Pending, but possible to proceed 
- Rationale: `item/completed` with `item.type = userMessage` has a complete payload like the normal system, and corresponds to `userMessage` in history. 
- Note: Even in the no-assistant case, the signal candidates on the user side do not change. 
- Default judgment when pending: `item/completed` with `item.type = userMessage` is the primary candidate for `message.user`.

### `message.assistant.completed`

- Judgment: Pending, but can be preceded 
- Rationale: `item/completed` with `item.type = agentMessage` on stream exists, but `text = ""` and item was not materialized on the history side. 
- Note: There are cases where a completed notification alone cannot be promoted to a public assistant message completion event. 
- Default judgment when pending: `message.assistant.completed` is adopted only when accompanied by non-empty text or history materialization, and empty agentMessage completed is excluded.

### `running`

- Judgment: Pending, but can be preceded 
- Reason: `thread/status/changed` with `status.type = active` appeared at the start of turn, indicating that it was running as in the normal system. 
- Note: The running candidate does not change even in the no-assistant case. 
- Default judgment when pending: Treat `thread/status/changed` with `status.type = active` as a `running` candidate.

### `waiting_input`

- Judgment: Pending, but can be preceded 
- Reason: `thread/status/changed` with `status.type = idle` appeared after `commandExecution` completed and empty string agentMessage completed, and even after `turn/completed`, the turn was closed without any assistant message even when history was reacquired. 
- Supplement: Even without assistant text, I found a reason to return to `idle`. 
- Default judgment when pending: treat final `idle` as a `waiting_input` candidate even on turns without assistant text.

### `session.status_changed`

- Judgment: Pending but can be preceded 
- Rationale: `thread/status/changed` indicated `active -> idle` even in the no-assistant case. 
- Note: Functioned as a status change candidate regardless of the presence or absence of assistant text. 
- Default decision on hold: Keep `thread/status/changed` as a native candidate for session status change.

## Open Questions

- Unobserved items: Final policy on how much item/event timestamp, native `event_id`, empty agentMessage should be stored as native facts. 
- Re-observation case in subsequent phase: None. Phase 2 checklist At the time of update, the judgment will be integrated with the normal case.

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`
