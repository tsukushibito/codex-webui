# Phase 1 Observation Spike Specification Note

## 1. Purpose

Fix the observation process for `codex app-server` so it can be rerun in later Phase 2-4 work while preserving evidence in the same format.  
This document does not determine app-server semantics. It is the specification for fixing the responsibility, inputs and outputs, case execution unit, and comparison procedure of the observation spike.

## 2. Responsibilities of the Observation Spike

- Interact directly with the app-server and store raw request / response / stream / history data
- Record the mapping between the case name, UTC execution time, `session_key`, and native IDs within the same case unit
- Keep stream and history at a granularity that allows comparison within the same case
- Leave judgment notes for downstream decisions using the template

The following are out of scope for this responsibility.

- Determining session / message / approval semantics in Phase 1 alone
- Formatting for UI / public API use
- Reflecting results into the runtime implementation

## 3. Input Specification

The minimum inputs required for each case execution are as follows.

- `case_name`
- `observed_in_tasks_phase`
- `run_key`
- `executed_at_utc`
- `session_key`
- `case_description`
- `input_summary`
- `operator_notes`

`executed_at_utc` must use UTC RFC 3339 format and be recorded with at least microsecond precision.  
Example: `2026-04-01T15:04:05.123456Z`

`run_key` is the unique directory name under the case and must use the format `<executed_at_utc_pathsafe>-<nonce>`.  
Use `YYYY-MM-DDTHH-mm-ss.ffffffZ` for `executed_at_utc_pathsafe`, and require `nonce` to avoid collisions at the same timestamp.  
Example: `2026-04-01T15-04-05.123456Z-r01`

## 4. Output Specification

Each case execution writes outputs using the storage structure defined in [artifacts/app_server_observability/observations/README.md](./observations/README.md).  
The minimum output artifacts are:

- `metadata.md`
- `ids.md`
- `requests/`
- `responses/`
- `server_requests/`
- `server_responses/`
- `stream/`
- `history/`
- `judgment.md`

Number `requests/`, `responses/`, and `history/` from `0001` in the observed order of client-initiated requests or turns.
Treat client-initiated request / response / history snapshots with the same number as one comparison unit.
Separate server-initiated JSON-RPC such as approval or user input requests into `server_requests/` and `server_responses/`, pairing the request and reply with the same number.

Treat `observations/<case_name>/<run_key>/` as the source-of-truth storage path.  
Record `observed_in_tasks_phase` in metadata, and do not use it in the storage path.

## 5. Execution Unit for One Case

### Start Conditions

- The case name, `session_key`, and input summary have been fixed
- No raw request for that case has been sent yet

### End Conditions

- The expected operation has completed
- The raw stream events generated in that case have been stored
- At least one corresponding history snapshot has been stored
- `judgment.md` records either a preliminary judgment or `incomplete`

### Rerun Unit

- A rerun repeats the entire case
- Keep the same case name and assign a new `run_key`
- Even when the same case is re-observed in a later phase, store it under the same `case_name`
- Do not overwrite existing case results even if the run fails partway through

## 6. Case Naming and `session_key`

### case_name

- Use `p<tasks phase>-<purpose>-<shape>` as the base form
- Do not change case names already reserved for later phases
- A case name expresses observation intent, not implementation judgment

### `session_key`

- It is a grouping key assigned by the observer
- Do not treat it as equivalent to native `session_id` / `thread_id` / `request_id`
- Reuse it across case groups that should be compared as the same observation session
- Use the format `sk-<YYYYMMDD>-<slug>-<nn>`

Examples:

- `sk-20260401-baseline-01`
- `sk-20260401-approval-01`

## 7. Minimum Execution Metadata Set

At minimum, leave the following in `metadata.md`.

- `case_name`
- `observed_in_tasks_phase`
- `run_key`
- `executed_at_utc`
- `session_key`
- `app_server_version`
- `runtime_version`
- `case_description`
- `input_summary`
- `thread_id` or `unknown`
- `request_id` or `unknown`
- `operator_notes`

Record `app_server_version` from an app-server-specific source.
Examples: `userAgent` in the initialize response, the app-server health endpoint, or server build metadata. Do not treat it as equivalent to the CLI version. If it cannot be obtained, write `unknown` and the reason.
Record `runtime_version` from `codex --version`, a Docker image tag, container digest, or execution-environment version. If it cannot be obtained, write the reason. Treat `result.thread.cliVersion` as a runtime / CLI version.

## 8. Comparison Procedure for Stream and History

1. Number each request or turn in observation order as `0001`, `0002`, and so on
2. Save the corresponding raw request / response with the same number
3. If a server-initiated request occurs, number `server_requests/` and `server_responses/` as a separate sequence
4. Store stream events in time order per case, and annotate the request number when needed
5. After each request or turn completes, capture a history snapshot and save it with the same number
6. Record the mapping between `session_key` / `thread_id` / `request_id` in `ids.md`
7. Record matches, mismatches, and pending reasons between stream and history in `judgment.md`
8. When re-observing a case from a prior phase, record the execution phase in `observed_in_tasks_phase`

1. Number each request or turn in observation order as `0001`, `0002`, and so on
2. Save the corresponding raw request / response with the same number
3. If a server-initiated request occurs, number `server_requests/` and `server_responses/` as a separate sequence
4. Store stream events in time order per case, and annotate the request number when needed
5. After each request or turn completes, capture a history snapshot and save it with the same number
6. Record the mapping between `session_key` / `thread_id` / `request_id` in `ids.md`
7. Record matches, mismatches, and pending reasons between stream and history in `judgment.md`
8. When re-observing a case from a prior phase, record the execution phase in `observed_in_tasks_phase`

If differences appear, do not delete them as an observation failure. Leave them as evidence and reflect them in the judgment section.

## 9. How to Record a Default Decision While Pending

- Do not confuse `unobserved` with `pending but safe to proceed`
- If the status is `incomplete`, always write what remains unobserved
- If the status is `pending but safe to proceed`, always write the temporary decision used to move forward
- If the target of re-observation is already known, write the relevant `tasks Phase` and case name

## 10. Phase 1 Deliverables

- [Case registry](./phase_1_case_registry.md)
- [Log storage rules](./observations/README.md)
- [Judgment note template](./phase_1_judgment_template.md)
