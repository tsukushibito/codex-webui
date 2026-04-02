# app-server Observation Artifact Storage Rules

This directory is the source-of-truth location for raw evidence from app-server observations.  
After Phase 1 is complete, leave artifacts here in the same structure rather than under `tasks/`.

## 1. Root structure

```text
artifacts/app_server_observability/
  phase_1_observability_spike_spec.md
  phase_1_case_registry.md
  phase_1_judgment_template.md
  observations/
    <case_name>/
      <run_key>/
        metadata.md
        ids.md
        judgment.md
        requests/
        responses/
        server_requests/
        server_responses/
        stream/
        history/
```

Example:

```text
artifacts/app_server_observability/
  observations/
    p2-normal-turn-complete/
      2026-04-01T15-04-05.123456Z-r01/
        metadata.md
        ids.md
        judgment.md
        requests/request-0001.json
        responses/response-0001.json
        server_requests/server-request-0001.json
        server_responses/server-response-0001.json
        stream/events.ndjson
        history/history-0001.json
```

## 2. Directory naming

- `<case_name>` uses the reserved name from [artifacts/app_server_observability/phase_1_case_registry.md](../phase_1_case_registry.md) 
- `<run_key>` uses `<executed_at_utc_pathsafe>-<nonce>` 
- `executed_at_utc_pathsafe` uses `YYYY-MM-DDTHH-mm-ss.ffffffZ` 
- `nonce` is required to avoid collision at the same time, and short sequential numbers like `r01`, `r02` can be used 
- Do not include the `tasks Phase` used for re-observation in the path. Record it in `metadata.md` as `observed_in_tasks_phase`

## 3. File responsibilities

- `metadata.md`: Case description, input summary, version, execution metadata 
- `ids.md`: mapping between `session_key` / `thread_id` / `request_id`
- `judgment.md`: judgment entries, pending reasons, and default decisions used while proceeding
- `requests/`: client initiated raw request
- `responses/`: client initiated raw response
- `server_requests/`: server initiated raw request
- `server_responses/`: client reply to server initiated request
- `stream/`: raw stream event
- `history/`: raw history snapshot

## 4. Numbering rules

- Client initiated request / response / history snapshots are numbered from `0001` in the order of observation
- Use the same number for corresponding client-initiated raw request / response / history files
- When server-initiated request / response pairs exist, use a separate series such as `server-request-0001.json` and `server-response-0001.json`
- Pair each server-initiated request and its reply with the same number
- Save stream data in chronological order per case, and annotate the request number if needed

Naming example:

- `requests/request-0001.json`
- `responses/response-0001.json`
- `server_requests/server-request-0001.json`
- `server_responses/server-response-0001.json`
- `history/history-0001.json`
- `stream/events.ndjson`

Raw payloads that are difficult to convert to JSON can be saved as `.txt`, but the number and file responsibility will not change.

## 5. Required files for case completion

At a minimum, the preservation rules of Phase 1 are satisfied if the following are present.

- `metadata.md`
- `ids.md`
- `judgment.md`
- one or more raw requests in `requests/`
- the corresponding raw responses in `responses/`
- one or more raw server requests in `server_requests/` for cases that include approval or user input requests
- the corresponding raw client replies in `server_responses/` for cases that reply to approval or user input requests
- raw stream events in `stream/`, or a note explaining why it is empty
- one or more history snapshots in `history/`

## 6. Comparison rules

- Compare by request or turn number within the same case 
- All executions of the same case are always traced under `observations/<case_name>/` 
- Compare using `session_key` as a common key between cases 
- Even if there are differences or omissions, do not delete the raw trail and reflect it in `judgment.md`

## 7. Template reference

- `metadata.md` follows metadata items in [artifacts/app_server_observability/phase_1_observability_spike_spec.md](../phase_1_observability_spike_spec.md) 
- `judgment.md` should be created starting from [artifacts/app_server_observability/phase_1_judgment_template.md](../phase_1_judgment_template.md)
