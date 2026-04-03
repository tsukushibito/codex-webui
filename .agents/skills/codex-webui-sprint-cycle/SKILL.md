---
name: codex-webui-sprint-cycle
description: Run one repo-local sprint workflow for `codex-webui` using the custom `planner`, `worker`, and `evaluator` agents. Use when a task should be planned, implemented, and hard-gated before completion; do not use for brainstorming-only requests or for batching multiple unrelated tasks into one run.
---

# Codex WebUI Sprint Cycle

## Overview

Use this skill to run one bounded sprint through the repo-local `planner`, `worker`, and `evaluator` agents declared in `.codex/config.toml`.

Treat one sprint as one planner-defined implementation slice. A sprint is complete only when `evaluator` returns `approved`.

## Build Context

Read these files before running the workflow:

- `README.md`
- `AGENTS.md`

If the sprint touches a documented area such as `docs/`, `tasks/`, or `artifacts/`, read the nearest relevant `README.md` in that area before implementation.

## When To Use

Use this skill when the user wants:

- a task decomposed into one implementation-sized sprint
- code or document changes with a hard quality gate
- a plan, implementation pass, and evaluator review kept separate

Do not use this skill when:

- the user only wants brainstorming, tradeoff analysis, or a high-level plan
- the work is too large or ambiguous to fit a single bounded sprint
- multiple unrelated tasks should be executed independently

## Workflow

1. Spawn `planner` first and ask it for one bounded sprint slice with ordered tasks, acceptance criteria, and required validation.
2. Review the planner output locally. If the sprint slice is still too large or unclear, ask `planner` to tighten it before implementation starts.
3. Spawn `worker` to execute only that sprint slice.
4. When `worker` finishes, spawn `evaluator` with the planner acceptance criteria and the worker result.
5. If `evaluator` returns `changes_required`, send those findings back to `worker` and run another implementation pass.
6. Allow at most 2 evaluator rejection cycles for the same sprint slice.
7. If the second evaluator rejection still blocks completion, return to `planner` for replanning or a narrower slice.
8. Finish the sprint only when `evaluator` returns `approved`.

## Role Boundaries

- `planner` is read-only and defines the sprint slice
- `worker` is the only role allowed to edit files
- `evaluator` is read-only and acts as a hard gate
- Do not run concurrent write passes on the same sprint slice
- Do not silently weaken planner acceptance criteria to get an approval

## Required Final Output

Return a merged result that includes:

- the planner objective and sprint slice
- the worker implementation summary
- the evaluator verdict
- the validations that were run
- any remaining risk that still exists after approval

If the sprint is blocked and requires replanning, say that explicitly instead of pretending the sprint completed.

## Example Requests

- `Use $codex-webui-sprint-cycle to implement this bug fix in one sprint.`
- `Run planner, worker, evaluator for this repo task.`
- `Use $codex-webui-sprint-cycle to plan, implement, and hard-gate this change.`
