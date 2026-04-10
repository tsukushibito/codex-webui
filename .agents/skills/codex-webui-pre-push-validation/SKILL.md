---
name: codex-webui-pre-push-validation
description: Run the dedicated pre-push validation gate for `codex-webui` after local implementation is complete and before any push-oriented, merge-oriented, or archive-oriented handoff. Use when a bounded slice is locally complete and needs independent read-only validation evidence from `validator`.
---

# Codex WebUI Pre-Push Validation

## Overview

Use this skill to run the dedicated pre-push validation gate after local completion and before any publish-oriented transition.

This skill exists outside the default sprint loop. A sprint may be evaluator-approved and still not be ready for push, merge, package archive, or completion tracking until this gate passes.

The gate uses the read-only `validator` agent for procedural command execution and evidence capture only. It does not replace `evaluator`, and it does not approve scope changes.
Validator output is evidence only. It must not judge approval, decide whether the slice should merge, or convert expected diagnostic findings into automatic gate failures.

## When To Use

Use this skill when:

- the current slice is locally complete and evaluator-approved
- a push-oriented handoff is next
- a merge-oriented handoff is next
- a package archive or completion-tracking handoff would otherwise proceed

Do not use this skill when:

- the current slice is still being planned or implemented
- evaluator has not yet approved the sprint slice
- the task is only to brainstorm or inspect state without preparing for publish-oriented follow-through

## Inputs

Before running the gate, gather:

- the planner objective and sprint acceptance criteria
- the worker implementation summary
- the worker-run targeted validation evidence from the sprint
- any additional required pre-push commands or evidence named in the task package or source docs
- any touched app paths covered by app-local Biome scripts so the validator can run required app-local `npm run check` commands
- the exact worktree path that will be pushed or handed off

Read `README.md`, `AGENTS.md`, `tasks/README.md`, and the active task package `README.md` when the gate is tied to a tracked Issue.

## Workflow

1. Confirm the slice is locally complete enough for publish-oriented follow-through. If implementation is still changing, return to sprint execution instead of running this gate.
2. Identify the exact pre-push validation commands that should run now. Prefer commands already named by the planner, task package, or source-of-truth docs, plus any narrow read-only inspections needed to explain failures. For changes under `apps/frontend-bff` or `apps/codex-runtime` that are covered by the app-local Biome scripts, include each touched app's local `npm run check` as a required Biome lint/style gate before any push-oriented handoff.
3. Spawn the read-only `validator` agent and explicitly tell it that this is the dedicated pre-push validation gate, not part of the default sprint loop.
4. In the validator prompt, require read-only command execution, faithful evidence capture, and no approval judgment, file edits, commits, pushes, or tracking mutations.
5. Review the validator result locally for command coverage, pass/fail status, expected diagnostic findings, and any blocked commands.
6. Treat pre-declared expected diagnostic findings as evidence, not as automatic gate failures. Wrong-command or wrong-run-id framing errors with no side effects are recoverable rerun cases with corrected expected-output framing.
7. If the validator finds real failures, missing prerequisites, or commands that cannot run after any recoverable rerun, stop the publish-oriented path and report the gate as failed.
8. If the validator evidence is complete and the required commands pass or match the pre-declared expected diagnostic findings, report the gate as passed and hand back the evidence summary for the next publish-oriented skill.

## Required Validator Prompt Content

Every validator prompt for this skill must include all of the following:

- an explicit statement that this is the dedicated pre-push validation gate
- an explicit statement that the task is read-only
- an explicit prohibition on editing files, creating commits, pushing branches, or mutating GitHub/task state
- the exact commands to run and the exact worktree to inspect
- an explicit instruction to return evidence only and not judge approval
- any pre-declared expected diagnostic findings that should be treated as read-only evidence rather than as gate failures

Minimum acceptable pattern:

> This is the dedicated `codex-webui` pre-push validation gate. Stay read-only. Do not edit files, create commits, push branches, or mutate GitHub/task state. Run only these commands in `<worktree>`, capture their outcomes faithfully, treat the declared expected diagnostic findings as evidence only, and return evidence only without judging approval.

## Output Contract

Return a concise result with these sections in this order:

1. `Gate status`
2. `Commands run`
3. `Evidence summary`
4. `Blocking failures or gaps`
5. `Next handoff`

`Gate status` must be either `passed` or `failed`.

If the gate fails, `Next handoff` must block push-oriented, merge-oriented, and archive-oriented follow-through until the implementation or environment issue is resolved.

If the gate passes, `Next handoff` should name the publish-oriented skill or workflow that can proceed with the validator evidence attached.

## Guardrails

- Do not run this gate before evaluator approval for the current slice
- Do not treat sprint approval as a substitute for this gate when publish-oriented handoff is next
- Do not let `validator` edit files, create commits, push, merge, or update tracking state
- Do not let `validator` decide whether the slice is approved or complete
- Do not treat pre-declared expected diagnostic findings from read-only checker commands as automatic gate failures
- Do not treat wrong-command or wrong-run-id framing errors with no side effects as anything other than recoverable rerun cases
- Do not broaden pre-push validation beyond the commands needed for the current handoff without saying so explicitly
- Do not continue to push-oriented, merge-oriented, or archive-oriented handoff when the gate has failing or missing evidence

## Example Requests

- `Use $codex-webui-pre-push-validation before we push this locally complete slice.`
- `Run the dedicated validator gate now that the sprint is approved and we want a publish-oriented handoff.`
- `Use $codex-webui-pre-push-validation after local completion and before package archive or PR follow-through.`
