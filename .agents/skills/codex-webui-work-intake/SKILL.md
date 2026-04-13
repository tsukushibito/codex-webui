---
name: codex-webui-work-intake
description: Decide what to work on next in `codex-webui` by inspecting GitHub Projects before local repo state. Use when the user asks what to do next, which execution slice should start, whether an Issue should be split into SubIssues before execution, or to triage Project, Issue, `tasks/`, docs, and implementation state in the correct order.
---

# Codex WebUI Work Intake

## Overview

Use this skill to decide the next execution slice for this repository.

This skill is intake-only. It does not mutate GitHub Projects, Issues, or local task packages. Its job is to inspect the execution layer first, then the repo state, and return one recommended next action.

Treat responsibilities as follows:

- `docs/` is the source of truth for requirements, specs, validation plans, and roadmap decisions
- GitHub Projects, Issues, and PRs are the execution-tracking layer
- `tasks/` holds the active local work package for the current execution slice
- active worktree state determines where normal implementation is allowed to happen
- implementation directories show what is already built and what remains
- broad parent or phase Issues should be split into SubIssues before execution begins

When the user asks "what should we do next?" or equivalent, do not answer from local files alone if Project state is available.

## Build Context

Read these files before making a recommendation:

- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `tasks/README.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`

If a likely next slice belongs to a specific area, read the nearest relevant `README.md` in that area before finalizing the recommendation.

## Standard Workflow

Follow this order every time.

1. Inspect GitHub Projects first.
2. Inspect open linked Issues, dependencies, and active PRs.
3. Inspect local `tasks/` and worktree state.
4. Check for drift across Project, Issue, PR, worktree, and `tasks/`.
5. Check whether the likely target Issue should be split into SubIssues before execution.
6. Read source-of-truth docs and nearest relevant README for the likely target area.
7. Inspect local implementation state only after the execution layer is understood.
8. Recommend exactly one next work item, unless drift must be fixed first or the target must be split first.

## Project-First Discovery

Prefer `gh` commands first.

```bash
gh project list --owner tsukushibito
gh project view <number> --owner tsukushibito
gh project field-list <number> --owner tsukushibito --format json
gh project item-list <number> --owner tsukushibito --limit 100 --format json
gh issue list --state open --limit 100
gh pr list --state open --limit 100
```

Operational notes for this repository:

- do not trust the default `gh project item-list` page size on Project `#9`; use `--limit 100` during audits so items are not mistaken as missing
- avoid plain `gh issue view <number>` when you only need fields that are available through JSON output; in this environment the default view can fail with a classic-Projects deprecation error from `repository.issue.projectCards`
- prefer `gh issue view <number> --json ...` or `gh api` / GraphQL when inspecting Issue details during intake

When reading Project state, prioritize:

- `In Progress` items before `Todo`
- blockers or dependencies before new feature work
- the highest-priority executable slice, not the largest roadmap phase

If `gh` is unavailable or Project access fails, say so explicitly and mark the recommendation as based on incomplete execution-tracking evidence.

## Local Reconciliation

After Project and Issue inspection, check local `tasks/` and implementation state.

Prefer commands like:

```bash
find tasks -maxdepth 2 -type f -name 'README.md'
git worktree list
rg --files -g '!.worktrees/**'
rg -n "<term>" docs tasks apps .agents/skills -g '!.worktrees/**'
```

Use the parent-checkout exclusions for default discovery, then inspect the tracked active worktree explicitly when you need implementation-state evidence for a normal branch/PR slice.

Use local inspection to answer these questions:

- Is there an active task package for the item that appears to be `In Progress`?
- Does local `tasks/` contradict the Project or linked Issue state?
- Does the Issue `Execution` section point to an active branch, active worktree, and active PR, and do they match actual state?
- Is normal branch/PR work happening from a dedicated `.worktrees/<branch>` checkout instead of the parent checkout?
- When a normal branch/PR slice is active, does the tracked worktree show the expected implementation state?
- Is a task archived locally while the branch is not yet on `main`?
- Is the branch merged but the active worktree still present?
- Is an approved direct-to-`main` exception still only local and not yet pushed to `origin/main`?
- Do the maintained docs already define the expected next slice?
- Does the codebase show that the claimed slice is already complete, partially complete, or not started?

Use the execution-tracking layer, docs, and local state to answer these split-gate questions for the likely target:

- Is this Issue a phase or parent umbrella rather than one bounded execution slice?
- Does the Issue contain multiple separable deliverables or responsibilities that should be tracked independently?
- Would realistic execution likely require multiple PRs, worktrees, or task packages?
- Can the next step be stated as one concrete execution slice without first choosing among multiple sub-slices?
- Would progress, review, or completion tracking be materially clearer if child Issues existed?

## Recommendation Rules

If drift exists, recommend fixing the drift first. Examples:

- Project says `In Progress` but `tasks/` has no active package
- `tasks/` has an active package for an Issue not currently being executed
- local implementation is complete but Project/Issue still claims active execution
- the active worktree is missing or does not match the tracked branch
- normal branch/PR work appears to be happening from the parent checkout
- the task package is archived locally but the PR is still open or the branch is not yet on `main`
- the PR is merged but the active worktree still exists
- the Project says `Done` while the linked PR is still open
- an approved direct-to-`main` exception exists but the commits are not yet pushed to `origin/main`

If no drift blocks progress, decide whether the likely target must be split into SubIssues before execution. Treat this as a gate, not a soft suggestion.

Recommend split-first and hand off to `codex-webui-github-projects` when one or more of these conditions hold:

- the Issue is a parent or phase tracker rather than one bounded slice
- the Issue mixes multiple distinct responsibilities that would naturally become separate execution slices
- realistic execution would likely require multiple PRs, worktrees, or task packages
- the next step is still ambiguous because multiple plausible sub-slices compete to go first
- progress or completion would be materially clearer if tracked through child Issues

If no drift exists and no split is required, recommend one concrete next slice. The recommendation must be specific enough to start execution without another triage pass.

Do not return a long backlog. Pick one.

## Required Output Shape

Return a short brief with these sections in this order:

1. `Next work`
2. `Why this now`
3. `Tracking alignment`
4. `Immediate next action`

If execution-tracking evidence is incomplete, state that in `Tracking alignment`.

## Handoffs

This skill does not edit the tracking layers itself.

- Use `codex-webui-github-projects` when Project fields/items, broader Issue tracking state, PR merge, or final completion tracking should be created or updated
- Use `codex-webui-github-projects` when the likely target must be split into SubIssues before execution can begin
- Use `codex-webui-work-packages` when a local task package should be created, updated, reconciled, or archived, or when package-linked Issue `Execution` state should move with that package
- Use `codex-webui-sprint-cycle` only after the next execution slice has been chosen

## Guardrails

- Do not answer "what next?" from `docs/` or `apps/` alone when GitHub Project state exists
- Do not create or edit Project items from this skill
- Do not create, update, or archive `tasks/` packages from this skill
- Do not recommend a new feature slice before reporting Project / Issue / `tasks/` drift
- Do not recommend `work-packages` or `sprint-cycle` for a broad target that should be split into SubIssues first
- Do not duplicate long roadmap content in the answer; link or summarize briefly
- Do not recommend multiple competing next actions

## Example Requests

- `Use $codex-webui-work-intake to decide what to work on next.`
- `Project と repo を見て次の実行スライスを決めて。`
- `Use $codex-webui-work-intake to audit Project, Issue, tasks, and local code before recommending the next task.`
- `Use $codex-webui-work-intake to decide whether this Issue should be split into SubIssues before execution starts.`
