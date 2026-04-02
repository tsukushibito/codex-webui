# Archived Task Package: app-server Behavior Validation

This archived package preserves the completed work instructions for app-server behavior validation.

The maintained source of truth for design decisions now lives in [docs/validation/app_server_behavior_validation_plan_checklist.md](../../../docs/validation/app_server_behavior_validation_plan_checklist.md), while observation outputs live in `artifacts/`. Keep this directory as historical reference only.

## 1. Purpose of This Directory

This package defined the staged work instructions that advanced `codex app-server` behavior validation.  
The source of truth for design decisions lives in [docs/validation/app_server_behavior_validation_plan_checklist.md](../../../docs/validation/app_server_behavior_validation_plan_checklist.md), while this archive preserves how the work was executed and judged at the time.

Documents in this directory are responsible for providing the observation procedure and judgment evidence needed to update the source-of-truth checklist.
Any item listed as an update target on the `tasks/` side must include at least one of the following:

- A case to execute
- An observation point to verify
- Evidence to preserve
- A judgment section to leave behind
- A phase completion condition

Do not include any item as an update target if it lacks this support.

## 2. Terms

In this directory, `Phase` refers to a unit of work within `tasks/`.  
It does not match the numbering of the source-of-truth `Phase` values written in [docs/validation/app_server_behavior_validation_plan_checklist.md](../../../docs/validation/app_server_behavior_validation_plan_checklist.md).  
To avoid ambiguity, use the following terminology:

- `tasks Phase N`: a boundary in the work-instruction documents under `tasks/`
- `source-of-truth Phase N`: a boundary in `## 5. Execution Phases` of [docs/validation/app_server_behavior_validation_plan_checklist.md](../../../docs/validation/app_server_behavior_validation_plan_checklist.md)
- `case`: the smallest unit executed as a single observation; each case has a unique case name and execution time
- `required case`: a case that must be observed for the phase to count as complete
- `conditionally required case`: a case that must be observed if the corresponding checklist item is to be updated; if unobserved, leave the item incomplete and do not update it
- `optional case`: a case that improves judgment accuracy when executed, but is not required for phase completion
- `preliminary judgment`: a temporary judgment that may be overturned in a later phase, but may be used as a premise for implementation work
- `final judgment`: a judgment finalized in Phase 4 and reflected into the final deliverable template

## 3. Phase List

1. [Phase 1: Observation Foundation Definition](./phase_1_observability_setup.md)
2. [Phase 2: Basic Turn Observation](./phase_2_basic_turn_observation.md)
3. [Phase 3: Approval / Stop / Terminal Observation](./phase_3_approval_and_terminal_observation.md)
4. [Phase 4: Reconstruction and Final Decisions](./phase_4_reconstruction_and_final_decisions.md)

## 4. Phase Dependencies

- Do not proceed to Phase 2 or later before Phase 1 is complete
- Execute Phase 2 before approval-related work so the base judgments for message / session are fixed first
- Phase 3 covers approval / stop / abnormal / terminal observations and fixes preliminary judgments for request IDs and terminal status
- Phase 4 finalizes history reconstruction without stream dependence, app-owned items, and default decisions while pending
- Do not mark unobserved items from an earlier phase as complete in a later phase. If they are carried forward, leave both the pending reason and the default decision while pending

## 5. Mapping to the Source of Truth

`tasks Phase` is folded into units that are easier to execute in practice, so it does not map 1:1 to `source-of-truth Phase`.  
When using the word `Phase` in discussion or progress reports, explicitly say `tasks Phase` or `source-of-truth Phase` as needed.

- `tasks Phase 1` operationalizes `## 4. Execution Method` and `## A. Basic Log Preparation` from the source of truth
- `tasks Phase 2` combines `Phase 1: Basic Case Observation` and `Phase 2: create / start semantics observation` from the source of truth, and also handles preliminary observation of basic signal / status / event IDs
- `tasks Phase 3` combines `Phase 3: approval case observation` and `Phase 4: stop / abnormal / terminal observation` from the source of truth, and also handles preliminary observation of approval / error / terminal signals
- `tasks Phase 4` combines `Phase 5: re-fetch / reconstruction observation` and `## K. Final Decisions` from the source of truth

The principles for update responsibility are as follows.

- `tasks Phase 1` fixes case naming, log granularity, and judgment note format used across all phases
- `tasks Phase 2` updates preliminary observations for `thread / item / turn / event` and basic message / status behavior
- `tasks Phase 3` updates preliminary observations for request ID / approval / stop / terminal status
- `tasks Phase 4` integrates the preliminary judgments from Phase 2-3 into `G. Signal / Event Mapping`, `H. Status Mapping`, `I. History Reconstruction`, `J. Timestamp Verification`, `K. Final Decisions`, and the final deliverable template to finalize them

## 6. Common Execution Rules

- Preserve raw request / response / stream event / history snapshot data
- Assign each case a unique case name
- Record execution time in UTC
- Give each case an observation `session_key`, and do not assume the semantics of native `session_id` before they are confirmed
- If `thread_id` / `request_id` is known, record it in a way that allows it to be traced back via `session_key`
- Store stream and history so they can be compared within the same case unit
- Record the observed `app-server version` and `runtime version`
- For update-target cases such as approval / stop / failure, preserve raw request / response / stream event / history snapshot data at the same granularity
- If design judgment cannot be fixed from the observation results alone, leave the reason for the gap
- Every pending judgment must include a `default decision while pending`
- Do not treat any item included in a phase's update target as complete if it remains unobserved

## 7. Document Update Rules

- Before starting work, read the target phase document and update only the items for which that phase has update responsibility
- Do not expand the update scope based only on section names in `docs/...checklist`; update only the assigned items written in each phase document
- Leave each judgment as one of `adopt / reject / pending but safe to proceed / incomplete`
- When a judgment is pending, record the `default decision while pending` at the same time
- Before updating a checklist item, confirm that its corresponding case, evidence, and judgment section are all present
- When carrying a judgment into a later phase, do not confuse `unobserved` with `pending but safe to proceed`
- If a `conditionally required case` remains unobserved, do not update the checklist items that depend on it, and carry them forward as `incomplete`

## 8. Review Cycle

After revising `tasks/` or adding new files, perform self-review in at least the following three stages.

1. Structural review
   - Confirm that the responsibilities, dependencies, and update targets of each phase are not contradictory
2. Coverage review
   - Confirm that each update-target item is supported by a case, verification point, evidence, judgment section, and completion condition
3. Operational review
   - Confirm that no ambiguous wording remains, that there are no holes allowing completion without observation, and that no term can be interpreted in multiple ways

If review findings are identified, review again from the same perspectives after making corrections.
Call `tasks/` complete only when the latest review produces zero findings.

## 9. Artifacts to Leave When Each Phase Completes

### Phase 1

- Observation spike specification note
- Case registry
- Log storage rules

### Phase 2

- Basic case observation logs
- ID preliminary judgment notes
- Provisional notes for session / message decisions

### Phase 3

- Approval / terminal observation logs
- Approval source registry
- Status judgment notes

### Phase 4

- Reconstruction observation logs
- Final decision notes
- Candidate spec delta notes
