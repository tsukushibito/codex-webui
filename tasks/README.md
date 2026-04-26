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
- Treat sprint approval as local completion only, not as the final publish gate
- Before any push-oriented, merge-oriented, or archive-oriented handoff, run the dedicated pre-push validation step
- Move the completed package to `tasks/archive/` only after the execution slice is locally complete, the pre-push validation step passed, and the handoff notes are updated
- If the default branch workflow is being used, keep the linked Issue and Project in execution state until the PR is merged to `main`, the parent checkout is synced, and the active worktree has been removed
- If an approved direct-to-`main` exception is being used, do not mark the work complete until the commits are pushed to `origin/main`
- After the work is reachable on `main`, update the linked Issue and Project status
- Close the Issue only when the full Issue scope is complete and the local repo state is clean and synced
- If the current package is done but the Issue still has remaining work, leave the Issue open
- Keep the Project item in `In Progress` until the current slice reaches `main` and any required worktree cleanup is complete, then clear the active-package link and return the Project item to `Todo` until the next slice starts

## Current Active Tasks

None.

## Archived Task Packages

- [issue-255-e2e-mock-builders](./archive/issue-255-e2e-mock-builders/README.md)
- [issue-254-test-suite-split](./archive/issue-254-test-suite-split/README.md)
- [issue-252-css-surface-modules](./archive/issue-252-css-surface-modules/README.md)
- [issue-253-retire-home-approvals](./archive/issue-253-retire-home-approvals/README.md)
- [issue-251-chat-view-components](./archive/issue-251-chat-view-components/README.md)
- [issue-250-chat-page-hooks](./archive/issue-250-chat-page-hooks/README.md)
- [issue-249-bff-route-boilerplate](./archive/issue-249-bff-route-boilerplate/README.md)
- [issue-248-bff-mapping-boundaries](./archive/issue-248-bff-mapping-boundaries/README.md)
- [issue-247-bff-type-boundaries](./archive/issue-247-bff-type-boundaries/README.md)
- [issue-246-bff-resource-handlers](./archive/issue-246-bff-resource-handlers/README.md)
- [issue-245-request-helper-lifecycle](./archive/issue-245-request-helper-lifecycle/README.md)
- [issue-244-gateway-event-translation](./archive/issue-244-gateway-event-translation/README.md)
- [issue-243-persistence-boundary](./archive/issue-243-persistence-boundary/README.md)
- [issue-242-thread-orchestration-boundary](./archive/issue-242-thread-orchestration-boundary/README.md)
- [issue-260-error-code-normalization](./archive/issue-260-error-code-normalization/README.md)
- [issue-257-readme-v09-sync](./archive/issue-257-readme-v09-sync/README.md)
- [issue-261-tracking-drift](./archive/issue-261-tracking-drift/README.md)
- [issue-222-ui-gap-validation](./archive/issue-222-ui-gap-validation/README.md)
- [issue-221-visual-language-polish](./archive/issue-221-visual-language-polish/README.md)
- [issue-220-mobile-thread-density](./archive/issue-220-mobile-thread-density/README.md)
- [issue-219-contextual-details](./archive/issue-219-contextual-details/README.md)
- [issue-218-feedback-recovery](./archive/issue-218-feedback-recovery/README.md)
- [issue-217-navigation-return-surface](./archive/issue-217-navigation-return-surface/README.md)
- [issue-216-timeline-chronology](./archive/issue-216-timeline-chronology/README.md)
- [issue-215-first-input-composer](./archive/issue-215-first-input-composer/README.md)
- [issue-205-mobile-responsive-polish](./archive/issue-205-mobile-responsive-polish/README.md)
- [issue-204-desktop-shell-polish](./archive/issue-204-desktop-shell-polish/README.md)
- [issue-203-ux-regression-coverage](./archive/issue-203-ux-regression-coverage/README.md)
- [issue-202-thread-surface-detail](./archive/issue-202-thread-surface-detail/README.md)
- [issue-201-navigation-thread-identity](./archive/issue-201-navigation-thread-identity/README.md)
- [issue-200-timeline-thread-view](./archive/issue-200-timeline-thread-view/README.md)
- [issue-199-bff-title-helpers](./archive/issue-199-bff-title-helpers/README.md)
- [issue-198-ux-source-boundaries](./archive/issue-198-ux-source-boundaries/README.md)
- [issue-183-timeline-grouping](./archive/issue-183-timeline-grouping/README.md)
- [issue-182-thread-view-composer](./archive/issue-182-thread-view-composer/README.md)
- [issue-181-navigation-home-replacement](./archive/issue-181-navigation-home-replacement/README.md)
- [issue-180-contract-audit](./archive/issue-180-contract-audit/README.md)
- [issue-179-desktop-state-spec](./archive/issue-179-desktop-state-spec/README.md)
- [issue-178-benchmark-agent-uis](./archive/issue-178-benchmark-agent-uis/README.md)
- [issue-177-thread-view-ia](./archive/issue-177-thread-view-ia/README.md)
- [issue-168-legacy-surface-validation](./archive/issue-168-legacy-surface-validation/README.md)
- [issue-167-home-shell-resume](./archive/issue-167-home-shell-resume/README.md)
- [issue-166-request-detail-recovery](./archive/issue-166-request-detail-recovery/README.md)
- [issue-165-thread-first-shell](./archive/issue-165-thread-first-shell/README.md)
- [issue-164-ui-state-matrix](./archive/issue-164-ui-state-matrix/README.md)
- [issue-150-ngrok-sse-validation](./archive/issue-150-ngrok-sse-validation/README.md)
- [issue-158-post-start-sendability](./archive/issue-158-post-start-sendability/README.md)
- [issue-154-ngrok-launcher-cutover](./archive/issue-154-ngrok-launcher-cutover/README.md)
- [issue-153-ngrok-prereqs-doctor](./archive/issue-153-ngrok-prereqs-doctor/README.md)
- [issue-152-ngrok-doc-sync](./archive/issue-152-ngrok-doc-sync/README.md)
- [issue-125-phase-4a-bff-cutover](./archive/issue-125-phase-4a-bff-cutover/README.md)
- [issue-135-read-only-fallback-rules](./archive/issue-135-read-only-fallback-rules/README.md)
- [issue-134-orchestrator-run-semantics](./archive/issue-134-orchestrator-run-semantics/README.md)
- [issue-133-orchestration-log-summaries](./archive/issue-133-orchestration-log-summaries/README.md)
- [app_server_behavior_validation](./archive/app_server_behavior_validation/README.md)
- [issue-117-wiki-agent-guidance](./archive/issue-117-wiki-agent-guidance/README.md)
- [issue-116-wiki-index-log](./archive/issue-116-wiki-index-log/README.md)
- [issue-115-wiki-scope-structure](./archive/issue-115-wiki-scope-structure/README.md)
- [issue-64-phase-3a-foundation](./archive/issue-64-phase-3a-foundation/README.md)
- [issue-65-phase-3b-session-lifecycle](./archive/issue-65-phase-3b-session-lifecycle/README.md)
- [issue-92-restore-recovery-validation](./archive/issue-92-restore-recovery-validation/README.md)
- [issue-97-live-assistant-response](./archive/issue-97-live-assistant-response/README.md)
- [issue-98-chat-status-feedback](./archive/issue-98-chat-status-feedback/README.md)
- [issue-93-playwright-e2e-acceptance](./archive/issue-93-playwright-e2e-acceptance/README.md)
- [issue-93-playwright-thread-followup](./archive/issue-93-playwright-thread-followup/README.md)
- [issue-102-approval-wait-state-convergence](./archive/issue-102-approval-wait-state-convergence/README.md)
- [issue-90-post-start-sendability](./archive/issue-90-post-start-sendability/README.md)
- [issue-91-contract-validation](./archive/issue-91-contract-validation/README.md)
- [issue-80-phase-4a3-sse-relay](./archive/issue-80-phase-4a3-sse-relay/README.md)
