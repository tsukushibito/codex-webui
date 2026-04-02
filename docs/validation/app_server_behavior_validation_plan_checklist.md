# app-server behavior check execution plan (revised version)

## 1. Purpose

Observe the actual behavior of `codex app-server` and determine the following.

- Which native ID can be adopted as is?
- Which native signal / event can be mapped to an internal/public event?
- How should `session create` and `session start` be separated in implementation?
- What should be used to determine `running -> waiting_input`?
- What should be used to determine whether approval is pending/resolved?
- `completed` / Can `failed` / `stopped` be determined only by native?
- Even if a client has never seen a stream, can the message / approval / latest state be reconstructed just by re-fetching the history?
- What is the minimum value that should be retained in app-owned?

## 2. Design decisions you want to make in this task

### RequiredConfirm

- Should it be `session_id = native thread ID`?
- Should it be `message_id = native item ID`? 
- Should it be `approval_id = native request ID`? 
- Is it confirmed with `sequence = app-owned`?
- Should `session start` be treated as an App-owned façade action?
- `session.status` How to set the transition conditions for 
- Is it possible to re-detect the approval from the history? What native facts should be used to assemble the **minimum confirmation information** for 
- approval?

### Conditional confirmation

- Is it worth having `turn_id` as internal only?
- Should `event_id` be used as native or app-owned?

### Items that can be moved forward even if they are on hold

- `turn_id` is for debug / internal assistance only if stability is weak
- `event_id` is for app-owned opaque ID
- `approval_id` is for runtime stable key
- if native has no stable ID. `session start` is for app-owned façade action
- if native primitive is weak. app-owned if native has no clear stable sequence number

## 3. Scope

### Included

- ID and history of thread / turn / item / request
- Type and order of native signal / event
- Behavior of approval request / resolve / stop
- stream Reacquisition of history after disconnection
- stream Reacquisition of history at the time of first load without connection
- status Observations required for mapping
- create / start / stop semantics
- of item / request / event / history timestamp
- approval Native source of minimum confirmation information 
- approval Native source of post-resolution metadata

### Not applicable

- UI details 
- keepalive
- public API formatting 
- full-fledged DB implementation 
- final implementation of idempotency 
- details of pagination and limit

## 4. Implementation method

Use the observation spike to interact directly with the app-server and save the following:

- request / response
- event stream
- history reacquisition result 
- case name 
- time 
- order of events within the same thread

This is not for actual implementation, but for observation only.

In Phase 1, the following operations are fixed.

- Original copies of artifacts and raw trails are placed in `artifacts/app_server_observability/` in the repo.
- Storage unit is `case_name / run_key`.
- `run_key` is made unique by high-resolution UTC time and nonce, and re-observed tasks Phase is left in metadata.
- `session_key` is a grouping key assigned by the observer, and is not equated with native `session_id` or `thread_id` 
- Request / response / history are matched with the same numbering, and stream is saved in chronological order for each case 
- Judgment memo is left with 4 values: ``accepted / rejected / pending but can be preceded / uncompleted''

## 5. Implementation phase

### Phase 1: Base case observation

Usually 1 turn and a turn without assistant text are observed.

Things to check:

- Can I get the thread ID?
- Can I get the turn ID? 
- Can I get the user item / assistant item ID? 
- How are delta and completed? 
- Can multiple assistant message items be generated in the same turn? 
- Is there a turn that ends with only tool/log/request? 
- Can I determine that it is "continuable" after the turn is completed? Is there 
- Is the time added to item / event / history?

### Phase 2: create / start semantics observation

Check how to put `session create` and `session start`.

Things to check:

- Is it possible to put a native thread in idle just by creating it?
- Is there a stable operation like `start without input`?
- If not, should `session start` be treated as a pure app-owned state transition? 
- Can the app side safely have `created` immediately after thread creation?

### Phase 3: approval case observation

Generate and observe approval.

Things to check:

- Is there a request ID?
- What can be taken as the approval content? 
- What native facts remain after approve / deny / stop? 
- Can a pending request be re-detected from the history? 
- Can a resolved request be reconstructed from the history? 
- Does the request / resolution have a time? 
- **What is the source of the minimum confirmation information for approval?**
 - Equivalent to `approval_category` 
 - Equivalent to `title / summary` 
 - Equivalent to `description / reason` 
 - Equivalent to `operation_summary` 
 - Equivalent to `requested_at` 
