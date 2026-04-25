# Issue #198 UX Source Boundaries

## Purpose

- Fix the maintained source-of-truth boundaries that the UX refresh depends on before BFF and UI implementation proceeds.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/198

## Source docs

- `.tmp/codex_webui_v0_9_ux_improvement_plan.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`
- `docs/README.md`
- `docs/index.md`
- `docs/log.md`

## Scope for this package

- Decide and document public exposure for thread titles used by Navigation and the thread header.
- Fix canonical `Recommended` sort ownership, ranking boundaries, and tie-break expectations without inventing UI-only semantics.
- Clarify the P0 request-detail minimum confirmation boundary versus later richer file or diff detail.
- Clarify pending and just-resolved request detail reachability during the supported recovery window.
- Update maintained docs and wiki navigation/log entries only where the source-of-truth changes materially.

## Exit criteria

- Maintained docs explicitly cover the title, sort, request-detail, and recovery boundaries listed in Issue #198.
- The reviewed UX plan can point to maintained docs rather than draft assumptions for these boundaries.
- No implementation file changes are included unless a docs validation command requires a tiny supporting adjustment.
- Targeted docs validation passes.

## Work plan

- Inspect the current public, internal, UI layout, and app-server contract specs for the four boundary topics.
- Patch the source-of-truth docs with the smallest coherent contract changes.
- Update `docs/index.md` and `docs/log.md` if maintained wiki discoverability or content materially changes.
- Run targeted validation for the touched Markdown files.
- Record evidence and handoff notes here before pre-push validation.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-25T05-41-06Z-issues-198-205/events.ndjson`
- Validation evidence:
  - `git diff --check -- docs/specs/codex_webui_public_api_v0_9.md docs/specs/codex_webui_internal_api_v0_9.md docs/specs/codex_webui_ui_layout_spec_v0_9.md docs/specs/codex_webui_app_server_contract_matrix_v0_9.md docs/index.md docs/log.md tasks/issue-198-ux-source-boundaries/README.md`
  - `git diff --name-only`
  - `test -z "$(git diff --name-only -- apps)"`
  - `rg -n "title|Recommended|minimum confirmation|request_detail|latest_resolved_request|recovery window|request_not_found" docs/specs/codex_webui_public_api_v0_9.md docs/specs/codex_webui_internal_api_v0_9.md docs/specs/codex_webui_ui_layout_spec_v0_9.md docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`

## Status / handoff notes

- Status: `locally complete; pre-push validation passed; ready for package archive`
- Active branch: `issue-198-ux-source-boundaries`
- Active worktree: `.worktrees/issue-198-ux-source-boundaries`
- Notes: Narrow docs-only sprint implemented in maintained v0.9 specs. Public docs now expose `title` on thread shapes, define workspace-scoped `Recommended` ordering, and clarify P0 request-detail versus later richer detail. Internal and layout docs align request-detail recovery reachability and ownership boundaries. No app files changed.
- Pre-push validation: passed. Validator reported no blocking failures for scoped diff check, changed-file evidence, untracked package README evidence, no-apps-diff check, and boundary-term spec checks.
- Completion retrospective: package archive boundary only. Contract evidence is sufficient for local package completion, but Issue #198 must remain open and Project `In Progress` until the branch is pushed, PR is merged to `main`, parent checkout is synced, and the active worktree is removed. No durable repo-skill update is needed from this slice.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
