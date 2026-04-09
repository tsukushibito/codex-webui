# Issue #107 Work Package

## Purpose

- Publish the formal v0.9 internal API specification under `docs/specs/` after the common v0.9 rules are fixed.

## Primary issue

- Issue: `#107 Phase 2B: Formalize the v0.9 internal API spec`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/draft/CodexWebUI_internal_api_v0_9_final_adjusted.md`
- `docs/draft/CodexWebUI_v0_9_差分指示.md`
- `.tmp/api-spec-formalization-handoff-2026-04-09.md`

## Scope for this package

- Create `docs/specs/codex_webui_internal_api_v0_9.md`.
- Formalize runtime-facing request-helper, feed/projection, recovery, and error semantics.
- Keep internal contract wording aligned with the published v0.9 common spec boundaries.
- Preserve the `App Server Contract Matrix v0.9` prerequisite without weakening it.
- Record any remaining constraints that the public API spec slice `#108` must inherit.

## Exit criteria

- `docs/specs/codex_webui_internal_api_v0_9.md` exists in the active branch.
- The internal spec is consistent with the published v0.9 common spec and requirements.
- The internal spec makes helper/projection/recovery/error semantics explicit enough for the public spec slice to build on.

## Work plan

- Compare the v0.8 internal API spec, the v0.9 requirements, the published v0.9 common spec, and the internal-spec draft to identify the semantic changes that must be formalized.
- Draft the formal v0.9 internal API spec in English under `docs/specs/`.
- Review the new internal spec against the handoff risks around request-helper lifetime, feed/timeline boundaries, recovery semantics, and error handling.
- Update package notes with validation status and any remaining follow-on risks before handing off or archiving.

## Artifacts / evidence

- `git -C /workspace/.worktrees/issue-107-internal-api-spec-v0-9 diff --no-index -- /dev/null docs/specs/codex_webui_internal_api_v0_9.md`
- `rg -n "App Server Contract Matrix v0.9|request-helper|pending_request|feed_entry|timeline_item|partial-failure|recovery|thread_open_required|thread_open_failed|request_not_found|thread_recovery_pending" /workspace/.worktrees/issue-107-internal-api-spec-v0-9/docs/specs/codex_webui_internal_api_v0_9.md`

## Status / handoff notes

- Status: `locally complete`
- Notes: Published `docs/specs/codex_webui_internal_api_v0_9.md` in the active worktree. The internal spec now preserves the `App Server Contract Matrix v0.9` prerequisite, fixes request-helper lifetime and absence semantics, keeps `feed_entry` and `timeline_item` as non-authoritative projection layers, and makes recovery and internal error responsibilities explicit for the public spec follow-on.
- Retrospective:
  Completion boundary: Package archive for child issue `#107`; issue close is not yet applicable until the branch reaches `main`.
  Contract check: Satisfied for this package boundary. The target internal spec file exists in English and is aligned with the published v0.9 common spec and requirements.
  What worked: Reusing the published common v0.9 spec as the immediate baseline kept the internal-contract boundaries consistent with `#106`.
  Workflow problems: The subagent runner was unreliable for this slice, so the spec had to be completed directly in the main rollout.
  Improvements to adopt: When a docs slice is blocked only by agent-execution instability, fall back quickly to direct document authoring instead of spending multiple retries on a no-op worker.
  Skill candidates or skill updates: Consider a small sprint-cycle note that docs-only slices can switch to direct execution after repeated no-op worker passes when the user explicitly requests no subagents.
  Follow-up updates: Archive this package, open and merge the PR for `#107`, then advance to `#108`.

## Archive conditions

- Archive this package after the internal spec slice is locally complete and the handoff notes are updated.