- **What is the source of metadata after resolution of approval?**
 - Equivalent to `resolved_at`

### Phase 4: stop / abnormal / terminal observation

Observe cases that include outages and failures.

Things to check:

- How is stop reflected in native?
- Is there a basis for placing `stopped`?
- Can we distinguish between temporary failure and terminal failure?
- Can `completed` be placed only in native?
- If only native is not enough, is a runtime judgment necessary?

### Phase 5: Reacquisition/reconstruction observation

See how far you can go back just by re-acquiring the history, both in the case of cutting the stream and in the first load where the stream has never been seen.

Things to check:

- Can messages be reconstructed from history? 
- Can approvals be reconstructed from history? 
- Can we distinguish between pending / resolved? 
- Can we re-estimate the latest state? 
- Should `sequence` be app-owned rather than native? 
- Is it easy to obtain a stable order based on time alone? 
- Same thread / Same request Is time reliable as an aid to ordering within 
-stream Can unconnected clients restore it for the first time?

## 6. Priority case

Minimum case:

1. Normal 1 turn completed 
2. assistant No text turn
3. Multiple turns continued 
4. approval occurred → approve
5. approval occurred → deny
6. approval occurring → stop
7. temporary failure case 
8. stream disconnected → history reacquisition 
9. stream unconnected first load → Restoration by re-acquiring history only

If you have the energy:

- Case where stop and approval resolve are close to each other

## 7. Completion conditions

It ends when the next one is filled.

- ID stability list 
- Native signal / event correspondence table 
- Create / start semantics judgment 
- status Mapping policy 
- approval Possibility of re-detection 
- approval List of sources for minimum confirmation information 
- approval List of sources for post-resolution metadata 
- app-owned List of required items 
- Default judgment when on hold

---

# app-server behavior confirmation checklist (revised version)

## A. Basic log preparation

- [x] Request / response / event / history snapshot can be saved in case units 
- [x] Case name and UTC execution time can be added and saved 
- [x] Can be tracked in both time order and request order 
- [x] `session_key` / `thread_id` / `request_id` can be associated and tracked in thread units

## B. ID stability check

- [x] Thread ID can be obtained 
- [x] Thread ID is the same even after re-obtaining 
- [x] User item ID can be obtained 
- [x] assistant item ID can be obtained 
- [x] Confirmed whether request ID can be obtained 
- [ ] Request ID is pending / resolved Confirmed whether it is the same when re-obtaining 
- [x] turn ID 
- [x] Confirmed whether turn ID can be used for completion determination and request linking 
- [x] Confirmed whether event ID can be acquired 
- [x] Confirmed whether event ID is worth using as a stable contract

## C. Normal turn confirmation

- [x] Confirmed what is generated when sending a user message 
- [x] Confirmed signal / event of assistant delta 
- [x] Confirmed signal / event of assistant completed 
- [x] Confirmed whether delta and completed are connected to the same message 
- [x] Confirmed whether multiple assistant items can be generated in the same turn 
- [x] turn Confirmed the signal indicating completion 
- [x] Confirmed the basis for returning to `running -> waiting_input` 
- [x] Observed multiple turn continuation cases 
- [x] Confirmed whether the existing thread will be reused in follow-up user message 
- [x] Confirmed the basis for returning to `waiting_input -> running` in follow-up turn

## D. assistant no text turn confirm

- [x] Observed a turn that ended with only tool/log/request 
- [x] Checked whether the turn could be completed without an assistant message appearing 
- [x] Even in that case, checked whether there is a basis for returning it to `waiting_input` 
- [x] Checked whether it is possible to separate items that are not included in the message projection

## E. create / start confirmation

- [x] Confirmed whether a native thread can be placed in idle by simply creating it 
- [x] Confirmed whether there is a stable operation such as `start without input` 
- [x] If not, determined that `session start` should be an app-owned façade action 
- [x] Confirmed that the `created` state can be safely held on the app side

## F. approval confirmation

