---
name: codex-webui-execution-handoff
description: Prepare a next-session handoff for `codex-webui` by gathering the minimum repo, task, and implementation context and writing one resumable markdown handoff under `.tmp/`. Use when execution must pause, transfer to a new session, or preserve review/implementation/completion state without mutating `tasks/` or GitHub tracking.
---

# Codex WebUI Execution Handoff

## Overview

Use this skill when execution cannot or should not continue in the current session and the next session needs a concise, directly usable handoff.

This skill is handoff-only. It writes one markdown handoff document under `.tmp/` and does not replace package maintenance, GitHub tracking, or completion review skills.

Responsibilities:

- inspect the current repo, branch, worktree, and validation state
- gather the minimum task, review, and implementation context needed for a resumable handoff
- write exactly one fresh handoff markdown file under `.tmp/`
- distinguish between facts, recommendations, and known risks
- carry forward relevant prior handoff docs without duplicating large transcripts

This skill must not:

- edit `tasks/` packages
- edit GitHub Issues, PRs, or Project items
- archive packages, close Issues, or update tracking state
- implement code or docs as part of the handoff workflow

## Build Context

Read these files before preparing the handoff:

- `README.md`
- `AGENTS.md`
- `tasks/README.md`

Then gather only the context that matches the handoff target:

- nearest relevant `README.md` for the touched area
- existing `.tmp/*.md` handoff docs that overlap with the same target
- active or archived task package `README.md` when relevant
- key touched code paths only when needed to explain the current state

## Standard Workflow

Follow this order every time.

1. Confirm why a handoff is needed now, such as session transfer, rate limit, blocking condition, or explicit user request.
2. Inspect current repo state with:
   - `git status --short --branch`
   - `git log --oneline -1`
   - `git worktree list` when worktree state matters
3. Read the minimum matching local context from `.tmp/`, `tasks/`, and touched-area docs.
4. Decide the handoff mode:
   - `implementation` for active work that must continue
   - `review` for findings and fix directions
   - `completion` for merge / cleanup / close follow-up
5. Choose a short handoff slug in `hyphen-case`.
6. Write exactly one new handoff file as `.tmp/<slug>-handoff-YYYY-MM-DD.md`.
7. If a prior handoff already captures detail, summarize it briefly and link it instead of restating everything.

## Handoff File Rules

Use this filename pattern:

- `.tmp/<slug>-handoff-YYYY-MM-DD.md`

Use a short slug that identifies the target cleanly, for example:

- `phase3-runtime-fix`
- `issue-66-phase-3c-messaging`
- `review-followup`

Keep the file directly usable by the next session:

- record whether the repo is clean/synced or dirty/diverged
- state which branch and worktree matter now
- separate confirmed facts from recommendations
- include exact file paths only when they reduce ambiguity
- include concrete commands only when they are safe and likely to be the next step

## Required Output Shape

Write the handoff markdown using these sections in this order:

1. `Title`
2. `Date / repo / branch / status at handoff`
3. `Purpose`
4. `Current state`
5. `What is already done`
6. `What remains or what the next session must verify`
7. `Recommended execution order`
8. `Suggested validation commands`
9. `Risks / notes for the next session`

Adapt the content by mode:

- `implementation`: emphasize active files, current behavior, and next coding steps
- `review`: emphasize findings, affected code, and fix directions
- `completion`: emphasize merge state, cleanup state, and blockers to closure

## Guardrails

- Do not update `tasks/` or GitHub tracking as part of the handoff
- Do not create multiple competing handoff docs for the same target in one run unless the user explicitly asks
- Do not dump long command transcripts into the handoff
- Do not restate large specs when a short reference to the maintained source of truth is enough
- Do not omit current git state or next-step validation when they materially affect the follow-up work
- Do not treat this skill as a substitute for `codex-webui-completion-retrospective`
- Do not treat this skill as a substitute for `codex-webui-work-packages` or `codex-webui-github-projects`

## Example Requests

- `Use $codex-webui-execution-handoff to prepare a resumable handoff for this runtime fix.`
- `Create a next-session handoff in .tmp for the current review follow-up.`
- `Use $codex-webui-execution-handoff because we need to stop here and carry the work into a new session.`
