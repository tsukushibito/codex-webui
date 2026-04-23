# Issue 180 Contract Audit

## Purpose

- Audit the maintained v0.9 runtime/BFF contracts that the UX renewal depends on before UI implementation starts.
- Capture missing or ambiguous contract fields as maintained spec updates or follow-up issues instead of letting UI work rely on assumptions.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/180

## Source docs

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`

## Scope for this package

- Audit `thread_list_item` and thread summary fields for Navigation sections, attention cues, blocked cues, and resume cues.
- Audit `thread_view` helper shape for snapshot, current activity, pending request summary, timeline slice, and open-required handling.
- Audit `pending_request_summary` and `request_detail_view` for the minimum approval confirmation information required by the renewed UI.
- Audit feed, timeline, stream ordering, `(thread_id, sequence)` dedupe, sequence gap handling, and REST reacquisition responsibilities.
- Audit first-input idempotency through `client_request_id`.
- Update maintained docs when the intended contract can be clarified directly; create follow-up tracking when implementation or product decisions remain outside this audit slice.

## Exit criteria

- The audit findings are captured in maintained docs, a maintained validation note, or linked follow-up issues.
- UI implementation issues can rely on documented v0.9 public/internal contracts for the covered surfaces.
- The audit does not reintroduce a standalone canonical approval resource.
- Focused validation confirms the changed docs are internally consistent enough for follow-on UI work.

## Work plan

- Compare the Issue #180 audit questions against v0.9 public, internal, common, UI layout, and requirements docs.
- Inspect runtime and BFF implementation surfaces only to identify drift between maintained contracts and current code.
- Patch the source-of-truth docs where the intended contract is clear.
- Create or identify follow-up issues for missing implementation work that should not be fixed in this contract-audit package.
- Run targeted docs/search validation and any lightweight tests needed to verify consistency.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-23T03-05-14Z-issue-180-close/events.ndjson`
- Planned evidence: command outputs and final validation summary in this package's status notes or `artifacts/` if the evidence becomes too large for a concise note.
- Validation 2026-04-23:
  - `git diff -- docs/specs/codex_webui_public_api_v0_9.md docs/specs/codex_webui_internal_api_v0_9.md docs/specs/codex_webui_common_spec_v0_9.md docs/requirements/codex_webui_mvp_requirements_v0_9.md docs/specs/codex_webui_ui_layout_spec_v0_9.md docs/specs/codex_webui_app_server_contract_matrix_v0_9.md docs/log.md tasks/issue-180-contract-audit/README.md`
  - `rg -n "thread_list_item|thread_summary|thread_view|thread_view_helper|pending_request_summary|pending_request|latest_resolved_request|request_detail_view|request_detail|client_request_id|thread_open_required|sequence|reacquisition|canonical approval|standalone canonical|global approval inbox" docs/requirements/codex_webui_mvp_requirements_v0_9.md docs/specs/codex_webui_common_spec_v0_9.md docs/specs/codex_webui_public_api_v0_9.md docs/specs/codex_webui_internal_api_v0_9.md docs/specs/codex_webui_ui_layout_spec_v0_9.md docs/specs/codex_webui_app_server_contract_matrix_v0_9.md tasks/issue-180-contract-audit/README.md`
  - `rg -n "GET /api/v1/approvals|/approvals/stream|ApprovalSummary|ApprovalDetail|canonical approval resource|standalone approval resource|independent approval resource" docs/requirements/codex_webui_mvp_requirements_v0_9.md docs/specs/codex_webui_common_spec_v0_9.md docs/specs/codex_webui_public_api_v0_9.md docs/specs/codex_webui_internal_api_v0_9.md docs/specs/codex_webui_ui_layout_spec_v0_9.md`
  - Result: tracked diff shows only approved maintained docs changed; the task package was already untracked in this worktree, and direct readback confirmed this README carries the validation and handoff notes. Contract search confirms the requested v0.9 surfaces are now explicit; approval-resource search found no approval endpoints or approval summary/detail schemas, only prohibitive text rejecting canonical or independent approval resources.

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-180-contract-audit`
- Active worktree: `.worktrees/issue-180-contract-audit`
- Notes: package opened for the Issue #180 contract audit. No PR has been opened yet.
- Sprint update 2026-04-23: tightened maintained v0.9 contracts in public/internal/common API specs for Navigation cue material, `thread_view` / `thread_view_helper` helper shape, request-helper identity and minimum confirmation fields, pending-request absence versus missing request detail, `thread_id + sequence` ordering and REST reacquisition triggers, first-input idempotency, and public absorption of internal `thread_open_required`.
- Follow-up drift discovered: none from implementation surfaces; this sprint was limited to maintained documentation audit and did not inspect or change app implementation. Later UI/BFF/runtime implementation issues should verify their code against the documented contracts above.
- Pre-push validation 2026-04-23: passed through the dedicated validator gate. Commands covered status, required diff, contract-term search, approval-resource regression search, and `git diff --check`.
- Completion retrospective 2026-04-23:
  - Completion boundary: package archive, not Issue close.
  - Contract check: package exit criteria are satisfied by maintained spec updates, docs log entry, sprint evaluator approval, and passed pre-push validation.
  - What worked: the orchestrator kept package setup, sprint approval, and pre-push validation as separate gates.
  - Workflow problems: the active task package remained untracked until archive time, so plain `git diff` did not show the package README; validator readback covered it, but future workers should mention untracked task-package files explicitly in evidence.
  - Improvements to adopt: keep docs-only contract audits scoped to maintained specs and record implementation conformance as follow-on validation unless the issue explicitly requires code changes.
  - Skill candidates or skill updates: none.
  - Follow-up updates: publish branch/PR, merge to `main`, sync parent checkout, remove active worktree, then close Issue #180 and set Project status to `Done`.

## Archive conditions

- Archive this package after the audit slice is locally complete, the dedicated pre-push validation gate passes, and the status notes are updated.
- Do not close Issue #180 or set Project status to `Done` until the work is reachable on `main`, the parent checkout is synced, and the active worktree is cleaned up.
