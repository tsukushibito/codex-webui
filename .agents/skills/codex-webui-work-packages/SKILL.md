---
name: codex-webui-work-packages
description: Manage active local work packages in `tasks/` for this `codex-webui` repository. Use when starting work from an Issue, creating or updating a task package README, linking an Issue to its active `tasks/` package, archiving a completed package, or reconciling local `tasks/` state with GitHub Issue and Project status.
---

# Codex WebUI Work Packages

## Overview

Use this skill when the user needs to create, update, review, or archive a local work package under `tasks/`.

Treat responsibilities as follows:

- `docs/` is the source of truth for scope, requirements, specifications, validation plans, and roadmap decisions
- GitHub Issues and Projects track execution state, ownership, dependencies, and review flow
- `tasks/` holds the active local work package for an Issue that is currently being executed
- `artifacts/` holds evidence such as logs, outputs, and judgment notes

This skill owns the local `tasks/` workflow and the package-lifecycle updates to the linked Issue `Execution` section. Use `codex-webui-github-projects` for Project fields, broader Issue tracking changes, PR merge/completion work, and final execution-state cleanup after the work reaches `main`.

When `codex-webui-execution-orchestrator` selects task-package creation, resumption, reconciliation, or archive work as the next step, this skill is the required path for that package-state change.

## Build Context

Read these files before changing work packages:

- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `tasks/README.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md` when roadmap alignment matters

If the work package is tied to a specific area, read the nearest relevant `README.md` in that area first.

## Operating Rules

- Create a work package only for an Issue that is actively being worked
- Each `In Progress` Issue must have exactly one active task package
- A single Issue may have multiple archived task packages over time, but never more than one active package at once
- Default repo-tracked change flow is a short-lived branch and PR; direct commits to `main` are exceptions only and should happen only for urgent fixes or explicit user direction
- For normal branch/PR work, prepare and use a dedicated git worktree under `.worktrees/<branch>` and keep the parent checkout as the control checkout
- For normal branch/PR work, create or edit repo-tracked task-package files only from the active worktree after it exists; do not start package edits from the parent checkout
- For normal branch/PR work, if the parent checkout has `.venv/` and the new worktree does not, create a worktree-local symlink `.venv -> ../../.venv` so Python tooling is shared across worktrees
- For normal branch/PR work, if the parent checkout already has app-local Node.js dependencies such as `apps/frontend-bff/node_modules` or `apps/codex-runtime/node_modules`, prefer worktree-local symlinks to those directories instead of running a fresh `npm install` in every worktree
- Treat the shared `.venv` symlink as local environment plumbing only: do not replace an existing worktree `.venv`, do not record it in Issue tracking, and do not rely on it as a repo-tracked artifact
- Treat shared `node_modules` symlinks as local environment plumbing only: only create them when the parent checkout and worktree use the same lockfile state, do not replace an existing real directory, do not record them in Issue tracking, and do not rely on them as repo-tracked artifacts
- Approved direct-to-`main` exceptions may use the parent checkout and must record `Active worktree: .`
- Prefer one primary Issue per task package
- Link the task package and the Issue to each other
- Keep task-package detail in `tasks/`, not in the Issue body beyond a short execution summary and links
- Before archiving a completed package or closing its Issue, run `codex-webui-completion-retrospective`
- Archive completed work packages under `tasks/archive/` before marking the execution slice done on the Issue
- Before closing an Issue or setting Project `Status` to `Done`, verify the work is reachable on `main`
- Under the default workflow this means the PR is merged to `main`; under an approved direct-to-`main` exception this means the commits are pushed to `origin/main`
- Do not move evidence into `tasks/`; keep logs and outputs in `artifacts/`

## Naming Rules

- Active package path: `tasks/issue-<number>-<work_id>/`
- Archived package path: `tasks/archive/issue-<number>-<work_id>/`
- `<work_id>` must be short `hyphen-case` and describe the current execution slice
- Default active branch name: `issue-<number>-<work_id>`
- Default active worktree path: `.worktrees/issue-<number>-<work_id>`
- Reopened work should create a new package with a new `<work_id>` rather than reactivating an archived directory

## Required README Shape

Each active task package `README.md` should contain these sections in this order:

1. `Purpose`
2. `Primary issue`
3. `Source docs`
4. `Scope for this package`
5. `Exit criteria`
6. `Work plan`
7. `Artifacts / evidence`
8. `Status / handoff notes`
9. `Archive conditions`

Use the template in `assets/task-package-template.md` unless the user has already established a different local format.

## Issue Coordination

When the user wants local and GitHub state kept aligned, this skill maintains the package-lifecycle portion of the linked Issue `Execution` section with this minimum shape:

- An `Execution` section
- An `Active branch` entry
- An `Active worktree` entry
- An `Active PR` entry
- An `Active task package` entry
- An `Archived task packages` entry
- Keep links short and do not duplicate the full local work plan in the Issue

Use the template in `assets/issue-execution-template.md` when adding or normalizing the Issue section.

If the user asks you to edit Project fields, close or retitle Issues, or change Issue content beyond concise package-linked `Execution` updates, hand off that part to `codex-webui-github-projects`.

## Standard Workflow

### Start work on an Issue

