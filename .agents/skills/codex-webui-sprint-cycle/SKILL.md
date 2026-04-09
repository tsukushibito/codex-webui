---
name: codex-webui-sprint-cycle
description: Run one repo-local sprint workflow for `codex-webui` using the custom `planner`, `worker`, and `evaluator` agents. Use when a task should be planned, implemented, and hard-gated before local completion; do not use for brainstorming-only requests or for batching multiple unrelated tasks into one run.
---

# Codex WebUI Sprint Cycle

## Overview

Use this skill to run one bounded sprint through the repo-local `planner`, `worker`, and `evaluator` agents declared in `.codex/config.toml`.

Treat one sprint as one planner-defined implementation slice. A sprint is complete only when `evaluator` returns `approved`.

Treat evaluator approval as implementation approval, not as permission to close Issues or mark Project work `Done`; those tracking transitions still require the work to be reachable on `main`.
Treat dedicated pre-push validation as a later gate that runs only after the slice is locally complete and before any push-oriented or merge-oriented handoff.
For normal branch/PR work, run implementation from the active worktree rather than from the parent checkout. Only approved direct-to-`main` exceptions may use the parent checkout for implementation.

When `codex-webui-execution-orchestrator` selects an implementation-ready target with no blocking tracking drift, this skill is the required implementation path for that target.
When this skill was invoked by `codex-webui-execution-orchestrator`, return control to the orchestrator after the sprint result is known; this skill does not decide the next repo handoff.

## Build Context

Read these files before running the workflow:

- `README.md`
- `AGENTS.md`
- `docs/README.md` when source-of-truth docs define the sprint slice
- `tasks/README.md` when the sprint is tied to a tracked Issue or active task package

Before planning or implementation for a tracked Issue, read the active task package `README.md` and the source-of-truth docs it links so planner, worker, and evaluator use the same package scope and exit criteria.

If the sprint touches a documented area such as `docs/`, `tasks/`, or `artifacts/`, read the nearest relevant `README.md` in that area before implementation.

## When To Use

Use this skill when the user wants:

- a task decomposed into one implementation-sized sprint
- code or document changes with a hard quality gate inside the sprint
- a plan, implementation pass, and evaluator review kept separate

Do not use this skill when:

- the user only wants brainstorming, tradeoff analysis, or a high-level plan
- the work is too large or ambiguous to fit a single bounded sprint
- multiple unrelated tasks should be executed independently

## Workflow

1. Read the active task package and linked source-of-truth docs when the sprint is tied to a tracked Issue, then spawn `planner` and explicitly tell it to use `$codex-webui-sprint-planner`, stay read-only, avoid edits, and return a plan only with the planner sections, not an implementation summary, patch description, or completion report.
2. Review the planner output locally. If the sprint slice is still too large or unclear, or if the result is implementation-shaped instead of plan-only, ask `planner` to tighten it before implementation starts.
3. If `planner` violates the read-only instruction and mutates files anyway, do not ask it to continue editing. Treat the resulting worktree state as the effective `worker` output for this sprint and pass that implementation candidate to `evaluator`.
4. Otherwise, spawn `worker` to execute only that sprint slice in the active worktree for normal branch/PR work, or in the parent checkout only for an approved direct-to-`main` exception.
5. When `worker` returns, verify locally that it produced a real implementation candidate for this sprint. If the user asked for implementation and the result is design-only, analysis-only, or otherwise leaves the write scope unchanged, do not treat that as sprint progress; tighten the instructions with concrete target files, write scope, and expected API or behavior shape, then send `worker` back to implementation instead of proceeding to validation.
6. Treat `files changed: none`, `exact file paths changed: none`, or missing implementation evidence for an implementation-requested sprint as a blocked or incomplete worker pass, not as a completed sprint result.
7. Review the worker-supplied targeted validation evidence locally. If required checks are missing, too weak, or unrelated to the acceptance criteria, send `worker` back for the minimum additional implementation-side validation needed for this sprint. When the sprint edits files under `apps/frontend-bff` or `apps/codex-runtime` that are covered by the app-local Biome scripts, require the worker to run the touched app's local `npm run check` immediately after implementation and include that evidence before evaluator handoff.
8. Spawn `evaluator` and explicitly tell it to use `$codex-webui-sprint-evaluator`, stay read-only, avoid edits and handoff creation, and judge only the current sprint against the planner acceptance criteria, implementation result, and worker-supplied targeted validation evidence.
9. If `evaluator` returns `changes_required`, send those findings back to `worker` and run another implementation pass with updated targeted validation evidence.
10. Allow at most 2 evaluator rejection cycles for the same sprint slice.
11. If the second evaluator rejection still blocks completion, return to `planner` for replanning or a narrower slice.
12. Treat evaluator output as invalid when it omits a formal `approved` or `changes_required` verdict, violates the required evaluator output shape, or creates files despite the read-only instruction; in those cases, do not finish the sprint and either retry once with a tighter evaluator prompt or stop blocked.
13. Finish the sprint only when `evaluator` returns `approved`.
14. Return the sprint result to the caller. If the caller is `codex-webui-execution-orchestrator`, let that skill decide whether execution continues with another sprint, pre-push validation, package-state work, completion tracking, or a blocked stop.

