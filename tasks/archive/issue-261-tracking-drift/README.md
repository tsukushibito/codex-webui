# Issue 261 tracking drift

## Purpose

Reconcile execution tracking drift before the wider refactor backlog starts, so Project, Issue, task, worktree, and parent-checkout state can be trusted by the orchestrator.

## Primary issue

- https://github.com/tsukushibito/codex-webui/issues/261

## Source docs

- `README.md`
- `AGENTS.md`
- `tasks/README.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `artifacts/execution_orchestrator/README.md`

## Scope for this package

- Audit the stale `.worktrees/fix-runtime-workspace-routes-synthetic-bridge` worktree and branch before deciding whether it can be removed.
- Audit untracked `artifacts/visual-inspection/workspace01-thread-latest-2026-04-26*` directories and decide whether to retain, ignore, move, or remove them.
- Normalize Issue #261 execution metadata for this active package.
- Keep the parent checkout as the control checkout and perform implementation from `.worktrees/issue-261-tracking-drift`.

## Exit criteria

- Parent checkout, `git worktree list`, active task package state, and Issue #261 execution metadata agree.
- Any stale worktree or generated artifact cleanup is backed by verification evidence.
- No unrelated user changes are removed.
- Local validation appropriate for tracking/doc/infra changes has passed.

## Work plan

1. Inspect stale worktree branch ancestry, remote branch state, and related GitHub tracking.
2. Inspect visual-inspection artifact contents and decide retention policy.
3. Apply the smallest repo-local cleanup needed to make future orchestration unambiguous.
4. Run focused validation and record evidence.
5. Move toward pre-push validation, archive, PR, merge, and final Issue closure through the normal workflow.

## Artifacts / evidence

- Orchestration run log: `artifacts/execution_orchestrator/runs/2026-04-26T11-41-45Z-refactor-orchestration/events.ndjson`
- Stale worktree audit:
  - `.worktrees/fix-runtime-workspace-routes-synthetic-bridge` was clean.
  - No open or closed PR was found for head branch `fix/runtime-workspace-routes-synthetic-bridge`.
  - The local worktree was removed; the remote branch was left untouched.
- Visual artifact audit:
  - Parent checkout had untracked `artifacts/visual-inspection/workspace01-thread-latest-2026-04-26*/` directories.
  - These were ad hoc live workspace/thread probes, not issue-owned evidence.
  - `.gitignore` now ignores `artifacts/visual-inspection/workspace*-thread-latest-*/`; issue-owned visual evidence should use stable issue/run directories.
- Validation:
  - `git check-ignore -v artifacts/visual-inspection/workspace01-thread-latest-2026-04-26/ artifacts/visual-inspection/workspace01-thread-latest-2026-04-26-wait8s/`
  - `git worktree list`
  - `git status --short --branch` in parent checkout and active worktree

## Status / handoff notes

- 2026-04-26: Package created. Active branch is `issue-261-tracking-drift`; active worktree is `.worktrees/issue-261-tracking-drift`.
- 2026-04-26: Removed the stale local `fix-runtime-workspace-routes-synthetic-bridge` worktree after confirming it was clean and had no PR. Added a repo ignore rule for ad hoc live workspace/thread visual-inspection captures.
- 2026-04-26: Focused validation passed. Parent checkout will continue to show the existing ad hoc artifact directories as untracked until this branch's `.gitignore` change reaches `main`.
- 2026-04-26 retrospective:
  - Completion boundary: package archive for #261.
  - Contract check: local worktree drift was reconciled; visual-inspection drift has a repo ignore rule ready for `main`; no user work was deleted.
  - What worked: auditing branch/PR/worktree state before removal kept the cleanup bounded.
  - Workflow problems: the initial Issue creation script expanded Markdown backticks; issue bodies were corrected and the orchestration log records the anomaly.
  - Improvements to adopt: use quoted heredocs or body files for GitHub Issue text containing Markdown inline code.
  - Skill candidates or updates: none for this package; the existing orchestration anomaly log captured the reusable lesson.
  - Follow-up updates: final GitHub completion must wait for PR merge, parent sync, and worktree cleanup.

## Archive conditions

- This package can be archived only after the local slice is complete, dedicated pre-push validation has passed, and handoff notes include the final evidence.
