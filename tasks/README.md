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
- Default repo-tracked change flow is a short-lived branch and PR; direct commits to `main` are exceptions only
- For normal branch/PR work, execute from `.worktrees/<branch>` and keep the parent checkout as the control checkout
- Approved direct-to-`main` exceptions may use the parent checkout and must record `Active worktree: .`
- Do not create a `tasks/` package for an Issue that is still only in `Todo`
- Every Issue moved to `In Progress` must have exactly one active task package
- A single Issue may accumulate multiple archived task packages over time, but it must never have more than one active package at once

## Naming Rules

- Name each active package as `tasks/issue-<number>-<work_id>/`
- Use a short `hyphen-case` `<work_id>` that describes the current execution slice, such as `phase-2-spec-sync`
- When work uses the default branch workflow, name the active branch `issue-<number>-<work_id>` to match the task package
- When work uses the default branch workflow, record the active worktree as `.worktrees/issue-<number>-<work_id>`
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
- Keep the Issue `Execution` section updated with the active branch, active worktree, and active PR when they exist
- When the Issue already has older packages, keep links to archived packages in the Issue for execution history
- Prefer one primary Issue per task package; mention related Issues only when they materially affect execution

## Completion Flow

- Finish the work described by the active package and update its handoff/evidence notes first
- Move the completed package to `tasks/archive/` once the execution slice is locally complete and the handoff notes are updated
- If the default branch workflow is being used, keep the linked Issue and Project in execution state until the PR is merged to `main`, the parent checkout is synced, and the active worktree has been removed
- If an approved direct-to-`main` exception is being used, do not mark the work complete until the commits are pushed to `origin/main`
- After the work is reachable on `main`, update the linked Issue and Project status
- Close the Issue only when the full Issue scope is complete and the local repo state is clean and synced
- If the current package is done but the Issue still has remaining work, leave the Issue open
- Keep the Project item in `In Progress` until the current slice reaches `main` and any required worktree cleanup is complete, then clear the active-package link and return the Project item to `Todo` until the next slice starts

## Current Active Tasks

- None

## Archived Task Packages

- [app_server_behavior_validation](./archive/app_server_behavior_validation/README.md)
- [issue-64-phase-3a-foundation](./archive/issue-64-phase-3a-foundation/README.md)
- [issue-65-phase-3b-session-lifecycle](./archive/issue-65-phase-3b-session-lifecycle/README.md)
- [issue-92-restore-recovery-validation](./archive/issue-92-restore-recovery-validation/README.md)
- [issue-90-post-start-sendability](./archive/issue-90-post-start-sendability/README.md)
- [issue-91-contract-validation](./archive/issue-91-contract-validation/README.md)
- [issue-80-phase-4a3-sse-relay](./archive/issue-80-phase-4a3-sse-relay/README.md)
