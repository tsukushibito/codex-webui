---
name: codex-webui-orchestration-log
description: Standardize append-only orchestration run logs for `codex-webui`. Use when `codex-webui-execution-orchestrator` or a closely related routing workflow needs to open a run log, append routing and handoff events, capture anomalies such as read-only violations, incomplete sub-agent work, or command failures, or record why execution stopped under `artifacts/execution_orchestrator/`.
---

# Codex WebUI Orchestration Log

## Overview

Use this skill to keep one append-only run log for each orchestration pass.

This skill owns the log location, run-id convention, event schema, and helper script usage. It does not choose the current target or replace the orchestrator's routing judgment.

## Build Context

Read these files before changing the logging workflow itself:

- `AGENTS.md`
- `artifacts/execution_orchestrator/README.md`

Read the helper script only when you need to change its behavior:

- `scripts/append_run_event.py`

## Standard Workflow

Follow this order every time.

1. Choose one run id for the current orchestration request or continuation loop.
2. Append a `run_started` event before delegated intake or any handoff work begins.
3. Append an event before and after each delegated intake or selected handoff.
4. Append an `anomaly` event immediately when routing work hits a workflow problem.
5. Append a terminal event such as `run_completed` or `run_blocked` before ending the turn.

Prefer concise, factual summaries. Store references, targets, skills, and issue numbers in structured fields instead of burying them in prose.
The helper script also appends a token-usage snapshot under `details.token_usage_snapshot` when it can resolve the current Codex thread.

## Run Id Rules

- Use one run id per user-visible orchestration run
- Reuse the same run id while a continue-until loop is still in progress
- Prefer `YYYY-MM-DDTHH-mm-ssZ-<goal-slug>`
- Keep the slug short and path-safe

## Run Segment Contract

- The first segment in a run must start with `run_started`
- Later segments must start with `run_resumed`
- `run_resumed` is valid only after an earlier segment ended with `run_completed` or `run_blocked`
- After `run_completed` or `run_blocked`, no further event may be appended until `run_resumed` opens the next segment
- Each closed segment ends with exactly one terminal event: `run_completed` or `run_blocked`

The append helper enforces this contract on write, and `scripts/summarize_run_log.py --check` reports boundary violations in existing logs without repairing them.

## Event Coverage

At minimum, log these events when they happen:

- `run_started` or `run_resumed`
- `intake_started`
- `intake_completed`
- `handoff_selected`
- `handoff_started`
- `handoff_completed`
- `anomaly`
- `run_completed` or `run_blocked`

Use `anomaly` for problems such as:

- a read-only delegated agent editing files or mutating GitHub state
- a delegated agent failing to finish, timing out, or returning an unusable result
- a command or validation step failing during orchestration support work
- the logger script failing
- a hard block that stops the continue-until loop

Every `anomaly` event must record structured fallback details in `details`:

- `failed_agent_role`
- `failure_kind`
- `observed_side_effects`
- `fallback_class`
- `remediation`
- exactly one outcome field: `continued`, `quarantined`, or `stopped`

Prefer short enumerated values over prose. Base `fallback_class` on verified side effects and state drift, not on the delegated agent's own claim.

## Helper Script

Append events with:

```bash
python .agents/skills/codex-webui-orchestration-log/scripts/append_run_event.py \
  --run-id 2026-04-09T12-30-00Z-issue-close \
  --event-type intake_started \
  --stage intake \
  --status info \
  --summary "Delegated read-only intake for current target selection." \
  --actor orchestrator \
  --routing-goal "Select one current target and next handoff"
```

Useful optional flags:

- `--target issue-130`
- `--skill codex-webui-sprint-cycle`
- `--issue 130`
- `--details-json '{"timeout_seconds": 30, "agent": "intake"}'`
- `--token-thread-id 019d728a-253b-7550-ab46-eb5bb727b0e9` to inspect a different Codex thread than `CODEX_THREAD_ID`
- `--sessions-root /custom/sessions/root` when testing against a different Codex sessions tree
- `--no-token-usage` to skip the automatic token snapshot
- `--artifact-root /custom/path` when testing outside the repo artifact tree

Token usage notes:

- the helper records a cumulative snapshot for the current thread, not a per-event delta
- when direct subagent sessions are discoverable from the local Codex session logs, they are included under `details.token_usage_snapshot.direct_subagents`
- `aggregate_total_token_usage` is the sum of the current thread and known direct subagents at snapshot time
- when the current thread or session log cannot be resolved, the snapshot still records `available: false` with an `unavailable_reason`

For anomaly events, expand `--details-json` to include the required fallback fields. Minimum shape:

```bash
--details-json '{
  "failed_agent_role": "validator",
  "failure_kind": "wrong_command_framing",
  "observed_side_effects": "none_beyond_reads",
  "fallback_class": "continue",
  "remediation": "rerun with corrected expected-output framing",
  "continued": true
}'
```

## Run Inspection Helper

Use `scripts/summarize_run_log.py` when you need a read-only operational view of an existing run log instead of manually inspecting raw NDJSON.

Default concise summary:

```bash
python .agents/skills/codex-webui-orchestration-log/scripts/summarize_run_log.py \
  --run-id 2026-04-09T14-30-02Z-issue-127-close
```

Anomaly-only view:

```bash
python .agents/skills/codex-webui-orchestration-log/scripts/summarize_run_log.py \
  --run-id 2026-04-09T14-30-02Z-issue-127-close \
  --anomalies
```

Basic consistency checks:

```bash
python .agents/skills/codex-webui-orchestration-log/scripts/summarize_run_log.py \
  --run-id 2026-04-09T14-30-02Z-issue-127-close \
  --check
```

The check view reports invalid JSON lines, duplicated sequence values, missing terminal events, segment terminal violations, `run_resumed` boundary violations, and mismatched `handoff_started` / `handoff_completed` counts. It is intentionally read-only and does not repair log files.

## Guardrails

- Do not write ad hoc orchestration logs outside `artifacts/execution_orchestrator/`
- Do not log full command transcripts, secrets, tokens, or large copied outputs
- Do not skip anomaly logging for read-only violations, incomplete delegated work, or command failures
- Do not let the logger decide routing outcomes; it only records them
- Do not rewrite prior events in place; append a corrective event instead

## Example Requests

- `Use $codex-webui-orchestration-log to start a run log for this orchestration pass.`
- `Use $codex-webui-orchestration-log to append an anomaly for a read-only intake violation.`
- `Use $codex-webui-orchestration-log to record the selected handoff and why the run stopped.`
