# Phase 3: approval / stop / terminal observation

## 1. Purpose

Observe the basis for approval system and terminal status system judgments together and isolate the information that should be supplemented by runtime.  
This phase enables implementation decisions including approval/stop/abnormality/termination.

## 2. Design decisions finalized during this phase

- Adoption of `approval_id = native request ID` 
- Pending / resolved of request ID Identity when reacquiring 
- approval Minimum confirmation information 5 items of native acquisition source 
- Native acquisition source of `resolved_at` 
- History of pending / resolved Possibility of redetection 
- `approval.requested` / Correspondence candidates for `approval.resolved`
- Basis for `waiting_approval`
- Observed difference between normal stop and stop during approval
- Basis for `stopped` / `completed`
- Should `session start` be an app-owned façade action?
- Correspondence candidates for `error.raised`
- Reason for `failed`
- Is it possible to distinguish between temporary failure and terminal failure?

## 3. Target case

Required case:

- `p3-approval-approve`: Approval occurring -> approve
- `p3-approval-deny`: Approval occurring -> deny
- `p3-approval-stop`: Approval occurring -> stop
- `p3-stop-during-running`: Normal running without approval -> stop

Conditionally required case:

- `p3-transient-failure`: `failed` / `error.raised` / Required when updating the distinction between transient and terminal failures

Optional case:

- `p3-stop-close-to-approval-resolve`: Case where stop and approval resolve are close

If `p3-transient-failure` is not observed, `failed` / `error.raised` / `Temporary failure / Terminal failure distinction` will remain as an unfinished item in Phase 3, and the corresponding item in `docs/...checklist` will not be updated. 
When putting `p3-stop-close-to-approval-resolve` on hold, leave the reason for the hold and the default decision for the time being.

## 4. Preconditions

- Session/message basic decisions up to Phase 2 have been recorded 
- Inputs or operations that stably generate approval are defined 
- Cases where stop can be pressed during normal execution are defined

## 5. Implementation tasks

- [ ] Fix the approval generation procedure 
- [ ] Execute `p3-approval-approve` 
- [ ] Execute `p3-approval-deny` 
- [ ] Execute `p3-approval-stop` 
- [ ] Execute `p3-stop-during-running` 
- [ ] Run `p3-transient-failure` to update `failed` / `error.raised` 
- [ ] Run `p3-stop-close-to-approval-resolve` if available 
- [ ] Compare stream and history in all cases 
- [ ] request ID is pending / resolved Check if it is the same when re-acquiring 
- [ ] Organize the source of approval request / resolution 
- [ ] Organize the correspondence candidates for approval signal 
- [ ] Organize the difference between normal stop and stop during approval 
- [ ] If `p3-transient-failure` is observed, organize the correspondence candidates for error signal 
- [ ] If you observe `p3-transient-failure`, organize whether it is possible to distinguish between temporary failure and terminal failure.
- [ ] If you observe `p3-transient-failure`, organize the terminal status judgment basis for `stopped` / `completed`.
- [ ] If you observe `p3-transient-failure`, organize the terminal status judgment basis for `failed`.
- [ ] Organize the judgment basis for `session start`. Phase 2 create / start Connect from initial decision

## 6. Check items

### approval

- [ ] Generated approval request 
- [ ] Confirmed whether request ID can be obtained 
- [ ] Confirmed whether request ID is stable 
- [ ] Confirmed whether request ID remains the same when re-obtaining pending/resolved 
- [ ] Confirmed whether minimum confirmation information 5 items for approval can be obtained from native 
- [ ] Confirmed changes in native after approval 
- [ ] Confirmed the native change after deny 
- [ ] Confirmed the native change after stop during approval 
- [ ] Confirmed whether pending approval can be redetected by reacquiring history 
- [ ] Confirmed whether resolved approval can be determined from history 
- [ ] `requested_at` Recorded the corresponding acquisition source 
- [ ] `resolved_at` 
- [ ] Confirmed the signal / event of `approval.requested` 
- [ ] Confirmed the signal / event of `approval.resolved`

