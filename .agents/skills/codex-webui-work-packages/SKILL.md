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

This skill owns the local `tasks/` workflow. If the user also needs GitHub Issue or Project edits, use `codex-webui-github-projects` for that part.

## Build Context

Read these files before changing work packages:

- `README.md`
- `docs/README.md`
- `tasks/README.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md` when roadmap alignment matters

If the work package is tied to a specific area, read the nearest relevant `README.md` in that area first.

## Operating Rules

- Create a work package only for an Issue that is actively being worked
- Each `In Progress` Issue must have exactly one active task package
- A single Issue may have multiple archived task packages over time, but never more than one active package at once
- Prefer one primary Issue per task package
- Link the task package and the Issue to each other
- Keep task-package detail in `tasks/`, not in the Issue body beyond a short execution summary and links
- Archive completed work packages under `tasks/archive/` before marking the execution slice done on the Issue
- Do not move evidence into `tasks/`; keep logs and outputs in `artifacts/`

## Naming Rules

- Active package path: `tasks/issue-<number>-<work_id>/`
- Archived package path: `tasks/archive/issue-<number>-<work_id>/`
- `<work_id>` must be short `hyphen-case` and describe the current execution slice
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

When the user wants local and GitHub state kept aligned, maintain this minimum Issue execution shape:

- An `Execution` section
- An `Active task package` entry
- An `Archived task packages` entry
- Keep links short and do not duplicate the full local work plan in the Issue

Use the template in `assets/issue-execution-template.md` when adding or normalizing the Issue section.

If the user asks you to edit GitHub Issues or Project fields, hand off that part to `codex-webui-github-projects`.

## Standard Workflow

### Start work on an Issue

1. Confirm the primary Issue and the source-of-truth docs
2. Check whether the Issue already has an active package
3. If not, create `tasks/issue-<number>-<work_id>/README.md`
4. Fill the README with the required sections and links
5. Add or update the Issue `Execution` section with the active package link
6. If requested, use `codex-webui-github-projects` to set Project `Status` to `In Progress`

### Update an active package

1. Refresh the README sections that changed
2. Keep `Source docs`, `Exit criteria`, and `Artifacts / evidence` current
3. Update the linked Issue only with concise execution status, not detailed task notes

### Finish an execution slice

1. Confirm the package exit criteria were met
2. Update `Status / handoff notes` and `Artifacts / evidence`
3. Move the package to `tasks/archive/issue-<number>-<work_id>/`
4. Replace the Issue's active-package link with an archived-package link
5. If the Issue scope is fully complete, close it and set Project `Status` to `Done`
6. If more work remains on the Issue, leave it open and set Project `Status` back to `Todo`

### Resume work on an existing Issue

1. Leave old archived packages in place
2. Create a new active package with a new `<work_id>`
3. Update the Issue `Execution` section so only the new package is marked active

## Guardrails

- Do not create a second active package for the same Issue
- Do not use `tasks/` as a second source of truth for requirements or architecture decisions
- Do not store raw evidence in the package directory unless the user explicitly wants that exception
- Do not delete archived packages unless the user explicitly asks
- Do not silently change GitHub Project fields from this skill; use `codex-webui-github-projects`

## Example Requests

- `Use $codex-webui-work-packages to start a local work package for Issue #12.`
- `Use $codex-webui-work-packages to archive the completed task package for Issue #18 and leave handoff notes.`
- `Use $codex-webui-work-packages to reconcile the active package README with the linked Issue.`
