---
name: codex-webui-execution-orchestrator
description: Coordinate multi-Issue execution in `codex-webui` by delegating read-only intake to the custom `intake` agent, choosing one current target, and routing to the next existing repo skill. Use when the main agent should decide which Issue to work on next across multiple active or candidate Issues, including whether a broad target must be split before execution.
---

# Codex WebUI Execution Orchestrator

## Overview

Use this skill when the main agent needs to coordinate multiple Issues for this repository.

This skill is routing-only. It does not replace the existing single-Issue skills, and it must not directly implement the chosen Issue itself.

Responsibilities:

- use delegated intake to inspect Project / Issue / PR / worktree / `tasks/` state
- open and append one run-scoped orchestration log through `codex-webui-orchestration-log`
- choose exactly one current execution target
- park the remaining Issues explicitly
- report tracking drift before recommending fresh execution
- route broad targets to SubIssue breakdown before implementation starts
- select exactly one next existing repo skill
- invoke that selected repo skill in the same turn when the user asked to proceed with execution
- own the cross-skill continuation loop when the user asked to keep going until a concrete end-state is reached

The main agent should remain an orchestrator. Planning, implementation, sprint evaluation, and pre-push validation should be delegated to the repo's sub-agents through the selected handoff skill instead of being executed directly by the main agent.

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
3. Delegate intake to the custom read-only `intake` agent defined in `.codex/config.toml`, explicitly instructing it to use `$codex-webui-work-intake` for the intake pass.
4. Use the intake summary to select one current target.
5. Check whether tracking drift blocks execution.
6. Check whether the current target must be split into SubIssues before execution.
7. Select exactly one next handoff skill.
8. Append a routing event for the selected handoff or any blocking drift before continuing.
9. If the user asked to proceed with work in the current turn, invoke that selected handoff skill in the same turn instead of stopping after the routing brief.
10. If the user asked to continue until a concrete end-state, treat steps 3-9 as one iteration, then re-run intake after the invoked handoff skill returns instead of stopping after the first handoff.
11. Append `run_completed` or `run_blocked` before ending the turn.
12. Stop only when the requested end-state is reached or execution is hard blocked.
13. Park the other Issues explicitly.

Do not skip delegated intake in this workflow.

If the user explicitly asked only for routing, target selection, or a next-skill recommendation, the workflow may stop after the routing brief.

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

- delegated intake violates the read-only boundary
- delegated intake times out, fails to complete, or returns an unusable result
- a support command fails during routing or handoff coordination
- a selected handoff skill fails to complete cleanly
- the logger script itself fails
- execution hits a real hard block and the loop must stop

Use concise structured entries. Do not dump long transcripts into the run log.

## Delegated Intake

The delegated intake agent is the first execution step for this skill.

The orchestrator must explicitly tell the delegated agent to use `$codex-webui-work-intake` before doing any intake work. Do not rely on the agent to infer that skill on its own.

Its job is to inspect:

- GitHub Project state
- open linked Issues, dependencies, and active PRs
- local `tasks/` package state and active worktree state
- source-of-truth docs and nearest relevant README for the candidate target
- local implementation state only after execution tracking is understood, inspecting the tracked active worktree explicitly for normal branch/PR work instead of relying only on parent-checkout scans

The orchestrator should consume the intake result as a concise routing summary, not as a long audit transcript.

Delegated intake is strictly read-only.

It must not:

- create, update, archive, or move local task packages
- edit GitHub Issues, Project items, or Project fields
- implement code or documents for the chosen Issue

If intake detects tracking drift, it reports that drift back to the orchestrator for routing; it does not correct the drift itself.

If delegated intake violates the read-only boundary, do not silently trust the result. Append an `anomaly` event, report the violation concretely, and route the next step based on the now-dirty state instead of pretending intake stayed read-only.

## Required Intake Prompt Content

Every delegated intake message must include all of the following, in plain terms:

- an explicit instruction to use `$codex-webui-work-intake`
- an explicit statement that the task is read-only
- an explicit prohibition on editing files, GitHub state, task packages, or running implementation/server commands
- the current routing goal, such as selecting one current target or reassessing after a handoff

Minimum acceptable pattern:

> Use `$codex-webui-work-intake` for this intake pass. This is read-only routing work. Do not edit files, mutate GitHub/Project/task state, or start servers. Inspect Project, issues, tasks, worktree, and relevant docs, then return a concise routing summary with one recommended current target.

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

When the user asked to proceed with execution, do not stop after naming the next handoff skill. Invoke exactly one selected handoff skill in the same turn.
Treat this as exactly one handoff per iteration, not necessarily one handoff for the entire user request.

When the user asked to continue until a concrete end-state, return to delegated intake after the invoked handoff skill finishes and route again until one of the following happens:

- the requested end-state is reached, such as an Issue close, PR merge plus cleanup, or Project `Done`
- execution is hard blocked and requires user input
- execution is hard blocked on external state that the repo agent cannot change in the current turn
- no unambiguous next handoff exists without making a product or implementation decision that should be surfaced to the user

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

## Guardrails

- Do not replace `codex-webui-work-intake`; keep it usable as a standalone intake skill
- Do not skip `codex-webui-orchestration-log` when the workflow is actively coordinating execution
- Do not delegate intake without explicitly naming `$codex-webui-work-intake` in the intake prompt
- Do not implement the chosen Issue from this skill
- Do not update GitHub Projects, Issues, or `tasks/` directly from this skill
- Do not let delegated intake mutate GitHub state, local task-package state, or implementation files
- Do not silently ignore read-only violations, incomplete delegated work, handoff failures, or command failures; append an `anomaly` event and surface the problem
- Do not produce a backlog dump or queue report as the final answer
- Do not recommend parallel execution of multiple Issues as the default path
- Do not bypass drift correction when execution tracking is inconsistent
- Do not bypass the split-first gate when the chosen target is still too broad for one execution stream
- Do not bypass the selected handoff skill when the user asked to proceed with execution
- Do not let the main agent absorb planner, worker, evaluator, or validator duties once a handoff skill has been selected
- Do not treat one completed handoff or one approved sprint as sufficient to end a continue-until request
- Do not treat one approved sprint as immediately ready for push-oriented, merge-oriented, or archive-oriented follow-through before the dedicated pre-push validation gate runs
- Do not keep looping past a real hard block; stop and report the blocking condition concretely

## Example Requests

- `Use $codex-webui-execution-orchestrator to choose the current Issue and next repo skill.`
- `複数Issueの中から今の対象を1つ決めて、次に呼ぶ skill を実行するところまで進めて。`
- `Use $codex-webui-execution-orchestrator for multi-issue routing and then invoke the correct repo skill for the next slice.`
- `Use $codex-webui-execution-orchestrator to keep going until Issue #60 is closed.`
- `Use $codex-webui-execution-orchestrator to decide whether we should continue executing or stop and create an execution handoff.`
- `Use $codex-webui-execution-orchestrator to split a broad target into SubIssues before starting implementation.`