### stop / failure / terminal status

- [ ] Confirmed the native change after stop during normal execution 
- [ ] Confirmed the difference between stop and normal stop during approval 
- [ ] Confirmed the basis for `waiting_approval` 
- [ ] Confirmed the basis for `stopped` 
- [ ] Confirmed whether `completed` can be placed with only native 
- [ ] native 
- [ ] If you observed `p3-transient-failure`, you checked the basis for `failed`. 
- [ ] If you observed `p3-transient-failure`, you checked whether you could distinguish between a temporary failure and a terminal failure. Checked signal / event for `error.raised`

### semantics

- [ ] I was able to decide whether `session start` should be an App-owned façade action 
- [ ] I confirmed the basis for returning it to `waiting_input` after resolution of approval 
- [ ] I confirmed the basis for treating approval as `canceled` when it is stopped during approval 
- [ ] I confirmed the policy not to confuse stop with approval `canceled`.

## 7. Trails to be recorded

- approval request raw request / response / event
- approve / deny / approval during stop raw event and history snapshot
- normal stop raw event and history snapshot
- `p3-transient-failure` raw request / response / event / history snapshot
- request ID and resolution fact correspondence memo
- request ID reacquisition identity memo
- Memo for distinguishing between temporary failure and terminal failure
- terminal status Event/history item used for determination
- stop Difference memo for each type

## 8. Judgment column

```md
### <judgment_item_name>
- Judgment:
- Evidence:
- App completion required:
- Notes:
- Default decision while pending:
```

`p3-transient-failure` If the failure system is carried over without being observed, the `judgment` of `failed` / `error.raised` / `distinguishing temporary failure / terminal failure` should be specified as `incomplete`.

At a minimum, leave the following judgment items.

- `approval_id`
- `approval_category`
- `title / summary`
- `description / reason`
- `operation_summary`
- `requested_at`
- `resolved_at`
- `approval.requested`
- `approval.resolved`
- `waiting_approval`
- `Difference between normal stop and stop during approval`
- `stopped`
- `failed`
- `Distinguish between temporary failure/terminal failure`
- `completed`
- `error.raised`
- `session start`

## 9. Completion conditions

- [ ] approval The confirmation section is filled 
- [ ] The re-acquisition identity of the request ID is recorded 
- [ ] approval The list of sources from which to obtain the minimum confirmation information is recorded 
- [ ] The source of acquisition of `requested_at` / `resolved_at` is recorded 
- [ ] The corresponding candidates for approval signal are recorded 
- [ ] Normally stop and approval 
- [ ] `stopped` / `completed` terminal status Determination policy is recorded 
- [ ] When `p3-transient-failure` is observed, raw request / response / event / history snapshot is saved, and `failed` / `error.raised` / `Temporary failure / terminal failure distinction` can be updated 
- [ ] If `p3-transient-failure` is not observed, the reason, re-observation conditions, default judgment on hold, and `judgment: incomplete` are recorded 
- [ ] Approval / stop implementation assumptions including `session start` are fixed.

## 10. Deliverables

- approval / terminal Observation log 
- approval Source list 
- status Judgment memo

## 11. `docs/...checklist` Update target

When completed, update the following in [docs/validation/app_server_behavior_validation_plan_checklist.md](../../../docs/validation/app_server_behavior_validation_plan_checklist.md).

- Request ID relevant part of `B. ID stability confirmation` 
- `F. approval confirmation `
- Approval relevant part of `G. signal / event correspondence confirmation`
- `error.raised` relevant part of `G. signal / event correspondence confirmation` (only when observing `p3-transient-failure`)
- `H. status Mapping confirmation` `waiting_approval`, `stopped`, `completed`, `runtime judgment necessity` relevant part
- `failed` relevant part of `H. status mapping confirmation` (only when `p3-transient-failure` is observed)
- Should `session start of `E. create / start confirmation` be App-owned façade action` Relevant part 
- request / resolution relevant part of `J. timestamp confirmation`
