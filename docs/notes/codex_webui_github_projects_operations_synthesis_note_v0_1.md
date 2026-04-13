# GitHub issue and Project operations synthesis note v0.1

Last updated: 2026-04-13

## Purpose

Capture the repeated failure modes and working patterns for GitHub Issue and Project operations in this repository so later sessions do not have to rediscover the same `gh` and API pitfalls.

This note is operational guidance for execution tracking. It is not the source of truth for requirements, specifications, or validation behavior.

## Scope

- `gh issue`, `gh project`, and `gh api` usage for this repository
- sub-issue creation and verification
- Project item creation, field updates, and verification
- observed failure patterns that caused avoidable retries during roadmap maintenance

## Why retries happen so often

The main problem is not one single permission bug. The GitHub workflow is split across three different surfaces with different gaps and behavior:

- high-level `gh` commands such as `gh issue` and `gh project`
- raw REST and GraphQL calls through `gh api`
- built-in GitHub Issue and Project features whose state is only partially visible in CLI output

That split creates a few recurring traps.

### 1. The high-level `gh` command surface is incomplete

In this environment, `gh issue` does not provide a dedicated sub-issue command. Formal sub-issue operations must be done through the API layer instead of the issue command group.

Observed with:

- `gh version 2.45.0`
- `gh help issue`, which lists no sub-issue command

Practical result:

- do not assume `gh issue` covers the full Issue feature set
- use `gh api` for sub-issue operations

### 2. REST and GraphQL do not behave the same way for the same feature

During the `ngrok` migration tracking setup, GraphQL `addSubIssue` failed while the REST sub-issues endpoint succeeded for the same account and repository.

Practical result:

- do not assume that a feature working in the GitHub UI implies the GraphQL mutation will work in this environment
- if a GraphQL mutation fails, try the corresponding REST endpoint before concluding the operation is blocked

### 3. `gh api` payload typing is easy to get wrong

`gh api -f` sends string parameters. That breaks endpoints that require numeric JSON fields such as `sub_issue_id`.

Observed failure:

- `Invalid property /sub_issue_id: "\"4247560021\"" is not of type integer`

Practical result:

- use `-F` when the endpoint expects typed scalars
- or send the body with `--input` and explicit JSON when you need full control

### 4. Some GitHub mutations are not safe to run in parallel

Adding several sub-issues to the same parent at once caused:

- `Priority has already been taken`

This came from concurrent writes to the same parent issue's sub-issue ordering state.

Practical result:

- perform sub-issue add and reprioritize operations serially
- do not parallelize writes to the same parent issue

### 5. `gh project item-list` is partial by default

`gh project item-list` returns only 30 items unless `--limit` is set. On a Project with more than 30 items, a valid item can appear to be missing when it is simply outside the default page size.

Practical result:

- always pass `--limit 100` for this repository's Project audits unless you intentionally want a smaller sample
- do not trust a missing item result from the default call on a large Project

### 6. Project CLI output does not expose every useful built-in field cleanly

In this environment, the Project has built-in fields such as `Parent issue` and `Sub-issues progress`, but they were not surfaced in the `gh project item-list --format json` output used during this migration check.

Practical result:

- do not rely only on `gh project item-list` to verify parent-child linkage
- verify issue hierarchy directly through Issue APIs when parent-child correctness matters

### 7. Plain `gh issue view` can fail on a classic-Projects compatibility path

In this environment, plain `gh issue view <number>` can fail even when the repository is using ProjectV2 successfully, because the default Issue view path tries to resolve the deprecated GraphQL field `repository.issue.projectCards`.

Observed failure:

- `GraphQL: Projects (classic) is being deprecated in favor of the new Projects experience ... (repository.issue.projectCards)`

Practical result:

- do not treat this error as evidence that the current Project is a classic Project
- prefer `gh issue view <number> --json ...` when the needed fields are available there
- fall back to `gh api` REST or GraphQL when the default Issue view hits the deprecated compatibility path

## Working rules

### Rule 1. Discover the feature surface before choosing the command

Before using a GitHub feature that is not part of the common `issue create/edit/view` or `project item-edit` path, check:

- `gh help <area>`
- `gh <area> <subcommand> --help`
- whether the operation is actually exposed only through `gh api`

