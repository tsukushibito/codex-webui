---
name: codex-webui-execution-orchestrator
description: Coordinate multi-Issue execution in `codex-webui` by running main-orchestrator intake with `codex-webui-work-intake`, choosing one current target, and routing to the next existing repo skill. Use when the main agent should decide which Issue to work on next across multiple active or candidate Issues, including whether a broad target must be split before execution.
---

# Codex WebUI Execution Orchestrator

## Overview

Use this skill when the main agent needs to coordinate multiple Issues for this repository.

This skill is routing-only. It does not replace the existing single-Issue skills, and it must not directly implement the chosen Issue itself.

Responsibilities:

- run main-orchestrator intake to inspect Project / Issue / PR / worktree / `tasks/` state
- open and append one run-scoped orchestration log through `codex-webui-orchestration-log`
- choose exactly one current execution target
- park the remaining Issues explicitly
- report tracking drift before recommending fresh execution
- route broad targets to SubIssue breakdown before implementation starts
- select exactly one next existing repo skill
- invoke that selected repo skill in the same turn when the user asked to proceed with execution
- own the cross-skill continuation loop when the user asked to keep going until a concrete end-state is reached
- route to `codex-webui-execution-handoff` before stopping when the requested work cannot be completed in the current session but resumable follow-up is still required

The main agent should remain an orchestrator. Intake is critical-path routing work and stays in the main orchestrator. Planning, implementation, sprint evaluation, and pre-push validation should be delegated to the repo's sub-agents through the selected handoff skill instead of being executed directly by the main agent.

This skill does not directly mutate GitHub Projects, Issues, or local task packages.

## Build Context

Read these files before routing work:

- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `tasks/README.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`

If the chosen target belongs to a specific area, read the nearest relevant `README.md` in that area before finalizing the handoff recommendation.

## When To Use

Use this skill when:

- the main agent must choose among multiple Issues
- execution tracking spans Project, Issue, and `tasks/`
- the next step is unclear because several candidate Issues are available
- the user wants one current execution target rather than a backlog summary

Do not use this skill when:

- the user already chose a single Issue and wants package or sprint execution
- the task is only to update GitHub Project fields or issue bodies
- the task is only to create, update, or archive a local work package

## Standard Workflow

Follow this order every time.

1. Read top-level repo guidance and roadmap docs.
2. Invoke `$codex-webui-orchestration-log` to open or continue one run-scoped log under `artifacts/execution_orchestrator/`, then append `run_started` or `run_resumed` with the current routing goal.
3. Run `$codex-webui-work-intake` in the main orchestrator for the intake pass, keeping the pass read-only and routing-only.
4. Use the main intake result to select one current target.
5. Check whether tracking drift blocks execution.
6. Check whether the current target must be split into SubIssues before execution.
7. Select exactly one next handoff skill.
8. Append a routing event for the selected handoff or any blocking drift before continuing.
9. If the user asked to proceed with work in the current turn, invoke that selected handoff skill in the same turn instead of stopping after the routing brief.
10. If the user asked to continue until a concrete end-state, treat steps 3-9 as one iteration, then rerun main intake after the invoked handoff skill returns instead of stopping after the first handoff.
11. If the requested end-state cannot be reached in the current session and resumable follow-up is the correct outcome, invoke `codex-webui-execution-handoff` once before ending the turn.
12. Append `run_completed` or `run_blocked` after the final handoff outcome is known.
13. Stop only when the requested end-state is reached, or execution is hard blocked and the required handoff outcome has been produced or has itself failed.
14. Park the other Issues explicitly.

Do not skip main intake in this workflow.

If the user explicitly asked only for routing, target selection, or a next-skill recommendation, the workflow may stop after the routing brief.
In that routing-only case, do not force a resumable handoff doc unless the user explicitly asked for one.

## Run Logging

Use `$codex-webui-orchestration-log` throughout the workflow.

Keep one run id for the whole orchestration pass. Reuse that run id while a continue-until request is still in progress.

Append events at minimum for:

- `run_started` or `run_resumed`
- `intake_started`
- `intake_completed`
- `handoff_selected`
- `handoff_started`
- `handoff_completed`
- `anomaly`
- `run_completed` or `run_blocked`

