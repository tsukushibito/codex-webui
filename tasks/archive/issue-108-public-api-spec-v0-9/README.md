# Issue #108 Work Package

## Purpose

- Publish the formal v0.9 public API specification under `docs/specs/` after the common and internal v0.9 semantics are fixed.

## Primary issue

- Issue: `#108 Phase 2C: Formalize the v0.9 public API spec`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/draft/CodexWebUI_public_api_v0_9_revised_final.md`
- `docs/draft/CodexWebUI_v0_9_差分指示.md`
- `.tmp/api-spec-formalization-handoff-2026-04-09.md`

## Scope for this package

- Create `docs/specs/codex_webui_public_api_v0_9.md`.
- Formalize browser-facing endpoint, helper-field, and degrade behavior semantics.
- Lock `resume_candidates` priority and related user-facing recovery semantics.
- Keep public mapping and non-authoritative helper wording aligned with the published common and internal v0.9 specs.
- Avoid touching `docs/README.md` in this slice because the parent checkout currently has user-owned local edits there.

## Exit criteria

- `docs/specs/codex_webui_public_api_v0_9.md` exists in the active branch.
- The public spec is consistent with the published v0.9 common and internal specs and the v0.9 requirements.
- The public spec is explicit enough that the remaining Phase 2 parent issue can close without unresolved public-API contradictions.

## Work plan

- Compare the v0.8 public API spec, the v0.9 requirements, the published common/internal v0.9 specs, and the public-spec draft to identify the browser-visible semantic changes that must be formalized.
- Draft the formal v0.9 public API spec in English under `docs/specs/`.
- Review the new public spec against the handoff risks around `resume_candidates`, helper non-authoritativeness, degrade behavior, and internal-to-public mapping boundaries.
- Update package notes with validation status and any remaining parent-issue follow-up risks before handing off or archiving.

## Artifacts / evidence

- `git -C /workspace/.worktrees/issue-108-public-api-spec-v0-9 diff --no-index -- /dev/null docs/specs/codex_webui_public_api_v0_9.md`
- `rg -n "resume_candidates|accepting_user_input|degrade|request_not_found|thread_open_required|timeline_item|helper|non-authoritative" /workspace/.worktrees/issue-108-public-api-spec-v0-9/docs/specs/codex_webui_public_api_v0_9.md`

## Status / handoff notes

- Status: `locally complete`
- Notes: Published `docs/specs/codex_webui_public_api_v0_9.md` in the active worktree. The public spec now fixes `resume_candidates` priority, keeps `thread_view`, `timeline`, and `composer` as non-authoritative browser helpers, preserves `200 OK` plus `pending_request: null` for absence, and absorbs internal `open` helper behavior so public clients do not see `thread_open_required`.
- Retrospective:
  Completion boundary: Package archive for child issue `#108`; parent issue `#105` may still require a later `docs/README.md` sync once the user-owned parent-checkout edits there are reconciled.
  Contract check: Satisfied for this package boundary. The target public spec file exists in English and is aligned with the published v0.9 requirements plus the published common and internal specs.
  What worked: Reusing the completed internal/common specs made the public helper and error-layer wording much easier to lock without reopening lower-layer semantics.
  Workflow problems: The roadmap Project did not immediately show issue `#108` as an item through the current `gh project item-add` flow, so execution tracking may need a later repo-specific follow-up outside this package boundary.
  Improvements to adopt: Keep parent-checkout user edits visible when deciding whether a child docs slice should avoid touching a shared maintained file such as `docs/README.md`.
  Skill candidates or skill updates: Consider a small GitHub Projects note covering silent `gh project item-add` no-op cases so project drift can be detected faster.
  Follow-up updates: Archive this package, open and merge the PR for `#108`, then decide whether parent issue `#105` can close or should stay open only for maintained `docs/README.md` synchronization.

## Archive conditions

- Archive this package after the public spec slice is locally complete and the handoff notes are updated.
