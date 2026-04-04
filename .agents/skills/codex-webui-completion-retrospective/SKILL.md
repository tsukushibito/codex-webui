---
name: codex-webui-completion-retrospective
description: Run a brief end-of-task retrospective for `codex-webui` before archiving a completed work package or closing an Issue. Use when checking for workflow problems, process improvements, and repeated patterns that should become new or updated repo skills.
---

# Codex WebUI Completion Retrospective

## Overview

Use this skill when work has reached a real completion boundary and the repo should reflect on how that work was executed.

This skill is for workflow review, not for implementation execution or GitHub tracking updates.

Responsibilities:

- confirm that the work is actually at a completion boundary
- review task-package handoff notes, validations, and relevant execution-tracking state
- review whether branch, worktree, PR, Issue, Project, and local repo state still agree on completion
- identify workflow problems, awkward handoffs, or unnecessary agent drift
- identify durable process improvements that belong in `AGENTS.md`, repo skills, or maintained docs
- identify repeated patterns that should become a new repo skill or an update to an existing skill
- summarize the retrospective in concise handoff notes

## Build Context

Read these files before running the review:

- `README.md`
- `AGENTS.md`
- `tasks/README.md`

Then read the minimum task-local context that matches the completion boundary:

- the active or archived task package `README.md`
- the linked Issue `Execution` section when relevant
- the active branch, active worktree, and PR state when relevant
- the nearest relevant `README.md` for the touched area

If a larger retrospective already exists in `artifacts/`, read only the specific file needed for the current review.

## When To Use

Use this skill when:

- archiving a completed task package
- deciding whether a completed Issue is ready to close
- reviewing whether recent work exposed a workflow bug or a missing repo skill
- the user explicitly asks for a retrospective after task completion

Do not use this skill when:

- the work is still clearly in progress
- the user only wants implementation status without workflow reflection
- the task is to update GitHub Project fields or move task-package directories

## Standard Workflow

1. Confirm that the work is at a real completion boundary such as package archive or Issue close.
2. Read the task package, validations, linked execution-tracking context, and branch/worktree/PR/local-repo state when relevant.
3. Capture what worked well enough to preserve.
4. Capture workflow problems, awkward handoffs, repeated confusion, or drift between local completion and GitHub tracking.
5. Decide whether each finding belongs in handoff notes only, `artifacts/`, `AGENTS.md`, or a repo skill.
6. Summarize the retrospective concisely in task-package handoff notes.
7. If the review is too large for short notes, add a focused memo under `artifacts/` and link it from the notes.
8. Name any required follow-up updates explicitly.

## Required Output Shape

Return a short review with these sections in this order:

1. `Completion boundary`
2. `What worked`
3. `Workflow problems`
4. `Improvements to adopt`
5. `Skill candidates or skill updates`
6. `Follow-up updates`

Keep the default review concise. Use `None` when a section has no findings.

## Guardrails

- Do not run this skill for clearly unfinished work
- Do not turn every completion into a long postmortem
- Do not leave durable process improvements only in `tasks/`
- Do not treat an archived task package, evaluator approval, or local-only changes as sufficient evidence that an Issue is ready to close
- Do not treat a merged PR with an uncleared active worktree as fully complete
- Do not create an `artifacts/` memo unless short handoff notes are insufficient
- Do not replace `codex-webui-work-packages` for archive mechanics or `codex-webui-github-projects` for GitHub tracking

## Example Requests

- `Use $codex-webui-completion-retrospective before archiving this completed package.`
- `Close this Issue only after a completion retrospective.`
- `Review whether this finished work exposed a missing repo skill.`
