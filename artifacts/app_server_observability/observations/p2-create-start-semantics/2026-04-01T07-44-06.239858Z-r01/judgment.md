# Judgment memo

## Case Info

- case_name: `p2-create-start-semantics`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T07-44-06.239858Z-r01`
- executed_at_utc: `2026-04-01T07:44:06.239858Z`
- session_key: `sk-20260401-baseline-01`
- app_server_version: `unknown`
- runtime_version: `codex-cli 0.117.0`
- thread_id: `019d4800-6e58-7fe1-991b-b333453f8b47`
- request_id: `unknown`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `stream/events.ndjson`, `history/history-0003.json`
- summary: `idle` thread was created just by `thread/start`. First user message Before, readback of `includeTurns=true` was unavailable and the thread was not materialized yet. If `includeTurns=false`, it could be reacquired as a thread of `idle` / `turns=[]`.

## Judgments

### Basic semantics of `session create / start`

- Judgment: Pending, but can be preceded 
- Reason: Immediately after `thread/start` in `responses/response-0001.json`, a thread with `status.type = idle`, `turns = []` is returned, and the same thread is `idle` / `turns = []` in `responses/response-0003.json`. I was able to reacquire it. 
- Note: With the current native surface, you can get an idle container just by creating a thread. On the other hand, an independent primitive that starts a turn without input is not visible in this observation. 
- Default judgment when on hold: treat native `thread/start` as equivalent to create, and proceed with public `session start` as an App-owned façade action candidate.

### `created`

- Judgment: Pending, but can be preceded 
- Rationale: The thread before the first user message existed in `idle`, and history acquisition with `includeTurns=true` was unavailable, so the stage before turn/materialization exists in native. 
- Note: Since native status itself is `idle`, `created` of App is not a mapping of native status but an app-owned projection. 
- Default judgment when pending: On the app side, the period from immediately after `thread/start` to before the first user message is considered to be a safe candidate for holding as `created`.

### `session_id`

- Judgment: Pending, but can proceed 
- Rationale: `thread_id` immediately after create matched in `thread/start` response and `thread/read` readback. 
- Note: Combined with follow-up case, `session_id = native thread ID` is a strong candidate. 
- Default judgment when pending: `session_id = native thread ID` Keep as a candidate.

### `running`

- Judgment: Pending but can be preceded 
- Rationale: In this case where input is not sent, `thread/status/changed` with `active` never appeared. 
- Supplement: Activation is most likely linked to the start of turn. 
- Default judgment when pending: No input Immediately after create, treat `active` observed in the normal system as a `running` candidate instead of `running`.

### `waiting_input`

- Judgment: Pending, but possible to proceed 
- Rationale: Immediately after create, `status.type = idle` was stable, and idle was established even when turn had not started. 
- Supplement: It is up to the design decision of the app-owned projection whether to completely equate this `idle` with `waiting_input` or separate it from `created` on the app. 
- Default judgment when pending: Since native `idle` also appears immediately after create, `created` and `waiting_input` are publicly separated, and native `idle` alone is not used to distinguish them.

### `session.status_changed`

- Judgment: Pending, but can proceed 
- Rationale: In this case, `thread/started` was visible, but `thread/status/changed` was not displayed. It seems that if there is no change in status, no notification will be issued. 
- Supplement: `thread/status/changed` observed in the normal turn case can be interpreted as a state transition notification when the turn is executed. 
- Default judgment when pending: `thread/status/changed` is the native candidate when there is a state transition, and the initial establishment immediately after create is handled using `thread/started` and response together.

## Open Questions

- Unobserved: turn assistant message not displayed, native turn start without input primitive, item/event timestamp, native `event_id`. 
- Re-observe in subsequent phase case: `p2-no-assistant-message`

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`