### Rule 2. Prefer REST for sub-issue operations in this repository

Use REST for these checks and mutations:

```bash
gh api repos/tsukushibito/codex-webui/issues/<parent>/sub_issues
gh api repos/tsukushibito/codex-webui/issues/<child>/parent
printf '{"sub_issue_id":4247560021}' | \
  gh api -X POST repos/tsukushibito/codex-webui/issues/151/sub_issues --input -
```

Use the REST issue `id`, not the GraphQL node id, for `sub_issue_id`.

### Rule 3. Use typed fields or explicit JSON for API writes

Safe patterns:

```bash
gh api -X POST repos/{owner}/{repo}/issues/{issue_number}/sub_issues -F sub_issue_id=4247560021
```

```bash
printf '{"sub_issue_id":4247560021}' | \
  gh api -X POST repos/{owner}/{repo}/issues/{issue_number}/sub_issues --input -
```

Avoid:

```bash
gh api -X POST repos/{owner}/{repo}/issues/{issue_number}/sub_issues -f sub_issue_id=4247560021
```

because `-f` sends a string.

### Rule 4. Serialize mutations that touch the same parent issue

Safe order for sub-issues:

1. add one child
2. wait for success
3. verify parent-child linkage if needed
4. add the next child

Do not batch parallel `add-sub-issue` calls against one parent.

### Rule 5. Verify Project presence separately from hierarchy correctness

These are different questions and should be checked separately.

Project presence:

```bash
gh project item-list 9 --owner tsukushibito --limit 100 --format json
```

Issue hierarchy correctness:

```bash
gh api repos/tsukushibito/codex-webui/issues/151/sub_issues
gh api repos/tsukushibito/codex-webui/issues/152/parent
```

Project item identity when field edits are needed:

```bash
gh api graphql -f query='
query {
  repository(owner:"tsukushibito", name:"codex-webui") {
    issue(number:151) {
      projectItems(first:20) { nodes { id } }
    }
  }
}'
```

### Rule 6. Treat default limits and output shape as suspect until verified

When the response looks inconsistent:

- check command help for defaults such as `--limit`
- confirm whether the command is returning a truncated list
- confirm whether the output format omits built-in fields you expected

### Rule 7. Keep Issue inspection separate from classic-Projects compatibility failures

Safe patterns:

```bash
gh issue view 151 --repo tsukushibito/codex-webui --json number,title,state,body,url
```

```bash
gh api graphql -f query='
query($owner:String!, $repo:String!, $number:Int!) {
  repository(owner:$owner, name:$repo) {
    issue(number:$number) {
      number
      title
      state
      url
      body
    }
  }
}' -F owner=tsukushibito -F repo=codex-webui -F number=151
```

Avoid using plain `gh issue view <number>` as the first inspection step when a structured read will do, because the default presentation path may still touch deprecated classic-Projects fields.

## Recommended workflow for future Issue and Project updates

1. Inspect the available `gh` command surface first.
2. If the feature is missing from high-level commands, decide whether REST or GraphQL is the better fit.
3. For Issue hierarchy, prefer REST sub-issue endpoints.
4. For Project item field edits, use `gh project item-edit` after resolving the Project item id.
5. For verification, separate:
   - issue hierarchy
   - project membership
   - project field values
6. When mutating one shared parent or one shared Project item set, avoid parallel writes.

## Failure signatures to recognize quickly

- `FORBIDDEN` on GraphQL mutation:
  try the REST endpoint before assuming permissions are insufficient
- `is not of type integer`:
  you probably used `-f` instead of `-F` or `--input`
- `Priority has already been taken` during sub-issue add:
  concurrent writes collided; retry serially
- expected Project item not found:
  rerun `gh project item-list` with `--limit 100`
- plain `gh issue view` fails with `repository.issue.projectCards`:
  rerun with `--json` or switch to `gh api`

## Current baseline for this repository

Observed working baseline on 2026-04-13:

- `gh version 2.45.0`
- `gh issue` has no dedicated sub-issue command
- plain `gh issue view` can fail on the deprecated `repository.issue.projectCards` path; `--json` reads work
- REST sub-issue endpoints work for `tsukushibito/codex-webui`
- Project `#9` requires explicit `--limit` during audits because the item count exceeds the default page size