Append an `anomaly` event immediately when any of the following happens:

- main intake cannot produce enough verified routing evidence to choose a next step
- a downstream delegated handoff role times out, fails to complete, mutates outside its role boundary, or returns an unusable result
- a support command fails during routing or handoff coordination
- a selected handoff skill fails to complete cleanly
- the logger script itself fails
- execution hits a real hard block and the loop must stop

## Delegated Failure Fallback Classes

Classify delegated-role failures from verified state, not from the delegated agent's self-report.
Check observed side effects, dirty state, and repo/task/GitHub drift before deciding how to continue.

Use exactly one fallback class:

- `continue`: no verified mutation and no blocking drift; rerun or proceed with a tighter prompt or corrected command framing
- `quarantine`: unexpected side effects are isolated and non-blocking; log them, exclude the contaminated output from routing judgment, and continue from verified clean inputs
- `hard_stop_recoverable`: verified repo/task/GitHub mutation or ambiguous dirty state requires explicit cleanup or user-visible recovery before the loop can continue
- `hard_stop_terminal`: verified mutation or state damage is severe enough that the current loop must stop and hand back a terminal blocker instead of attempting more routing

Do not classify a failure as `continue` only because the delegated agent said it was read-only or harmless.
The orchestrator owns the classification after checking verified state.

When a resumable stop requires `codex-webui-execution-handoff`, log the failed or blocked condition first, then log the selected handoff and its result. Include the created `.tmp/` handoff path in `details` when available.

Use concise structured entries. Do not dump long transcripts into the run log.

## Main Intake

Main intake is the first routing step for this skill after the run log is opened.

The orchestrator must use `$codex-webui-work-intake` directly in the main thread before selecting a current target. Do not spawn or delegate to a dedicated intake agent.

The intake pass inspects:

- GitHub Project state
- open linked Issues, dependencies, and active PRs
- local `tasks/` package state and active worktree state
- source-of-truth docs and nearest relevant README for the candidate target
- local implementation state only after execution tracking is understood, inspecting the tracked active worktree explicitly for normal branch/PR work instead of relying only on parent-checkout scans

Keep the result as a concise routing summary, not as a long audit transcript.

Main intake is strictly read-only.

It must not:

- create, update, archive, or move local task packages
- edit GitHub Issues, Project items, or Project fields
- implement code or documents for the chosen Issue

If intake detects tracking drift, record the drift for routing; do not correct the drift from the intake step itself.

If the main intake pass reveals that state is already dirty or ambiguous, append an `anomaly` event when the dirty state affects routing, report it concretely, and route based on verified state instead of assuming clean inputs.

## Downstream Read-Only Prompt Content

When this workflow delegates downstream read-only work, every delegated prompt must include all of the following, in plain terms:

- an explicit statement that the task is read-only
- an explicit prohibition on editing files, GitHub state, task packages, or running implementation/server commands
- the current handoff goal, expected output shape, and any command framing required by the selected skill

Minimum acceptable pattern:

> This is read-only handoff work. Do not edit files, mutate GitHub/Project/task state, or start servers. Run only the requested inspection or validation commands, then return concise evidence in the requested output shape.

Reusable fallback clause for delegated read-only roles:

> If you cannot complete the read-only task cleanly, stop and report only verified observations: what you checked, whether `observed_side_effects` are `none_beyond_reads` or concrete mutations, and what output is unusable. Do not classify the fallback yourself, do not repair drift, and do not create handoff files or other side effects unless explicitly asked.

## Delegated Failure Mapping

Apply these observed-state rules before selecting the next step:

- planner wrong-shape output with `observed_side_effects: none_beyond_reads`: `continue` with tighter prompt and retry
- validator wrong-command or wrong-run-id framing error with no mutation: `continue` with corrected expected-output framing
- isolated unexpected side effects such as a stray `.tmp` handoff output, with verified repo/task/GitHub state otherwise clean: `quarantine`
- verified repo/task/GitHub mutations, or ambiguous dirty state that might hide mutations: `hard_stop_recoverable` unless the damage makes the current run unsafe to resume
- severe verified state damage or a mutation path that makes safe recovery impossible in the current run: `hard_stop_terminal`

