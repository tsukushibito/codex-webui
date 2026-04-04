---
name: codex-webui-sprint-cycle
description: Run one repo-local sprint workflow for `codex-webui` using the custom `planner`, `worker`, and `evaluator` agents. Use when a task should be planned, implemented, and hard-gated before completion; do not use for brainstorming-only requests or for batching multiple unrelated tasks into one run.
---

# Codex WebUI Sprint Cycle

## Overview

Use this skill to run one bounded sprint through the repo-local `planner`, `worker`, and `evaluator` agents declared in `.codex/config.toml`.

Treat one sprint as one planner-defined implementation slice. A sprint is complete only when `evaluator` returns `approved`.

Treat evaluator approval as implementation approval, not as permission to close Issues or mark Project work `Done`; those tracking transitions still require the work to be reachable on `main`.

When `codex-webui-execution-orchestrator` selects an implementation-ready target with no blocking tracking drift, this skill is the required implementation path for that target.

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

1. Spawn `planner` first and explicitly tell it that it is read-only, must not edit files, and must not run mutating commands; ask it for one bounded sprint slice with ordered tasks, acceptance criteria, and required validation.
2. Review the planner output locally. If the sprint slice is still too large or unclear, ask `planner` to tighten it before implementation starts.
3. If `planner` violates the read-only instruction and mutates files anyway, do not ask it to continue editing. Treat the resulting worktree state as the effective `worker` output for this sprint and pass that implementation candidate to `evaluator`.
4. Otherwise, spawn `worker` to execute only that sprint slice.
5. When the implementation candidate finishes, spawn `evaluator` and explicitly tell it that it is read-only, must not edit files, and must not run mutating commands; pass the planner acceptance criteria and the implementation result.
6. If `evaluator` returns `changes_required`, send those findings back to `worker` and run another implementation pass.
7. Allow at most 2 evaluator rejection cycles for the same sprint slice.
8. If the second evaluator rejection still blocks completion, return to `planner` for replanning or a narrower slice.
9. Finish the sprint only when `evaluator` returns `approved`.

## Agent State Checks

- Do not treat a TUI status such as `Starting MCP servers ... serena` as sufficient evidence that a subagent is stuck.
- Before declaring a subagent stalled, check `wait_agent`, any delivered subagent notifications, and any available local logs or other execution evidence.
- If logs show the subagent is already issuing tool calls or producing side effects, treat the problem as a UI/status-reporting issue rather than an actual startup hang.
- If a subagent must be terminated, verify whether it already performed work so the next agent can reuse or review that state instead of duplicating it.

## Role Boundaries

- `planner` is read-only and defines the sprint slice
- `worker` is the only role allowed to edit files
- `evaluator` is read-only and acts as a hard gate
- Always tell `planner` and `evaluator` in their spawn prompts that they are read-only and must not edit files or run mutating commands
- If `planner` mutates files anyway, treat that worktree state as the implementation candidate for `evaluator` rather than continuing to use `planner` as a writer
- When invoked by `codex-webui-execution-orchestrator`, do not let the main agent bypass `worker` by implementing the sprint slice directly
- Do not run concurrent write passes on the same sprint slice
- Do not silently weaken planner acceptance criteria to get an approval
- Do not let `planner` or `evaluator` mutate the worktree, create commits, push branches, or update GitHub Issues/Projects
- Do not add a mandatory post-`planner` compliance check just to police read-only behavior; prevent the issue with the spawn prompt and handle accidental edits through the fallback above
- Do not treat evaluator approval alone as sufficient evidence to close an Issue or mark a Project item `Done`

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
