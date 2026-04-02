# Phase 1: Observation infrastructure definition

## 1. Purpose

To enable re-execution of observation trails needed in subsequent phases in the same format.  
In this phase, the behavior of the app-server itself is not finalized, but the observation method, log structure, and method for leaving judgment notes are fixed.

## 2. Design decisions finalized during this phase

- Observation spike responsibility 
- Case execution unit 
- Case naming convention 
- Minimum set of storage targets 
- Log storage granularity 
- Minimum set of execution metadata 
- Storage structure that can be tracked in thread / session / request units 
- Definition of `session_key` for observation 
- Judgment recording method 
- Common execution rules on which subsequent phases depend

## 3. Preconditions

- Be able to start and operate `codex app-server`
- Be able to record the `app-server version` and `runtime version` of observation targets
- Be able to save observation logs and artifacts in the original area separate from `tasks/` under repo.

## 4. Implementation tasks

- [x] Define the input/output specifications for observation spikes 
- [x] Define the start condition, end condition, and re-execution unit for one case 
- [x] Define the naming convention for case names 
- [x] Define the storage format for request / response / stream event / history snapshot 
- [x] Define the storage items for execution metadata 
- [x] thread / session / request Define a storage structure that can be tracked in units 
- [x] Define the numbering rules and meaning of observation `session_key` 
- [x] Define the procedure for comparing stream and history in the same case 
- [x] Reserve the list of required case IDs to be used in subsequent phases 
- [x] Define the format of judgment memo 
- [x] Define how to write default judgment on hold

## 5. To be fixed as a specification

### Case naming

- Include the phase in the case name 
- Make the purpose granular enough to understand just by the case name 
- Re-execution of the same case can be distinguished by UTC time

example:

- `p2-normal-turn-complete`
- `p2-no-assistant-message`
- `p3-approval-approve`
- `p3-stop-during-running`
- `p4-stream-disconnect-reload`

### Execution metadata

At a minimum, save the following:

- case name 
- `observed_in_tasks_phase`
- `run_key`
- Execution date and time UTC
- `session_key`
- `app-server version`
- `runtime version`
- Case description 
- Summary of inputs or operations used for execution 
- If `thread_id` is known, its value 
- If `request_id` is known, its value 
- Additional notes

`session_key` is a stable grouping key assigned by the observer, and at this point it is not equated with native `session_id` or `thread_id`. The session semantics on the 
native side will be determined in the subsequent phase, and in Phase 1 it will be used only to fix ``which case group should be treated as the same observation session.'' 
The format is `sk-<YYYYMMDD>-<slug>-<nn>`. 
`observed_in_tasks_phase` represents the `tasks Phase` in which the observation was performed, and is also saved when re-observing the case of the prior phase. 
`run_key` is the unique key of `<high-resolution UTC time>-<nonce>` and is used for the save directory name under case.

### Log storage structure

At a minimum, the following should be separated by case.

- raw request
- raw response
- raw server-initiated request
- raw client reply to server-initiated request
- raw stream event
- raw history snapshot
- execution metadata
- judgment memo

The original storage destination for artifacts and raw trails is `artifacts/app_server_observability/`.

When comparing across cases, at least `session_key` must be traceable as a common key.

Within the same case, make it granular enough to separate and compare each turn or request. 
Re-observation of the same case is saved under the same case name regardless of the executed tasks, and the implementation phase is left in the metadata.

## 6. Reserve case ID for subsequent phases

Upon completion of Phase 1, reserve at least the following:

- `p2-normal-turn-complete`
- `p2-no-assistant-message`
- `p2-multi-turn-follow-up`
- `p2-create-start-semantics`
- `p3-approval-approve`
- `p3-approval-deny`
- `p3-approval-stop`
- `p3-stop-during-running`
- `p3-transient-failure`
- `p3-stop-close-to-approval-resolve`
- `p4-stream-disconnect-reload`
- `p4-initial-history-only-load`

## 7. Check items

- [x] Request / response / event / history can be left separately 
- [x] Case name and execution time can be linked 
- [x] Re-observation target of the same case is unique regardless of tasks phase 
- [x] `app-server version` and `runtime version` can be left 
- [x] thread / session / request 
- [x] The meaning of `session_key` is documented and is not confused with native ID 
- [x] Stream and history can be compared in the same case 
- [x] The granularity is such that it can be used for ID / status / approval judgment in subsequent phases 
- [x] Reserved case IDs for Phase 2-4 have been reserved.

## 8. Trails to be recorded

- raw request
- raw response
- raw server-initiated request
- raw client reply to server-initiated request
- raw stream event
- raw history snapshot
- execution date and time UTC
- case name
- `session_key`
- `app-server version`
- `runtime version`
- Correspondence memo for `session_key` / `thread_id` / `request_id`
- Additional note

## 9. Judgment memo format

Use the following format at each decision point.

```md
### <judgment_item_name>
- Judgment: adopt / reject / pending but safe to proceed / incomplete
- Evidence:
- Notes:
- Default decision while pending:
```

When on hold, write at least one of the following as a supplement.

- What has not been observed 
- Where to re-observe in subsequent phases?

## 10. Completion conditions

- [x] Observation method is fixed 
- [x] Log storage rules are fixed 
- [x] Prerequisites are in place to allow re-execution on a case-by-case basis 
- [x] What to save in each case of Phase 2-4 can be explained 
- [x] Reproduction conditions including `app-server version` / `runtime version` are clearly stated 
- [x] Session grouping rules using `session_key` have been clarified and separated from the undefined part of native session semantics.

## 11. Deliverables

- [Observation infrastructure specification memo](../../../artifacts/app_server_observability/phase_1_observability_spike_spec.md)
- [Case list](../../../artifacts/app_server_observability/phase_1_case_registry.md)
- [Log storage rules](../../../artifacts/app_server_observability/observations/README.md)
- [Judgment memo template](../../../artifacts/app_server_observability/phase_1_judgment_template.md)

## 12. `docs/...checklist` Update target

When completed, update the following in [docs/validation/app_server_behavior_validation_plan_checklist.md](../../../docs/validation/app_server_behavior_validation_plan_checklist.md).

- `A. Basic log preparation`
- Operation notes corresponding to the implementation method
