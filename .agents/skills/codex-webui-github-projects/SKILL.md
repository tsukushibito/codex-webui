---
name: codex-webui-github-projects
description: Manage GitHub Projects for this `codex-webui` repository using the repo's documented ownership boundaries. Use when creating or updating the repo's GitHub Project, adding or refining roadmap issues, setting project fields, keeping Project items aligned with `docs/codex_webui_mvp_roadmap_v0_1.md`, or maintaining issue/PR workflow with `gh` and GitHub GraphQL.
---

# Codex WebUI GitHub Projects

## Overview

Use GitHub Projects as the execution layer for this repository, not as the source of truth. Keep maintained requirements, specifications, and roadmap decisions in `docs/`; keep active work packages in `tasks/`; keep evidence in `artifacts/`.

This skill owns GitHub-side execution tracking. If the user needs to create, update, or archive a local task package under `tasks/`, use `codex-webui-work-packages` for that part and keep this skill focused on Issues, Project items, fields, PR merge/completion flow, and workflow state that is not part of in-flight package maintenance.

## Build Context

Read these files before changing the Project shape or roadmap items:

- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `tasks/README.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`

If editing issues tied to a specific area, read the nearest relevant README in that area first.

## Operating Rules

- Treat `docs/` as the source of truth for scope, decisions, and completion criteria.
- Use GitHub Projects to track execution state, ownership, sequencing, and review flow.
- Default repo-tracked change flow is a short-lived branch and PR; direct commits to `main` are exceptions only.
- For normal branch/PR work, use the dedicated worktree under `.worktrees/<branch>` and keep the parent checkout as the control checkout.
- Approved direct-to-`main` exceptions may use the parent checkout and must record `Active worktree: .`
- Keep local task-package mechanics in `codex-webui-work-packages`; only store short execution links and summaries in Issues.
- Avoid duplicating long roadmap text into the Project README or issue bodies unless the duplication materially helps execution.
- Preserve terminology already used in nearby docs: `Phase`, `Runtime`, `BFF`, `UI`, `Validation`, `Infra`.
- Prefer updating the existing Project instead of creating a competing Project, unless the user explicitly wants a new one.
- Delete or replace an older Project only when the user explicitly asks.

## Standard Project Shape

When creating or normalizing the repo Project, prefer this baseline:

- Title: `codex-webui MVP roadmap v0.1`
- Visibility: `PUBLIC` unless the user requests otherwise
- Linked repository: `tsukushibito/codex-webui`
- README: short operating notes plus links to `docs/`, `tasks/`, and `artifacts/`

Prefer these custom fields:

- `Phase`: `Phase 0 Prep`, `Phase 1 Observe`, `Phase 2 Spec`, `Phase 3 Runtime`, `Phase 4 BFF/UI`, `Phase 5 Test`
- `Area`: `Docs`, `Runtime`, `BFF`, `UI`, `Validation`, `Infra`
- `Priority`: `P0`, `P1`, `P2`
- `Estimate`: number
- `Target date`: date

Use the built-in `Status` field unless the user explicitly wants a different workflow. Default to `Todo`, `In Progress`, and `Done` if the project is new.

Keep items with open PRs, unmerged execution branches, uncleared active worktrees, or unpushed direct-to-`main` exceptions in `In Progress`; do not use `Done` until the work is reachable on `main` and required cleanup is complete.

## Standard Work Breakdown

Start from roadmap phases, then split only as needed.

- Create parent issues for major phases or deliverables.
- Split Phase 4 into separate `BFF` and `UI` issues when that makes ownership or reporting clearer.
- Keep issue bodies short and link back to the relevant roadmap section.
- Use sub-issues or dependencies for execution breakdown if the repo needs finer tracking.
- Link PRs to the relevant issue instead of tracking implementation only at the Project item level.

## Command Workflow

Prefer `gh` first. Use GraphQL only when `gh project` cannot express the needed operation.

Known operational pitfalls in this repository:

- `gh issue` does not expose a dedicated sub-issue command in the current CLI surface; use `gh api` for formal sub-issue operations
- prefer REST sub-issue endpoints before GraphQL mutations when both are theoretically available; GraphQL and REST may not behave the same way in this environment
- when an API endpoint expects numbers or booleans, use `-F/--field` or `--input`; do not use `-f/--raw-field` for typed JSON values
- do not parallelize sub-issue mutations against the same parent issue; GitHub can reject concurrent writes with ordering or priority conflicts
- always pass `--limit 100` when auditing Project #9 with `gh project item-list`; the default limit is 30 and can hide valid items
- verify issue hierarchy through the Issue APIs, and verify Project membership and field values separately; do not assume one CLI output shows all three correctly
- the Project `Parent issue` field is a built-in `PARENT_ISSUE` field and is not currently editable through `gh project item-edit` / `updateProjectV2ItemFieldValue`; after adding a sub-issue, verify the formal parent relation through the REST Issue API `parent_issue_url` and the parent issue's `sub_issues` list, and use issue body links/comments when Project UI visibility needs an explicit fallback
- `gh pr checks` can exit 1 with `no checks reported on the '<branch>' branch` when no remote checks are configured; if `gh pr view --json mergeable,statusCheckRollup` shows the PR is mergeable and the rollup is empty, treat local validation evidence as the gate and do not turn the missing remote checks into an automatic blocker

### Inspect current state

Use:

```bash
gh project list --owner tsukushibito
gh project view <number> --owner tsukushibito
gh project field-list <number> --owner tsukushibito --format json
gh project item-list <number> --owner tsukushibito --limit 100 --format json
gh issue list --state open --limit 100
gh pr list --state open --limit 100
git worktree list
git status --short --branch
```

### Create or reshape a Project

Use:

```bash
gh project create --owner tsukushibito --title "codex-webui MVP roadmap v0.1"
gh project edit <number> --owner tsukushibito --description "..." --readme "..." --visibility PUBLIC
gh project link <number> --owner tsukushibito --repo tsukushibito/codex-webui
gh project field-create <number> --owner tsukushibito --name "Phase" --data-type SINGLE_SELECT --single-select-options "Phase 0 Prep,Phase 1 Observe,Phase 2 Spec,Phase 3 Runtime,Phase 4 BFF/UI,Phase 5 Test"
```

### Create items

Create issues first, then add them to the Project:

```bash
gh issue create --repo tsukushibito/codex-webui --title "..." --body-file <file>
gh project item-add <project-number> --owner tsukushibito --url <issue-url>
```

Do not rely on `gh issue create --project` for Projects v2 workflow. Prefer explicit `gh project item-add`.

When the new issue must appear as a child of an existing parent issue:

1. Create the child issue.
2. Create the formal GitHub issue hierarchy before or immediately after adding the item to the Project.
3. Add the child issue to Project #9.
4. Set only editable Project fields such as `Status`, `Phase`, `Area`, `Priority`, and `Implementation Line`.
5. Verify the Issue hierarchy through the REST Issue API.
6. Verify Project membership and editable field values through `gh project item-list`.
7. If the Project built-in `Parent issue` field is empty in `gh project item-list` or GraphQL field values, do not try to edit it directly; it is a derived `PARENT_ISSUE` field and may not be API-editable. Use the Issue hierarchy API result as the authoritative parent-child check, and add explicit parent/child links in issue bodies or comments when Project UI visibility needs a fallback.

Example:

```bash
child_url="$(gh issue create --repo tsukushibito/codex-webui --title "..." --body-file <file>)"
child_number="${child_url##*/}"
child_rest_id="$(gh api "repos/tsukushibito/codex-webui/issues/${child_number}" --jq .id)"
gh api -X POST "repos/tsukushibito/codex-webui/issues/<parent-number>/sub_issues" -F "sub_issue_id=${child_rest_id}"
gh project item-add 9 --owner tsukushibito --url "${child_url}"

gh api "repos/tsukushibito/codex-webui/issues/${child_number}" --jq '{number,title,parent_issue_url}'
gh api "repos/tsukushibito/codex-webui/issues/<parent-number>/sub_issues" --jq ".[] | select(.number == ${child_number}) | {number,title,state,html_url}"
gh project item-list 9 --owner tsukushibito --limit 100 --format json
```

