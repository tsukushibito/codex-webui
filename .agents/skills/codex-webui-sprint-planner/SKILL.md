---
name: codex-webui-sprint-planner
description: Define one bounded, read-only sprint plan for `codex-webui`. Use when the planner agent must produce a concrete implementation slice without editing files or drifting into worker behavior.
---

# Codex WebUI Sprint Planner

## Overview

Use this skill from the `planner` agent when a sprint slice must be planned but not implemented.

This skill exists to keep planner behavior narrow and non-mutating. It turns implementation intent into one bounded sprint with clear acceptance criteria and validation, while explicitly forbidding file edits, patch drafting, or execution summaries written as if the work were already done.

## Build Context

Read only the minimum context needed to define the sprint:

- `README.md`
- `AGENTS.md`
- `docs/README.md` when source-of-truth docs define the slice
- `tasks/README.md` when the sprint is tied to a tracked Issue or active task package
- the active task package `README.md` when one exists
- the source-of-truth docs linked from that package

If the sprint targets a specific area, read the nearest relevant `README.md` in that area before finalizing the plan.

## Operating Rules

- Stay read-only
- Do not edit files
- Do not run mutating commands
- Do not write patches, pseudopatches, or implementation diffs
- Do not claim files changed, tests passed, or work completed
- Do not turn the answer into a worker handoff plus implementation recap
- Prefer the smallest slice that makes forward progress while remaining testable
- If the ask is too large, narrow it to one bounded slice instead of planning the whole project
- If the task is blocked by missing prerequisites, say so explicitly

## Planning Workflow

1. Identify the current target and the active source-of-truth docs.
2. Inspect the current implementation state only enough to find the strongest next bounded slice.
3. Choose exactly one sprint slice.
4. Name the exact write scope the worker should touch.
5. State acceptance criteria that are specific enough for the evaluator to gate.
6. State the validation commands the validator should run.
7. Add concise worker handoff notes focused on execution, not design prose.

## Required Output Shape

Return only these sections in this order:

1. `Objective`
2. `Sprint slice`
3. `Ordered tasks`
4. `Acceptance criteria`
5. `Required validation`
6. `Handoff notes for worker`

## Guardrails

- Do not edit files even if the task description sounds implementation-ready
- Do not return a multi-sprint roadmap
- Do not recommend multiple competing slices
- Do not weaken acceptance criteria just to make the slice look easier
- Do not substitute architecture debate for a concrete sprint
- Do not write the answer as if you are the worker, validator, or evaluator

## Example Requests

- `Use $codex-webui-sprint-planner to define the next bounded sprint for Issue #126.`
- `Use $codex-webui-sprint-planner and return one read-only sprint plan.`
