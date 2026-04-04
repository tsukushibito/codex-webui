# tasks

This directory holds active task documents only.

Completed task packages must be moved under [`tasks/archive/`](./archive/README.md) so they do not sit next to in-progress work. Final decisions and preserved evidence belong in `docs/` and `artifacts/`, not in the active task area.

## Placement Policy

- Put only in-progress task packages directly under `tasks/`
- Give each active work package a local `README.md` that explains its scope and workflow
- When a work package is complete, move its task documents to `tasks/archive/issue-<number>-<work_id>/`
- Keep the maintained source of truth in `docs/`
- Keep raw evidence, observation logs, and judgment memos in `artifacts/`

## Relationship to Issues and Projects

- Use GitHub Issues and Projects as the execution-tracking layer for priority, ownership, dependencies, and review state
- Use `tasks/` for the active local work package that explains how a currently active Issue will be executed
- Do not create a `tasks/` package for an Issue that is still only in `Todo`
- Every Issue moved to `In Progress` must have exactly one active task package
- A single Issue may accumulate multiple archived task packages over time, but it must never have more than one active package at once

## Naming Rules

- Name each active package as `tasks/issue-<number>-<work_id>/`
- Use a short `hyphen-case` `<work_id>` that describes the current execution slice, such as `phase-2-spec-sync`
- When the package is archived, preserve the same directory name under `tasks/archive/`
- Reopening work on the same Issue should create a new active package rather than moving an archived one back in place

## Required README Contents

Each active task package `README.md` must include at least the following sections.

- `Purpose`
- `Primary issue`
- `Source docs`
- `Scope for this package`
- `Exit criteria`
- `Work plan`
- `Artifacts / evidence`
- `Status / handoff notes`
- `Archive conditions`

## Linking Rules

- Link the task package back to its primary Issue
- Link the Issue to its active task package
- When the Issue already has older packages, keep links to archived packages in the Issue for execution history
- Prefer one primary Issue per task package; mention related Issues only when they materially affect execution

## Completion Flow

- Finish the work described by the active package and update its handoff/evidence notes first
- Move the completed package to `tasks/archive/`
- After the archive move, update the linked Issue and Project status
- Close the Issue only when the full Issue scope is complete
- If the current package is done but the Issue still has remaining work, leave the Issue open, clear the active-package link, and return the Project item to `Todo`

## Current Active Tasks

- None

## Archived Task Packages

- [app_server_behavior_validation](./archive/app_server_behavior_validation/README.md)
- [issue-64-phase-3a-foundation](./archive/issue-64-phase-3a-foundation/README.md)
- [issue-65-phase-3b-session-lifecycle](./archive/issue-65-phase-3b-session-lifecycle/README.md)
