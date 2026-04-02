# Phase 4: Restructuring/Final Judgment

## 1. Purpose

Check to what extent the state can be restored just by re-fetching the history without depending on the stream, and finalize the app-owned items and the default judgment when pending.  
The purpose of this phase is not to "complete observations" but to "complete design decisions."

## 2. Design decisions finalized during this phase

- Is it possible to rebuild messages without a stream?
- Is it possible to rebuild approvals without a stream?
- Is there evidence for latest status estimation in the history?
- Is it possible to determine the final policy for `session_id` / `message_id` / `approval_id` / `turn_id`? 
- `session start` is App-owned façade action 
- Is it possible to finalize `sequence = app-owned`?
- Can I use `event_id` as native or make it app-owned?
- Can I finalize the ID / signal / status / create-start semantics candidates observed in Phase 2-3? 
- app-owned List of required items 
- Default judgment when pending

## 3. Target case

- `p4-stream-disconnect-reload`: Disconnect stream -> Re-obtain history 
- `p4-initial-history-only-load`: Initial load when stream is not connected -> Only re-obtain history 
- Re-observe prior phase case as necessary

## 4. Preconditions

- Main observations up to Phase 3 have been completed 
- Stream logs and history snapshots are available for comparison 
- Primary judgment memo for Phase 2-3 can be referenced

## 5. Implementation tasks

- [ ] Execute `p4-stream-disconnect-reload` 
- [ ] Execute `p4-initial-history-only-load` 
- [ ] Check whether messages can be reconstructed using history alone 
- [ ] Check whether approvals can be reconstructed using history alone 
- [ ] Check whether latest status can be re-estimated using history alone 
- [ ] Check if timestamp alone can support stable order 
- [ ] ID / signal / status / create-start semantics of Phase 2-3 Final integration of first order judgment 
- [ ] Integrate timestamp observation of Phase 2-3 into order judgment of Phase 4 
- [ ] `session_id` / `message_id` / `approval_id` / `turn_id` Check the final policy for 
- [ ] Confirm the final policy for `session start` 
- [ ] Confirm the final response for `approval.requested` / `approval.resolved` / `error.raised` 
- [ ] Make final decisions on `sequence` and `event_id` 
- [ ] app-owned Finalize the list of required items 
- [ ] Fill in final deliverable template 1-8 
- [ ] Items with insufficient evidence will be sent back to the prior phase and will not be finalized as they remain unobserved.

## 6. Check items

### Rebuild

- [ ] Messages can be rebuilt without a stream 
- [ ] Approvals can be rebuilt without a stream 
- [ ] Pending/resolved can be distinguished 
- [ ] Latest status Information for estimation is in the history 
- [ ] Stream Can be restored even with an unconnected initial load

### Order

- [ ] It can be determined that `sequence` should be app-owned 
- [ ] It can be determined whether the event ID is native diversion or app-owned 
- [ ] Confirmed whether a stable order can be easily obtained by time when reacquiring the history 
- [ ] Confirmed whether time can be relied upon as an aid for determining order within the same thread / same request

### app-owned

- [ ] app-owned 
- [ ] At least `workspace_id`, `sequence`, `active_approval_id`, session overlay, and idempotency key were evaluated 
- [ ] If necessary, 
- listed the conditions for approval stable key / event stable key to be app-owned [ ] 
- listed default judgment when pending [ ] spec Listed the differences necessary for updating

### Final integration

- [ ] The final policy for `session_id` / `message_id` / `approval_id` / `turn_id` has been decided 
- [ ] The final policy for `session start` has been decided 
- [ ] The final policy for `message.user` / `message.assistant.*` has been decided 
- [ ] `approval.requested` / Finalized the handling of `approval.resolved` / `error.raised` 
- [ ] Finalized the handling of `session.status_changed` 
- [ ] Made the judgments of `running` / `waiting_input` / `waiting_approval` / `stopped` / `failed` / `completed` consistent 
- [ ] The final policy of `event_id` is tied to the observation basis of Phase 2-3 
- [ ] Unobserved items are not finalized by mistake.

## 7. Trails to be recorded

- Raw event before and after stream disconnection
- History snapshot
- of the same case Memo of the judgment procedure used during restoration
- Basis for judgment of `sequence` / `event_id` / app-owned item
- Reason for promoting or returning the initial judgment in Phase 2-3 to final judgment

## 8. Judgment column

```md
### <judgment_item_name>
- Judgment:
- Evidence:
- Notes:
- Default decision while pending:
```

At a minimum, leave the following judgment items.

- `messages Reconstruction`
- `approvals Reconstruction`
- `latest status Estimation`
- `ID Stability List`
- `create / start semantics`
- `sequence`
- `event_id`
- `signal / event Correspondence final table`
- `app-owned required field`

## 9. Completion conditions

- [ ] The history reconstruction section is filled 
- [ ] The timestamp perspective of the order section is filled 
- [ ] The timestamp observations of Phase 2-3 and Phase 4 are integrated 
- [ ] The final integration of ID / create-start semantics is recorded 
- [ ] The final integration of signal including approval / error is recorded 
- [ ] Final deliverable template 1-8 is filled in 
- [ ] app-owned The list of required items is clearly stated 
- [ ] Default decisions on hold are recorded 
- [ ] internal spec Update issues are listed 
- [ ] Unobserved items are not mixed into the final confirmation

## 10. Deliverables

- Reconstruction observation log 
- Final judgment memo 
- spec Difference candidate memo

## 11. `docs/...checklist` Update target

When completed, update the following in [docs/validation/app_server_behavior_validation_plan_checklist.md](../docs/validation/app_server_behavior_validation_plan_checklist.md).

- Final judgment including message / approval / error of `G. signal / event correspondence confirmation`
- Final judgment of `H. status mapping confirmation`
- `I. History reconstruction confirmation`
- `J. timestamp confirmation`
- `K. Final judgment `
- `Final product template (revised version)`
