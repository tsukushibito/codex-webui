# execution_orchestrator

This directory stores append-only run logs for orchestration workflows such as `codex-webui-execution-orchestrator`.

Keep the logging rules here and keep reusable logger behavior in `.agents/skills/codex-webui-orchestration-log/`.

## Root structure

```text
artifacts/execution_orchestrator/
  README.md
  runs/
    <run_id>/
      events.ndjson
```

## Run id rules

- Use one directory per orchestration run
- Prefer `YYYY-MM-DDTHH-mm-ssZ-<goal-slug>`
- Keep `<goal-slug>` short and path-safe
- Reuse the same run id while a continue-until loop is still active

## Event log rules

- Store one JSON object per line in `events.ndjson`
- Append only; do not rewrite prior events
- Keep summaries concise and factual
- Prefer structured fields such as `issue`, `skill`, `target`, and `details` over long prose
- Do not copy full command transcripts, secrets, or large outputs into the log

## Run segment contract

- The first segment in a run starts with `run_started`
- Each later segment starts with `run_resumed`
- `run_resumed` is allowed only after a prior `run_completed` or `run_blocked`
- After `run_completed` or `run_blocked`, the next appended event must be `run_resumed`
- Each closed segment ends with exactly one terminal event: `run_completed` or `run_blocked`

Use `.agents/skills/codex-webui-orchestration-log/scripts/append_run_event.py` to enforce this contract during append, and use `.agents/skills/codex-webui-orchestration-log/scripts/summarize_run_log.py --check` to detect boundary violations in existing logs.

## Minimum event schema

Each event should include at least:

- `recorded_at_utc`
- `sequence`
- `run_id`
- `stage`
- `event_type`
- `status`
- `actor`
- `summary`

Optional fields:

- `routing_goal`
- `target`
- `skill`
- `issue`
- `details`

When available, the logger stores token information under `details.token_usage_snapshot`.
That snapshot is cumulative at the time the event is appended and may include:

- `current_thread`
- `direct_subagents`
- `aggregate_total_token_usage`
- `available` and `unavailable_reason` when usage could not be resolved

## Required anomaly coverage

Record an `anomaly` event when any of the following happens:

- a read-only delegated agent edits files or mutates GitHub, task, or Project state
- a delegated agent times out, fails to finish, or returns an unusable result
- a supporting command fails during orchestration work
- a logger invocation fails
- the orchestration loop stops on a concrete hard block

Each `anomaly` event must include these structured `details` fields:

- `failed_agent_role`
- `failure_kind`
- `observed_side_effects`
- `fallback_class`
- `remediation`
- exactly one outcome field: `continued`, `quarantined`, or `stopped`

Use `fallback_class` values `continue`, `quarantine`, `hard_stop_recoverable`, or `hard_stop_terminal`.
Set the outcome field from verified state and the orchestrator decision, not from delegated self-report.

## Usage note

Use `.agents/skills/codex-webui-orchestration-log/scripts/append_run_event.py` to append events instead of writing `events.ndjson` manually.
