# Issue 176 UX Renewal Docs

## Purpose

- Retire the active-doc dependency on old Home-first roadmap language and promote the stable UX renewal decisions into maintained `docs/` source-of-truth files.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/176

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `.tmp/CodexWebUI_UX重視_作業計画書_v0_1.md`

## Scope for this package

- Update maintained docs so the old Phase 4B Home / Chat / Approval roadmap language is no longer authoritative for active execution.
- Add or update maintained UX renewal source-of-truth content under `docs/`.
- Clarify that any `home` API/helper is non-primary aggregate support rather than the browser's primary Home screen contract.
- Update `docs/index.md` and `docs/log.md` when maintained wiki navigation changes.

## Exit criteria

- No active execution doc treats the old Home-first roadmap as authoritative for the current UX renewal.
- The UX renewal source of truth is discoverable under `docs/`.
- `.tmp` drafts are referenced only as working inputs, not normative files.
- Relevant docs validation passes for the changed files.

## Work plan

- Review the roadmap, requirements, public/internal/common specs, and existing UI layout spec for Home-first or page-split language.
- Promote the stable UX renewal decisions from the `.tmp` working plan into maintained docs.
- Update wiki navigation and log entries for any new or materially changed maintained page.
- Run focused documentation checks and record evidence.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-23T00-00-00Z-issue-176-close/events.ndjson`
- Sprint validation:
  - `git diff --check`
  - `rg -n "Home / Chat / Approval|Rework Home|dedicated Home|Home-first|\\.tmp/CodexWebUI_UX重視_作業計画書_v0_1.md" docs`
  - manual review of remaining hits as legacy/current-state/helper-input/non-primary context
- Pre-push validation:
  - `git status --short --branch`
  - `git diff --name-only`
  - `git diff --check`
  - focused `rg` scans for Home/Home-first and helper aggregate/thread-view language
- Evaluator verdict: `approved`
- Pre-push gate: `passed`

## Status / handoff notes

- Status: `locally complete; archived pending PR/merge follow-through`
- Active branch: `issue-176-ux-renewal-docs`
- Active worktree: `.worktrees/issue-176-ux-renewal-docs`
- Notes:
  - Updated maintained docs so roadmap UX wording is sequencing guidance and the v0.9 UI layout spec plus v0.9 requirements/specs govern the current thread-first UX model.
  - Retired Home as an active primary Phase 4B UI target by moving former Home responsibilities into navigation, workspace switching, thread lists, resume cues, and empty states.
  - Clarified that `home_overview` and `GET /api/v1/home` are helper aggregates for app-shell initialization, not canonical UI screen contracts.
  - Updated `docs/index.md` and `docs/log.md`; `.tmp/CodexWebUI_UX重視_作業計画書_v0_1.md` is referenced only as a working input.
  - Completion retrospective:
    - Completion boundary: package archive, not Issue close.
    - Contract check: package exit criteria satisfied by docs changes, evaluator approval, and pre-push validation; Issue close remains blocked until the branch is pushed, PR is merged to `main`, parent checkout is synced, and worktree cleanup is complete.
    - What worked: planner/worker/evaluator split kept this docs-only slice narrow; validator evidence matched the package scope.
    - Workflow problems: initial planner spawn with `fork_context` was rejected by tool constraints and logged as a recoverable anomaly.
    - Improvements to adopt: keep future orchestrator sub-agent spawns compatible with the current tool constraint by avoiding explicit `agent_type` with full-history fork.
    - Skill candidates or skill updates: none required from this one-off spawn-framing issue.
    - Follow-up updates: PR/merge/completion tracking must be handled through the GitHub Projects workflow after archive.

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate has passed, completion retrospective has run, and handoff notes are updated.
