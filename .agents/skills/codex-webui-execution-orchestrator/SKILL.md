---
name: codex-webui-execution-orchestrator
description: Coordinate multi-Issue execution in `codex-webui` by delegating read-only intake to the custom `intake` agent, choosing one current target, and routing to the next existing repo skill. Use when the main agent should decide which Issue to work on next across multiple active or candidate Issues.
---

# Codex WebUI Execution Orchestrator

## Overview

Use this skill when the main agent needs to coordinate multiple Issues for this repository.

This skill is routing-only. It does not replace the existing single-Issue skills, and it must not directly implement the chosen Issue itself.

Responsibilities:

- use delegated intake to inspect Project / Issue / `tasks/` state
- choose exactly one current execution target
- park the remaining Issues explicitly
- report tracking drift before recommending fresh execution
- select exactly one next existing repo skill
- invoke that selected repo skill in the same turn when the user asked to proceed with execution

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
7. Park the other Issues explicitly.

Do not skip delegated intake in this workflow.

If the user explicitly asked only for routing, target selection, or a next-skill recommendation, the workflow may stop after the routing brief.

## Delegated Intake

The delegated intake agent is the first execution step for this skill.

Its job is to inspect:

- GitHub Project state
- open linked Issues and dependencies
- local `tasks/` package state
- source-of-truth docs and nearest relevant README for the candidate target
- local implementation state only after execution tracking is understood

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

If no drift blocks progress, route to one of these skills:

- `codex-webui-work-packages` when local task package state must be created, resumed, reconciled, or archived
- `codex-webui-sprint-cycle` when one bounded sprint slice is ready to execute for the chosen Issue
- `codex-webui-github-projects` when Project or Issue tracking state must be corrected

Do not recommend multiple competing handoffs in the same result.

When the user asked to proceed with execution, do not stop after naming the next handoff skill. Invoke exactly one selected handoff skill in the same turn.

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

## Guardrails

- Do not replace `codex-webui-work-intake`; keep it usable as a standalone intake skill
- Do not implement the chosen Issue from this skill
- Do not update GitHub Projects, Issues, or `tasks/` directly from this skill
- Do not let delegated intake mutate GitHub state, local task-package state, or implementation files
- Do not produce a backlog dump or queue report as the final answer
- Do not recommend parallel execution of multiple Issues as the default path
- Do not bypass drift correction when execution tracking is inconsistent
- Do not bypass the selected handoff skill when the user asked to proceed with execution

## Example Requests

- `Use $codex-webui-execution-orchestrator to choose the current Issue and next repo skill.`
- `複数Issueの中から今の対象を1つ決めて、次に呼ぶ skill を実行するところまで進めて。`
- `Use $codex-webui-execution-orchestrator for multi-issue routing and then invoke the correct repo skill for the next slice.`
