---
name: codex-webui-github-projects
description: Manage GitHub Projects for this `codex-webui` repository using the repo's documented ownership boundaries. Use when creating or updating the repo's GitHub Project, adding or refining roadmap issues, setting project fields, keeping Project items aligned with `docs/codex_webui_mvp_roadmap_v0_1.md`, or maintaining issue/PR workflow with `gh` and GitHub GraphQL.
---

# Codex WebUI GitHub Projects

## Overview

Use GitHub Projects as the execution layer for this repository, not as the source of truth. Keep maintained requirements, specifications, and roadmap decisions in `docs/`; keep active work packages in `tasks/`; keep evidence in `artifacts/`.

This skill owns GitHub-side execution tracking. If the user needs to create, update, or archive a local task package under `tasks/`, use `codex-webui-work-packages` for that part and keep this skill focused on Issues, Project items, fields, and workflow state.

## Build Context

Read these files before changing the Project shape or roadmap items:

- `README.md`
- `docs/README.md`
- `tasks/README.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`

If editing issues tied to a specific area, read the nearest relevant README in that area first.

## Operating Rules

- Treat `docs/` as the source of truth for scope, decisions, and completion criteria.
- Use GitHub Projects to track execution state, ownership, sequencing, and review flow.
- Default repo-tracked change flow is a short-lived branch and PR; direct commits to `main` are exceptions only.
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

Keep items with open PRs, unmerged execution branches, or unpushed direct-to-`main` exceptions in `In Progress`; do not use `Done` until the work is reachable on `main`.

## Standard Work Breakdown

Start from roadmap phases, then split only as needed.

- Create parent issues for major phases or deliverables.
- Split Phase 4 into separate `BFF` and `UI` issues when that makes ownership or reporting clearer.
- Keep issue bodies short and link back to the relevant roadmap section.
- Use sub-issues or dependencies for execution breakdown if the repo needs finer tracking.
- Link PRs to the relevant issue instead of tracking implementation only at the Project item level.

## Command Workflow

Prefer `gh` first. Use GraphQL only when `gh project` cannot express the needed operation.

### Inspect current state

Use:

```bash
gh project list --owner tsukushibito
gh project view <number> --owner tsukushibito
gh project field-list <number> --owner tsukushibito --format json
gh project item-list <number> --owner tsukushibito --format json
gh issue list --state open --limit 100
gh pr list --state open --limit 100
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
2. Check the Issue `Execution` section for the active branch and active PR when they exist.
3. Keep only a short `Execution` section and branch/PR/package links in the Issue.
4. Let `codex-webui-work-packages` handle package creation, README updates, and archive moves.
5. Before closing an Issue or setting Project `Status` to `Done`, verify the work is reachable on `main`: merged PR to `main` for the default workflow, or pushed commits on `origin/main` for an approved direct-to-`main` exception.
6. If the PR remains open, the branch is not yet on `main`, or the local repo state is dirty, keep the Issue and Project in execution rather than `Done`.

## Guardrails

- Do not hardcode Project IDs, field IDs, or item IDs in the skill; discover them each run.
- Do not silently replace field semantics in an existing Project.
- Do not duplicate detailed acceptance criteria from `docs/` into many issue bodies unless the user asks for that granularity.
- Do not move completed evidence into `tasks/`; keep `tasks/` for active work only.
- Do not mark an Issue or Project item as complete while a PR remains open, the execution branch is not yet on `main`, an approved direct-to-`main` exception is unpushed, or the local repo state is dirty.
- Do not delete old Projects, issues, or items without an explicit user instruction.

## Example Requests

- `Use $codex-webui-github-projects to create the roadmap Project from docs/codex_webui_mvp_roadmap_v0_1.md.`
- `Use $codex-webui-github-projects to add a new Runtime subtask under Phase 3 and set its fields correctly.`
- `Use $codex-webui-github-projects to audit the current Project against the roadmap docs and report drift.`
