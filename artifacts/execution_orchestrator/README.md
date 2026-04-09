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

## Required anomaly coverage

Record an `anomaly` event when any of the following happens:

- a read-only delegated agent edits files or mutates GitHub, task, or Project state
- a delegated agent times out, fails to finish, or returns an unusable result
- a supporting command fails during orchestration work
- a logger invocation fails
- the orchestration loop stops on a concrete hard block

## Usage note

Use `.agents/skills/codex-webui-orchestration-log/scripts/append_run_event.py` to append events instead of writing `events.ndjson` manually.