For `continue`, rerun only after tightening the prompt or correcting command framing.
For `quarantine`, log the side effect explicitly, ignore the contaminated delegated output for routing judgment, and continue from verified clean state.
For `hard_stop_recoverable` and `hard_stop_terminal`, log the blocker, stop the loop, and route only the recovery or handoff outcome that matches the verified state.

## Routing Rules

Choose one current target only.

If tracking drift exists, prioritize drift correction before new execution. Examples:

- Project says `In Progress` but no active task package exists
- a local active task package points at an Issue that is not the current execution target
- local implementation appears complete but tracking still claims active execution
- the tracked branch and tracked worktree do not match
- normal branch/PR work is happening from the parent checkout instead of `.worktrees/<branch>`
- a task package is archived locally but the PR is still open or the branch is not yet on `main`
- the branch is merged but the active worktree still exists
- the Project says `Done` while the linked PR is still open
- an approved direct-to-`main` exception exists but the commits are not yet pushed to `origin/main`

If no drift blocks progress but the chosen target is still too broad for one execution stream, prioritize splitting it into SubIssues before new implementation. Examples:

- the target is a parent or phase Issue rather than one bounded slice
- the target mixes multiple distinct deliverables that would naturally require separate PRs or task packages
- the next step is still ambiguous because multiple candidate sub-slices compete to go first

If no drift blocks progress, route to one of these skills:

- `codex-webui-work-packages` when local task package state must be created, resumed, reconciled, or archived
- `codex-webui-work-packages` when the active worktree must be created, corrected, or documented, or when package-linked Issue `Execution` metadata must move with the package lifecycle
- `codex-webui-sprint-cycle` when one bounded sprint slice is ready to execute for the chosen Issue
- `codex-webui-pre-push-validation` when the current slice is locally complete and the next step is push-oriented, merge-oriented, archive-oriented, or otherwise publish-oriented
- `codex-webui-github-projects` when Project state, broader Issue tracking state, SubIssue breakdown, PR merge, parent-checkout sync, worktree cleanup, or final completion tracking must be corrected
- `codex-webui-execution-handoff` when execution cannot continue in the current session and the correct outcome is a resumable `.tmp/` handoff rather than more implementation or tracking work

Do not recommend multiple competing handoffs in the same result.

Before selecting a normal next-step handoff, ask whether execution can still continue toward the requested end-state in the current session. If the answer is no and resumable follow-up is required, the handoff must become `codex-webui-execution-handoff` for a single terminal handoff pass.

When the user asked to proceed with execution, do not stop after naming the next handoff skill. Invoke exactly one selected handoff skill in the same turn.
Treat this as exactly one handoff per iteration, not necessarily one handoff for the entire user request.

When the user asked to continue until a concrete end-state, rerun main intake after the invoked handoff skill finishes and route again until one of the following happens:

- the requested end-state is reached, such as an Issue close, PR merge plus cleanup, or Project `Done`
- execution is hard blocked and requires user input
- execution is hard blocked on external state that the repo agent cannot change in the current turn
- no unambiguous next handoff exists without making a product or implementation decision that should be surfaced to the user

Treat these cases as requiring a terminal `codex-webui-execution-handoff` before the run stops, unless the user asked only for routing or there is no meaningful local state to preserve:

- a selected handoff skill fails to complete cleanly
- the continue-until loop reaches a concrete hard block
- progress is blocked on external state that cannot change in the current turn
- the current repo or worktree state is dirty enough that the next session needs explicit resumption guidance

After each invoked handoff skill returns, reassess in this order:

- if tracking drift now exists, route drift correction before new implementation
- if the current target still needs to be split before execution, route `codex-webui-github-projects`
- if the current target is still implementation-ready but incomplete, route another bounded slice through `codex-webui-sprint-cycle`
- if the implementation slice is locally complete but has not yet passed the dedicated pre-push validation gate, route `codex-webui-pre-push-validation`
- if the implementation slice passed the dedicated pre-push validation gate and package state must be created, reconciled, or archived, route `codex-webui-work-packages`
- if merge, parent-checkout sync, worktree cleanup, Issue close, or Project completion tracking is now the critical path, route `codex-webui-github-projects`