- [x] The approval request was generated 
- [x] Confirmed that the minimum 5 items of confirmation information for approval can be obtained from native 
- [x] Confirmed whether the request ID is stable 
- [x] Confirmed the native change after approve 
- [x] Confirmed the native change after deny 
- [x] Confirmed the native change after stop 
- [ ] pending Confirmed whether approval can be redetected by reacquiring the history 
- [ ] Confirmed whether approval can be determined from history from the history 
- [x] Recorded the native source corresponding to `approval_category` 
- [x] Recorded the native source corresponding to `title / summary` 
- [x] Recorded the native source corresponding to `description / reason` 
- [x] 
- recorded the native acquisition source corresponding to `operation_summary` [x] recorded the native acquisition source equivalent to `requested_at` 
- [x] recorded the native acquisition source equivalent to `resolved_at`

## G. signal / event compatibility confirmation

- [x] Decided the native signal corresponding to `message.user` 
- [x] Decided the native signal corresponding to `message.assistant.delta` 
- [x] Decided the native signal corresponding to `message.assistant.completed` 
- [x] Decided the native signal corresponding to `approval.requested` 
- [ ] Decided the native signal corresponding to `approval.resolved` 
- [x] Decided whether to take `session.status_changed` directly from native or generate it in runtime 
- [x] Decided the native signal corresponding to `error.raised`

## H. status mapping confirmation

- [x] Confirmed the basis for `running` 
- [x] Confirmed the basis for `waiting_input` 
- [x] Confirmed the basis for `waiting_approval` 
- [x] Confirmed the basis for `stopped` 
- [x] Confirmed the basis for `failed` 
- [x] Confirmed the basis for `completed` Confirmed whether it can be installed with only native 
- [x] If only native is insufficient, it was determined that runtime judgment is necessary

## I. History reconstruction confirmation

- [x] Messages can be rebuilt without stream 
- [ ] Approvals can be rebuilt without stream 
- [ ] Pending/resolved can be distinguished 
- [x] Latest status There is material for estimation in the history 
- [x] `sequence` can be determined to be app-owned 
- [x] Stream Confirmed whether it can be restored even with an unconnected first load

## J. timestamp confirmation

- [x] Confirmed whether time is attached to item 
- [x] Confirmed whether time is attached to request / resolution 
- [x] Confirmed whether time is attached to event 
- [x] Confirmed whether stable order can be easily obtained by time when reacquiring history 
- [x] Confirmed whether time is reliable as an aid for determining order within the same thread / same request

### Phase 2 First judgment memo

- `session_id` can precede native `thread_id` candidate. 
- `message_id = native item ID` where the same thread is reused even in follow-up turn is more likely to be rejected. The stream side item id and the history side item id do not match 
- `turn_id` is a strong candidate for internal/debug. 
- `event_id` that matches response / stream / history even in multiple turns cannot observe native exposure, and can be preceded with app-owned numbering 
- `message.user` is `item/completed` with `userMessage`, `message.assistant.delta` is `item/agentMessage/delta`, `message.assistant.completed` `item/completed` with `agentMessage` with non-empty text or history materialization is the primary candidate
- No assistant text In turn, even if an empty string `agentMessage` lifecycle appeared in the stream, the assistant message was not materialized in the history in some cases. In public message projection, empty `agentMessage` is the exclusion candidate.
- The primary candidate for `running` / `waiting_input` is `thread/status/changed: active` / `thread/status/changed: idle`
- `thread/start` was enough to create a thread with `idle` / `turns=[]`. Before the first user message, `includeTurns=true` was unavailable, `created` was an app-owned projection candidate 
- item / event / history cannot observe time, and timestamp-dependent order judgment cannot be made at Phase 2.

### Phase 3 First judgment memo

