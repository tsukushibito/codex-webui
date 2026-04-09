# Issue #106 Work Package

## Purpose

- Publish the formal v0.9 common specification under `docs/specs/` and lock the shared cross-spec rules that the internal and public API documents depend on.

## Primary issue

- Issue: `#106 Phase 2A: Formalize the v0.9 common spec`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/draft/codexwebui_common_api_spec_v0_9_draft_rev1.md`
- `docs/draft/CodexWebUI_v0_9_差分指示.md`
- `.tmp/api-spec-formalization-handoff-2026-04-09.md`

## Scope for this package

- Create `docs/specs/codex_webui_common_spec_v0_9.md`.
- Carry forward the v0.9 contract-matrix prerequisite wording without weakening it.
- Make request-helper absence/lifetime expectations explicit.
- Tighten non-source-of-truth boundaries for feed/timeline/composer helper projections.
- Record any remaining blockers that the follow-on internal/public spec slices must see.

## Exit criteria

- `docs/specs/codex_webui_common_spec_v0_9.md` exists in the active branch.
- The common spec is aligned with the published v0.9 requirements and the v0.9 draft corrections.
- The issue's shared dependency rules are clear enough for `#107` and `#108` to build on without reopening common semantics.

## Work plan

- Compare the v0.8 common spec, the v0.9 requirements, and the common-spec draft to identify carried-forward structure and changed semantics.
- Draft the formal v0.9 common spec in English under `docs/specs/`.
- Review the new common spec against the handoff risks around contract-matrix dependency, request-helper semantics, and non-source-of-truth projections.
- Update package notes with validation status and any follow-on risks before handing off or archiving.

## Artifacts / evidence

- `git -C /workspace/.worktrees/issue-106-common-spec-v0-9 diff --no-index -- /dev/null docs/specs/codex_webui_common_spec_v0_9.md`
- `rg -n "App Server Contract Matrix v0.9|just-resolved|request-helper|source of truth|timeline projection|Composer and derived availability helpers" /workspace/.worktrees/issue-106-common-spec-v0-9/docs/specs/codex_webui_common_spec_v0_9.md`
- Evaluator verdict: `approved`

## Status / handoff notes

- Status: `locally complete`
- Notes: Published `docs/specs/codex_webui_common_spec_v0_9.md` in the active worktree and re-ran evaluator review to approval. The common spec now fixes the `App Server Contract Matrix v0.9` prerequisite, shared request-helper lifetime/absence rules, and non-authoritative helper boundaries for feed/timeline/composer layers.
- Retrospective:
  Completion boundary: Package archive for child issue `#106`; issue close is not yet applicable because no PR has been opened or merged.
  Contract check: Satisfied for this package boundary. The target v0.9 common spec file exists, is in English, and captures the shared constraints that `#107` and `#108` depend on.
  What worked: Splitting Phase 2 into child issues before writing kept the docs slice bounded and made the worktree/package naming straightforward.
  Workflow problems: Untracked `docs/draft/` inputs do not appear in new worktrees, so the draft source set had to be read from the parent checkout explicitly.
  Improvements to adopt: Treat parent-checkout-only draft inputs as an expected read path when a docs slice starts from untracked source material.
  Skill candidates or skill updates: Consider a small update to the work-packages or docs workflow guidance noting that untracked draft inputs will not be present in new worktrees.
  Follow-up updates: Archive this package, open the branch/PR flow for `#106`, and keep `#107` and `#108` as the remaining Phase 2 slices.

## Archive conditions

- Archive this package after the common spec slice is locally complete and the handoff notes are updated.