When intake says the chosen target must be split before execution, the handoff must be `codex-webui-github-projects`.

When the chosen target is implementation-ready and no tracking drift blocks execution, the handoff must be `codex-webui-sprint-cycle`.

When handing off to `codex-webui-sprint-cycle`, require that the downstream sprint workflow explicitly tells `planner` to use `$codex-webui-sprint-planner` and keeps sprint approval inside the `planner` -> `worker` -> `evaluator` loop rather than in the main agent.

When locally complete work is moving toward push-oriented, merge-oriented, or archive-oriented follow-through, the handoff must be `codex-webui-pre-push-validation` before `codex-webui-work-packages`, `codex-webui-github-projects`, or any publish-oriented handoff.

When the chosen target still needs task-package creation, resumption, reconciliation, or archive work, the handoff must be `codex-webui-work-packages`.

When the orchestration run must stop without reaching the requested end-state, the final handoff must be `codex-webui-execution-handoff` unless:

- the user asked only for routing or recommendation output
- no resumable state exists beyond the routing brief
- `codex-webui-execution-handoff` already ran for this orchestration run

Do not recurse from `codex-webui-execution-handoff` into another handoff. If the handoff skill itself fails, append an `anomaly`, report the failure concretely, and stop.

Do not bypass the selected handoff skill by letting the main agent implement directly after routing.

## Required Output Shape

Return a short brief with these sections in this order:

1. `Current target`
2. `Why this target now`
3. `Parked issues`
4. `Tracking drift`
5. `Next handoff`

The result should be short and routing-oriented.

If the user asked to proceed with work in the current turn, present the brief and then continue into the selected handoff skill instead of ending after the brief.
If the user also asked to continue until a concrete end-state, keep iterating after that handoff returns instead of treating the first completed handoff as the end of the request.
If the run ends by creating a resumable handoff, `Next handoff` should report that `codex-webui-execution-handoff` was used and identify the created `.tmp/` file.

## Guardrails

- Do not replace `codex-webui-work-intake`; keep it usable as a standalone intake skill
- Do not skip `codex-webui-orchestration-log` when the workflow is actively coordinating execution
- Do not delegate intake to a dedicated intake agent; run `$codex-webui-work-intake` in the main orchestrator
- Do not implement the chosen Issue from this skill
- Do not update GitHub Projects, Issues, or `tasks/` directly from this skill
- Do not silently ignore read-only violations, incomplete delegated work, handoff failures, or command failures; append an `anomaly` event and surface the problem
- Do not produce a backlog dump or queue report as the final answer
- Do not recommend parallel execution of multiple Issues as the default path
- Do not bypass drift correction when execution tracking is inconsistent
- Do not bypass the split-first gate when the chosen target is still too broad for one execution stream
- Do not bypass the selected handoff skill when the user asked to proceed with execution
- Do not let the main agent absorb planner, worker, evaluator, or validator duties once a handoff skill has been selected
- Do not treat one completed handoff or one approved sprint as sufficient to end a continue-until request
- Do not treat one approved sprint as immediately ready for push-oriented, merge-oriented, or archive-oriented follow-through before the dedicated pre-push validation gate runs
- Do not end a blocked continue-until run without attempting `codex-webui-execution-handoff` when resumable follow-up context exists
- Do not create more than one `codex-webui-execution-handoff` document for the same orchestration run unless the user explicitly asks
- Do not recurse into another handoff after `codex-webui-execution-handoff` runs
- Do not keep looping past a real hard block; stop and report the blocking condition concretely

## Example Requests

- `Use $codex-webui-execution-orchestrator to choose the current Issue and next repo skill.`
- `複数Issueの中から今の対象を1つ決めて、次に呼ぶ skill を実行するところまで進めて。`
- `Use $codex-webui-execution-orchestrator for multi-issue routing and then invoke the correct repo skill for the next slice.`
- `Use $codex-webui-execution-orchestrator to keep going until Issue #60 is closed.`
- `Use $codex-webui-execution-orchestrator to decide whether we should continue executing or stop and create an execution handoff.`
- `Use $codex-webui-execution-orchestrator to split a broad target into SubIssues before starting implementation.`