- `request_id` was able to obtain the native server request id in the approval case, and it matched with `serverRequest/resolved.params.requestId` in each case of approve / deny / approval and stop. However, the request object itself is not materialized in the `thread/read` history, and cannot be redetected by reacquiring the history.
- The first candidate for `approval.requested` is the native server request `item/commandExecution/requestApproval`
- `approval.resolved` is not sufficient for `serverRequest/resolved` alone. There is no resolution type or `resolved_at`, and approve / deny cannot be distinguished unless correlated with client reply raw.
- The primary candidate for `waiting_approval` is `thread/status/changed: active[waitingOnApproval]`. I was able to reacquire the same status even with pending `thread/read`
- In the minimum confirmation information for approval, `approval_category`, `title/summary`, and `operation_summary` have native origin candidates. On the other hand, `description / reason`, `requested_at`, `resolved_at` are not filled in the native payload and require app completion
- After approve, `waiting_approval -> active[] -> commandExecution completed -> final agentMessage -> idle`, after deny, `serverRequest/resolved -> commandExecution declined -> active[] -> interrupted -> idle`, approval After middle stop, `interrupted -> idle -> serverRequest/resolved` appeared without client approval reply 
- Normally, stop falls to `turn.status = interrupted` and `thread.status = idle` like stop during approval, but there is no `waitingOnApproval` or `serverRequest/resolved`. `interrupted` alone cannot distinguish between approval canceled and normal stop.
- terminal `completed` cannot be observed as native session status, `idle` after approve is treated as `waiting_input` side, and `idle` after deny/stop is treated as waiting state after interrupted turn completion.
- In `p3-transient-failure`, `item/completed` with `commandExecution.status = failed` `exitCode = 42` was observed, but the turn itself was `completed` and the thread returned to `idle`. It is appropriate to project native command execution failure on the app side as a primary candidate for public `error.raised` instead of terminal `failed`.
- In the same case, neither failed `commandExecution` item nor turn error were materialized in the `thread/read` history, and only final `agentMessage` and `turn.status = completed` remained. Failure systems require stream-derived completion.

### Phase 4 Final Judgment Memo

- In both `p4-stream-disconnect-reload` and `p4-initial-history-only-load`, messages could be reconstructed mainly in history
- In the same two cases, approval request payload, native `request_id`, and approval `itemId` were not materialized into history, and approval resource was history-only. 
- The latest status of pending approval, which could not be reconstructed, could be re-estimated using only history from `thread.status = active[waitingOnApproval]` and latest turn `status = inProgress`.
- `sequence` and `event_id` are not stable with only native. Due to missing approval event and event identity, it is reasonable to assume that it is app-owned 
- `updatedAt` does not change when reloading the same state, and is unreliable as an aid for determining the order within the same thread / same request 
- `preview` may retain the old prompt instead of the latest turn, so if you want to use it for the public session summary, you should consider overlay on the app side.
- `session_id = native thread ID` can be adopted, `message_id = native item ID` cannot be adopted, `approval_id = native request ID` is a debug candidate but is not suitable as a public stable ID 
- `session start` can be determined as an app-owned facade action rather than a native primitive

## K. Final verdict

### RequiredConfirm

- [x] `session_id = native thread ID` Confirm whether to adopt 
- [x] `message_id = native item ID` Confirm whether to adopt 
- [x] `approval_id = native request ID` Confirm whether to adopt 
- [x] Confirm `sequence = app-owned` 
- [x] `session start` to App-owned Façade action Confirmed 
- [x] app-owned Listed the required information 
- [x] approval Listed the sources for obtaining the minimum confirmation information 
- [x] approval Listed the sources for obtaining the metadata after resolution

### Conditional confirmation

- [x] Determine the value of keeping `turn_id` as internal only 
- [x] Determine whether to use `event_id` as native or app-owned.

### Judgment to proceed even if pending

- [x] `turn_id` can be advanced only with debug / internal assistance even if undetermined 
- [x] `event_id` can be advanced with app-owned even if undetermined 
- [x] `approval_id` can be advanced with runtime stable key even if undetermined 
- [x] `session start` can be advanced as façade action even if undetermined

---

# Final deliverable template (revised version)

## 1. ID stability list

### Required

- thread ID 
 - Judgment: Adoption
 - Acquisition availability: Possible
 - Identity after reacquisition: Same for follow-up turn, disconnect reload, initial history-only load
 - `session_id` Reusability: Possible
 - Default judgment when pending: None

- item ID 
 - Judgment: Rejected
 - Can be obtained: Possible
 - `message_id` Can be used: Not 
 - Correspondence with delta/completed: Item id on stream side and item id on history side do not match 
 - Default judgment when pending: Use app-owned message stable key

- request ID 
 - Judgment: Rejected
 - Can be obtained: Possible on approval server request 
 - pending/resolved Identity when reacquired: Same on stream, but disappears when history is reacquired 
 - `approval_id` Possibility of reuse: Not available as a public stable ID 
 - Default judgment when pending: Use runtime stable key

### Conditional

- turn ID 
 - Judgment: Adoption
 - Acquisition availability: Possible 
 - Identity: Stable with response / stream / history / reload 
 - internal only Usage value: High 
 - Default judgment when on hold: Keep only with debug / internal assistance