## Post-Sprint Caller Contract

This skill completes one bounded sprint only. After the sprint result is known, the caller should treat the outcome as one of these cases:

- sprint approved, but the current Issue remains incomplete
- sprint approved, and pre-push validation or package lifecycle work is now the critical path
- sprint blocked and requires replanning or user input

This skill may describe which case it reached, but it must not choose the next repo skill itself.
Design-only worker output, no-op worker output, or implementation output without credible targeted validation evidence does not count as a known sprint result for this contract; the sprint is still in progress or blocked until the implementation candidate is real.

## Agent State Checks

- Do not treat a TUI status such as `Starting MCP servers ... serena` as sufficient evidence that a subagent is stuck.
- Before declaring a subagent stalled, check `wait_agent`, any delivered subagent notifications, and any available local logs or other execution evidence.
- If logs show the subagent is already issuing tool calls or producing side effects, treat the problem as a UI/status-reporting issue rather than an actual startup hang.
- If a subagent must be terminated, verify whether it already performed work so the next agent can reuse or review that state instead of duplicating it.

## Role Boundaries

- `planner` is read-only and defines the sprint slice
- `worker` is the only role allowed to edit files
- `evaluator` is read-only and acts as a hard gate over planner criteria plus worker-supplied implementation and targeted validation evidence
- Always tell `planner` to use `$codex-webui-sprint-planner`
- Always tell `evaluator` to use `$codex-webui-sprint-evaluator`
- Always tell `planner` and `evaluator` in their spawn prompts that they are read-only and must not edit files or run mutating commands
- Always tell `planner` to return a sprint plan only, using the planner role sections, and not to claim files changed, tests run, or work completed
- Always tell `evaluator` not to create handoff files, not to route next steps, and to return only the formal evaluator output shape
- Always tell `worker` to either produce code or document edits in the agreed write scope plus the minimum targeted validation evidence for the slice, or return a concrete technical block; do not accept design-only or review-only output from `worker` when the sprint requested implementation
- For edits in `apps/frontend-bff` or `apps/codex-runtime` that are covered by the app-local Biome scripts, treat the touched app's `npm run check` as part of the minimum targeted validation evidence expected from `worker`
- Do not phrase `planner` requests as direct implementation instructions; ask for a bounded slice, acceptance criteria, validation, and worker handoff only
- If `planner` mutates files anyway, treat that worktree state as the implementation candidate for `evaluator` rather than continuing to use `planner` as a writer
- Do not let `worker` implement normal branch/PR work from the parent checkout when an active worktree should exist
- If `worker` returns without changing the target write scope for an implementation-requested sprint, do not move on to `evaluator` unless the main agent independently verifies that the intended edits already exist in the worktree and should be evaluated as the effective implementation candidate
- When invoked by `codex-webui-execution-orchestrator`, do not let the main agent bypass `worker` by implementing the sprint slice directly
- Do not run concurrent write passes on the same sprint slice
- Do not silently weaken planner acceptance criteria to get an approval
- Do not let `planner` or `evaluator` mutate the worktree, create commits, push branches, or update GitHub Issues/Projects
- Do not add a mandatory post-`planner` compliance check just to police read-only behavior; prevent the issue with the spawn prompt and handle accidental edits through the fallback above
- Do not treat evaluator prose without a formal verdict as a successful gate result
- Do not treat evaluator approval alone as sufficient evidence to close an Issue or mark a Project item `Done`
- Do not run the dedicated `validator` inside the default sprint loop; reserve it for the later `codex-webui-pre-push-validation` gate
- Do not self-route to `codex-webui-work-packages` or `codex-webui-github-projects`; the caller owns next-skill selection

## Required Final Output

Return a merged result that includes:

- the planner objective and sprint slice
- the worker implementation summary
- the worker-supplied targeted validation evidence summary
- the evaluator verdict
- the validations that were run
- the caller-facing outcome, such as Issue still incomplete, pre-push validation now needed, completion-tracking handoff now needed, or blocked
- any remaining risk that still exists after approval

If `worker` did not edit the target write scope, say that explicitly and treat the sprint as blocked or still in progress rather than complete.
If the sprint is blocked and requires replanning, say that explicitly instead of pretending the sprint completed.

## Example Requests

- `Use $codex-webui-sprint-cycle to implement this bug fix in one sprint.`
- `Run planner, worker, evaluator for this repo task.`
- `Use $codex-webui-sprint-cycle to plan, implement, and hard-gate this change before pre-push validation.`
