---
name: codex-webui-sprint-evaluator
description: Hard-gate one bounded sprint candidate for `codex-webui` in read-only mode. Use when the evaluator agent must judge a planner-defined sprint against acceptance criteria, write scope, and worker validation evidence without editing files, creating handoffs, or routing follow-up work.
---

# Codex WebUI Sprint Evaluator

## Overview

Use this skill from the `evaluator` agent when one bounded sprint candidate needs a formal hard-gate verdict.

Judge only the current sprint slice. Do not implement fixes, do not create handoff files, and do not decide the next repo skill.

## Build Context

Read only the minimum context needed to judge the sprint:

- `README.md`
- `AGENTS.md`
- `docs/README.md` when source-of-truth docs define the sprint slice
- `tasks/README.md` when the sprint is tied to a tracked Issue or active task package
- the active task package `README.md` when one exists
- the source-of-truth docs linked from that package
- the planner-defined objective, sprint slice, exact write scope, acceptance criteria, and required validation
- the worker implementation summary and worker-supplied validation evidence

Read changed files only when needed to verify the acceptance criteria or classify a finding.

## Required Inputs

Require all of the following before judging the sprint:

- the sprint objective
- the sprint slice
- the exact write scope
- the acceptance criteria
- the required validation commands
- the worker implementation summary
- the worker validation evidence
- the exact worktree path under evaluation

If any of these inputs are missing or ambiguous, return `changes_required`.

## Evaluation Workflow

1. Confirm the sprint is one bounded slice and identify the exact write scope.
2. Review the acceptance criteria and required validation commands.
3. Inspect the worker summary and validation evidence for command coverage and pass or fail status.
4. Verify the actual changed files when needed to confirm whether the write scope matches the planned slice.
5. Read only the files needed to confirm or reject concrete findings.
6. Judge each acceptance criterion as pass or fail based on evidence, not inference alone.
7. Classify any failures as either:
   - `in_scope`: the problem is inside the planned write scope or blocks proof that the sprint met its criteria
   - `out_of_scope`: the problem is outside the planned write scope and the provided evidence still proves the bounded slice met its own criteria
8. Return a formal verdict:
   - return `approved` only when the acceptance criteria are met for the bounded sprint
   - return `changes_required` when acceptance criteria fail, evidence is missing, output shape cannot be satisfied, or scope classification is not proven

## Scope Classification Rule

Use this rule when app-wide validation fails but the sprint was intentionally bounded.

- Return `approved` when the planner criteria explicitly allow a bounded pass condition and the evidence proves:
  - the exact write scope is clean for the required checks
  - all in-scope required validations passed
  - the remaining failures are outside the planned write scope
- Return `changes_required` when the remaining failures might belong to the sprint scope, when the exact write scope was not proven clean, or when the planner criteria required the broader app-wide validation to pass fully

Do not silently widen the sprint during evaluation.

## Required Output Shape

Return exactly these sections in this order:

1. `Verdict`
2. `Acceptance criteria check`
3. `Findings`
4. `Residual risks`
5. `Evidence used`

### `Verdict`

Use exactly one of:

- `approved`
- `changes_required`

### `Acceptance criteria check`

Write one flat bullet per acceptance criterion in this shape:

- `AC<n>: pass - <short reason>`
- `AC<n>: fail - <short reason>`

### `Findings`

- If there are no findings, write `- none`
- Otherwise list concrete findings ordered by severity
- Include file references when a file-specific problem exists
- Mark each finding as `in_scope` or `out_of_scope`

### `Residual risks`

- If none, write `- none`
- Otherwise list only risks that remain after the verdict

### `Evidence used`

List only the evidence actually used, such as validation commands, changed-file inspection, or spot checks.

## Guardrails

- Stay read-only
- Do not edit files
- Do not run mutating commands
- Do not create `.tmp/` handoff files
- Do not suggest the next session plan
- Do not choose the next repo skill
- Do not rewrite or weaken the planner acceptance criteria
- Do not treat missing evidence as a soft warning; return `changes_required`
- Do not return prose outside the required output shape
- Do not omit the formal verdict

## Example Requests

- `Use $codex-webui-sprint-evaluator to judge this bounded sprint candidate in read-only mode.`
- `Use $codex-webui-sprint-evaluator and return a formal approved or changes_required verdict.`