- event ID 
 - Judgment: Rejected
 - Obtainability: Not possible 
 - Stability: Not observed 
 - Value for diversion: None 
 - Default judgment when pending: Use app-owned event stable key

## 2. Native signal / event correspondence table

- native signal: `item/completed` with `userMessage`
- internal event: `message.user`
- public event: `message.user`
- Supplement: 
- consistent with history materialization Judgment: Adopted

- native signal: `item/agentMessage/delta`
- internal event: `message.assistant.delta`
- public event: `message.assistant.delta`
- Note: stream auxiliary only, cannot be played in history-only 
- Judgment: Adopted

- native signal: non-empty `item/completed` with `agentMessage` or history materialization
- internal event: `message.assistant.completed`
- public event: `message.assistant.completed`
- Note: empty `agentMessage` is a candidate for exclusion from projection
- Judgment: Adopted

- native signal: server request `item/commandExecution/requestApproval`
- internal event: `approval.requested`
- public event: `approval.requested`
- Supplement: runtime snapshot is required because it is not recorded in history
- Judgment: Adopted

- native signal: `serverRequest/resolved` alone is insufficient
- internal event: `approval.resolved`
- public event: `approval.resolved`
- Supplement: resolution type and `resolved_at` need to be complemented with reply client/raw correlation
- Judgment: Pending but can be preceded

- native signal: `item/completed` with `commandExecution.status = failed`
- internal event: `error.raised`
- public event: `error.raised`
- Supplement: 
- not terminal session failed Judgment: Adopted

## 3. create / start semantics judgment

- Can I put it in idle by just creating a native thread? Can I put 
- `start without input` primitive? No 
- Should I make `session start` an app-owned façade action? Should I 
- Decision: Adopt 
- Supplement: `thread/start` is create primitive, activity start is `turn/start`

## 4. status mapping table

- native Observation: `thread/status/changed: active`
- internal/public status: `running`
- Judgment condition: `activeFlags = []`
- runtime Completion required: Not required
- Judgment: Adopted

- native observation: `thread/status/changed: idle` after completed turn
- internal/public status: `waiting_input`
- Judgment condition: Return to idle after completed turn
- runtime Completion required: Not required
- Judgment: Adopted

- native observation: `thread/status/changed: active[waitingOnApproval]`
- internal/public status: `waiting_approval`
- Judgment condition: `waitingOnApproval`
- runtime completion required: Not required
- Judgment: Adopted

- native observation: `turn.status = interrupted` and `thread.status = idle`
- internal/public status: `stopped`
- Judgment condition: stop raw request correlation required 
- runtime completion required: required 
- Judgment: Pending but possible to advance

- native observation: `item/completed` with `commandExecution.status = failed`
- internal/public status: `failed`
- Judgment condition: `error.raised` rather than session terminal 
- runtime completion required on projection side: Required 
- Judgment: Pending but possible to proceed

- native observation: Even after approval, the final state is `idle`
- internal/public status: `completed`
- Judgment condition: Not placed in native session terminal status 
- Runtime completion required: Required 
- Judgment: Rejected

## 5. approval Source of minimum confirmation information

- `approval_category`: request method `item/commandExecution/requestApproval`
- `title / summary`: `params.command` is used for summary 
- `description / reason`: Missing in native. app synthesis from `command` and `cwd` if necessary 
- `operation_summary`: `params.command`, `cwd`, ​​`commandActions`, `availableDecisions`
- `requested_at`: Missing in native. Runtime server request reception time 
- Necessity of app completion if missing: Required

## 6. Approval Source of post-resolution metadata

- `resolved_at`: Missing in native. Runtime client reply / `serverRequest/resolved` Reception time 
- Necessity of app completion if missing: Yes

## 7. app-owned Required field

- `workspace_id`: Recommended to keep for multi-session grouping 
- `sequence`: Required 
- `active_approval_id`: Required 
- session overlay: Required candidate for preview correction and summary for UI 
- idempotency key: Request required candidate for replay / reconnect resistance 
- Approval stable key if necessary: Required candidate 
- If necessary, event stable key: Required candidate

## 8. Default judgment when on hold

- `turn_id` is used only for debug / internal assistance
- `event_id` is app-owned
- `approval_id` is the runtime stable key
- `session start` is App-owned façade action
- `sequence` is app-owned