### Update field values

Use:

```bash
gh project item-edit --id <item-id> --project-id <project-id> --field-id <field-id> --single-select-option-id <option-id>
gh project item-edit --id <item-id> --project-id <project-id> --field-id <field-id> --date YYYY-MM-DD
gh project item-edit --id <item-id> --project-id <project-id> --field-id <field-id> --number <value>
```

When field IDs or option IDs are needed, fetch them from `gh project field-list --format json` or `gh api graphql`.

## Update Workflow

When the user asks to maintain the roadmap Project:

1. Confirm the current source-of-truth docs and read the roadmap.
2. Discover the existing Project instead of assuming numbers or IDs.
3. Inspect fields and current items before changing structure.
4. Create or update issues to match the roadmap's current phase breakdown.
5. Add items to the Project and set `Phase`, `Area`, `Priority`, and `Status`.
6. Verify the result with `gh project view`, `gh project item-list`, or GraphQL field-value queries.

When an Issue also uses a local task package:

1. Read `tasks/README.md` and check the linked package state.
2. Check the Issue `Execution` section for the active branch, active worktree, and active PR when they exist.
3. When this skill updates the Issue `Execution` section during merge/completion transitions, keep it short and limited to branch/worktree/PR/package links.
4. Let `codex-webui-work-packages` handle package creation, README updates, and archive moves.
5. Let `codex-webui-work-packages` own package creation, archive moves, and package-linked `Execution` updates while the slice is in flight.
6. For normal branch/PR work, own PR `squash merge`, parent-checkout `main` sync, worktree cleanup, and final completion tracking.
7. Before closing an Issue or setting Project `Status` to `Done`, verify the work is reachable on `main`: merged PR to `main` for the default workflow, or pushed commits on `origin/main` for an approved direct-to-`main` exception.
8. If the PR remains open, the branch is not yet on `main`, the active worktree still exists, or the local repo state is dirty, keep the Issue and Project in execution rather than `Done`.
9. If the current slice is merged and cleaned up but the Issue still has remaining work, clear the active branch, active worktree, and active PR from the Issue `Execution` section and return the Project item to `Todo` until the next slice starts.
10. Only when the full Issue scope is complete should this skill close the Issue and set Project `Status` to `Done`.
11. If review or post-merge verification finds additional in-scope correctness work after an Issue was already closed, reopen that Issue or create a linked follow-up Issue before execution starts; do not leave the repair slice untracked while code work proceeds.

Typical parent-checkout commands for the default branch/PR completion flow are:

```bash
gh pr merge <number> --squash --delete-branch=false
git fetch origin
git pull --ff-only origin main
git worktree remove .worktrees/issue-<number>-<work_id>
git status --short --branch
```

## Guardrails

- Do not hardcode Project IDs, field IDs, or item IDs in the skill; discover them each run.
- Do not silently replace field semantics in an existing Project.
- Do not duplicate detailed acceptance criteria from `docs/` into many issue bodies unless the user asks for that granularity.
- Do not move completed evidence into `tasks/`; keep `tasks/` for active work only.
- Do not take over active package-lifecycle maintenance that belongs to `codex-webui-work-packages`; use this skill for Project state, broader Issue tracking, merge/completion flow, and post-merge cleanup.
- Do not mark an Issue or Project item as complete while a PR remains open, the execution branch is not yet on `main`, the active worktree still exists, an approved direct-to-`main` exception is unpushed, or the local repo state is dirty.
- Do not leave post-close bug-fix work untracked; when a closed Issue still needs in-scope repair, reopen it or create a follow-up Issue before implementation.
- Do not delete old Projects, issues, or items without an explicit user instruction.

## Example Requests

- `Use $codex-webui-github-projects to create the roadmap Project from docs/codex_webui_mvp_roadmap_v0_1.md.`
- `Use $codex-webui-github-projects to add a new Runtime subtask under Phase 3 and set its fields correctly.`
- `Use $codex-webui-github-projects to audit the current Project against the roadmap docs and report drift.`