1. Confirm the primary Issue and the source-of-truth docs
2. Sync the parent checkout to the current `main` before creating a new worktree
3. Check whether the Issue already has an active package
4. For normal branch/PR work, create branch `issue-<number>-<work_id>` and worktree `.worktrees/issue-<number>-<work_id>` from the parent checkout
5. If the parent checkout has `.venv/` and the worktree does not, create `.worktrees/issue-<number>-<work_id>/.venv` as a symlink to `../../.venv`
6. If the parent checkout already has `apps/<app>/node_modules` and the matching worktree app directory does not, create a symlink to the parent checkout copy so Node.js dependencies are shared across worktrees
7. After the active worktree exists, switch execution into that worktree and create or update `tasks/issue-<number>-<work_id>/README.md` there
8. Only when the user explicitly approved a direct-to-`main` exception, use the parent checkout instead and record `Active worktree: .`
9. Fill the README with the required sections and links
10. Add or update the linked Issue `Execution` section with the active branch, active worktree, active PR if one exists, and active package link so the Issue reflects the current package lifecycle state
11. If requested, use `codex-webui-github-projects` to set Project `Status` to `In Progress`

Typical parent-checkout commands for the default branch/PR flow are:

```bash
git fetch origin
git worktree add -b issue-<number>-<work_id> .worktrees/issue-<number>-<work_id> origin/main
if [ -d .venv ] && [ ! -e .worktrees/issue-<number>-<work_id>/.venv ]; then ln -s ../../.venv .worktrees/issue-<number>-<work_id>/.venv; fi
if [ -d apps/frontend-bff/node_modules ] && [ ! -e .worktrees/issue-<number>-<work_id>/apps/frontend-bff/node_modules ]; then ln -s ../../../apps/frontend-bff/node_modules .worktrees/issue-<number>-<work_id>/apps/frontend-bff/node_modules; fi
if [ -d apps/codex-runtime/node_modules ] && [ ! -e .worktrees/issue-<number>-<work_id>/apps/codex-runtime/node_modules ]; then ln -s ../../../apps/codex-runtime/node_modules .worktrees/issue-<number>-<work_id>/apps/codex-runtime/node_modules; fi
```

After the worktree is created, create or edit the task-package files from that worktree, not from the parent checkout.

### Update an active package

1. Refresh the README sections that changed
2. Keep `Source docs`, `Exit criteria`, and `Artifacts / evidence` current
3. Keep the linked Issue `Execution` section current for package-lifecycle branch, worktree, PR, and package links
4. Update the linked Issue only with concise execution status, not detailed task notes

### Finish an execution slice

1. Confirm the package exit criteria were met
2. Run `codex-webui-completion-retrospective` and update `Status / handoff notes`, using `artifacts/` only if the review needs more than a short summary
3. Move the package to `tasks/archive/issue-<number>-<work_id>/` once the slice is locally complete
4. Replace the Issue's active-package link with an archived-package link and keep the active branch, active worktree, and active PR visible until the work reaches `main`
5. If more work remains on the Issue, leave it open and keep Project `Status` in execution until the current slice reaches `main`
6. Hand off PR squash merge, parent-checkout `main` sync, worktree cleanup, Project-field updates, and final completion tracking to `codex-webui-github-projects`
7. If the PR is still open, the branch is not yet on `main`, an approved direct-to-`main` exception is not yet pushed, or the required worktree cleanup is not yet complete, stop after the archive/update steps and keep GitHub tracking active
8. Do not close the Issue or set Project `Status` to `Done` from this skill; final completion belongs to `codex-webui-github-projects`

### Resume work on an existing Issue

1. Leave old archived packages in place
2. Choose a new `<work_id>` for the new execution slice; do not reactivate an archived package directory
3. For normal branch/PR work, sync the parent checkout to the current `main` and create a new branch `issue-<number>-<work_id>` with worktree `.worktrees/issue-<number>-<work_id>`
4. If the parent checkout has `.venv/` and the worktree does not, create `.worktrees/issue-<number>-<work_id>/.venv` as a symlink to `../../.venv`
5. If the parent checkout already has `apps/<app>/node_modules` and the matching worktree app directory does not, create a symlink to the parent checkout copy before running Node.js tooling
6. Only when the user explicitly approved a direct-to-`main` exception, use the parent checkout instead and record `Active worktree: .`
7. Create a new active package with the new `<work_id>` in the active worktree for the new slice
8. Update the Issue `Execution` section so only the new package is marked active and its branch/worktree entries match the new slice

## Guardrails

- Do not create a second active package for the same Issue
- When invoked by `codex-webui-execution-orchestrator`, do not let the main agent bypass this skill by mutating `tasks/` directly outside the package workflow
- Do not use `tasks/` as a second source of truth for requirements or architecture decisions
- Do not store raw evidence in the package directory unless the user explicitly wants that exception
- Do not delete archived packages unless the user explicitly asks
- Do not treat package archive alone as sufficient evidence for Issue close or Project `Done`
- Do not let Issue close or Project `Done` happen while a PR remains open, the branch is not yet on `main`, an approved direct-to-`main` exception is unpushed, the required worktree cleanup is incomplete, or the local repo is dirty
- Do not perform PR merge or worktree cleanup from this skill; hand that part to `codex-webui-github-projects`
- Do not silently change GitHub Project fields from this skill; use `codex-webui-github-projects`

## Example Requests

- `Use $codex-webui-work-packages to start a local work package for Issue #12.`
- `Use $codex-webui-work-packages to archive the completed task package for Issue #18 and leave handoff notes.`
- `Use $codex-webui-work-packages to reconcile the active package README with the linked Issue.`
