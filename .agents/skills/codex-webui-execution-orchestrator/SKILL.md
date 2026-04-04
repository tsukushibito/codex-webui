---
name: codex-webui-execution-orchestrator
description: Coordinate multi-Issue execution in `codex-webui` by delegating read-only intake to the custom `intake` agent, choosing one current target, and routing to the next existing repo skill. Use when the main agent should decide which Issue to work on next across multiple active or candidate Issues.
---

# Codex WebUI Execution Orchestrator

## Overview

Use this skill when the main agent needs to coordinate multiple Issues for this repository.

This skill is routing-only. It does not replace the existing single-Issue skills, and it must not directly implement the chosen Issue itself.

Responsibilities:

- use delegated intake to inspect Project / Issue / PR / worktree / `tasks/` state
- choose exactly one current execution target
- park the remaining Issues explicitly
- report tracking drift before recommending fresh execution
- select exactly one next existing repo skill
- invoke that selected repo skill in the same turn when the user asked to proceed with execution
- own the cross-skill continuation loop when the user asked to keep going until a concrete end-state is reached

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
2. Delegate intake to the custom read-only `intake` agent defined in `.codex/config.toml`.
3. Use the intake summary to select one current target.
4. Check whether tracking drift blocks execution.
5. Select exactly one next handoff skill.
6. If the user asked to proceed with work in the current turn, invoke that selected handoff skill in the same turn instead of stopping after the routing brief.
7. If the user asked to continue until a concrete end-state, treat steps 2-6 as one iteration, then re-run intake after the invoked handoff skill returns instead of stopping after the first handoff.
8. Stop only when the requested end-state is reached or execution is hard blocked.
9. Park the other Issues explicitly.

Do not skip delegated intake in this workflow.

If the user explicitly asked only for routing, target selection, or a next-skill recommendation, the workflow may stop after the routing brief.

## Delegated Intake

The delegated intake agent is the first execution step for this skill.

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

If no drift blocks progress, route to one of these skills:

- `codex-webui-work-packages` when local task package state must be created, resumed, reconciled, or archived
- `codex-webui-work-packages` when the active worktree must be created, corrected, or documented, or when package-linked Issue `Execution` metadata must move with the package lifecycle
- `codex-webui-sprint-cycle` when one bounded sprint slice is ready to execute for the chosen Issue
- `codex-webui-github-projects` when Project state, broader Issue tracking state, PR merge, parent-checkout sync, worktree cleanup, or final completion tracking must be corrected

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
- if the current target is still implementation-ready but incomplete, route another bounded slice through `codex-webui-sprint-cycle`
- if the implementation slice is locally complete but package state must be created, reconciled, or archived, route `codex-webui-work-packages`
- if merge, parent-checkout sync, worktree cleanup, Issue close, or Project completion tracking is now the critical path, route `codex-webui-github-projects`

When the chosen target is implementation-ready and no tracking drift blocks execution, the handoff must be `codex-webui-sprint-cycle`.

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
- Do not implement the chosen Issue from this skill
- Do not update GitHub Projects, Issues, or `tasks/` directly from this skill
- Do not let delegated intake mutate GitHub state, local task-package state, or implementation files
- Do not produce a backlog dump or queue report as the final answer
- Do not recommend parallel execution of multiple Issues as the default path
- Do not bypass drift correction when execution tracking is inconsistent
- Do not bypass the selected handoff skill when the user asked to proceed with execution
- Do not treat one completed handoff or one approved sprint as sufficient to end a continue-until request
- Do not keep looping past a real hard block; stop and report the blocking condition concretely

## Example Requests

- `Use $codex-webui-execution-orchestrator to choose the current Issue and next repo skill.`
- `複数Issueの中から今の対象を1つ決めて、次に呼ぶ skill を実行するところまで進めて。`
- `Use $codex-webui-execution-orchestrator for multi-issue routing and then invoke the correct repo skill for the next slice.`
- `Use $codex-webui-execution-orchestrator to keep going until Issue #60 is closed.`
