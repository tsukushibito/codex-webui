# Issue #105 Work Package

## Purpose

- Finish the remaining Phase 2 parent-issue work by synchronizing `docs/README.md` with the published v0.9 specification set.

## Primary issue

- Issue: `#105 Phase 2: Formalize the v0.9 specification set`

## Source docs

- `docs/README.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `.tmp/api-spec-formalization-handoff-2026-04-09.md`

## Scope for this package

- Update `docs/README.md` so `Current Structure` lists the published v0.9 common, internal API, and public API specifications.
- Keep the diff limited to the maintained README sync needed to satisfy `#105` completion conditions.
- Preserve the already-merged user-owned `llm wiki adoption note` entry while adding the missing v0.9 spec entries.

## Exit criteria

- `docs/README.md` lists the published v0.9 common, internal API, and public API specification files.
- The parent issue `#105` has no remaining unmet completion condition caused by the docs index.
- The README sync is merged to `main` through the normal branch and PR flow.

## Work plan

- Re-read `docs/README.md` against the published v0.9 spec files to confirm the missing entries.
- Add only the missing v0.9 spec paths in `Current Structure`.
- Validate the diff scope, archive the package, and close `#105` after the branch reaches `main`.

## Artifacts / evidence

- `git -C /workspace/.worktrees/issue-105-docs-readme-v0-9-sync diff -- docs/README.md`
- `rg -n "codex_webui_(common|internal_api|public_api)_v0_9\\.md" /workspace/.worktrees/issue-105-docs-readme-v0-9-sync/docs/README.md`

## Status / handoff notes

- Status: `locally complete`
- Notes: Updated `docs/README.md` so `Current Structure` now lists the published v0.9 common, internal API, and public API specs while preserving the already-merged `llm wiki adoption note` entry.
- Retrospective:
  Completion boundary: Package archive for parent issue `#105`; issue close still waits for this README sync branch to reach `main`.
  Contract check: Satisfied for this package boundary. The remaining parent completion condition is now captured in the README diff and no longer depends on unpublished spec files.
  What worked: Splitting the unrelated `llm wiki adoption note` into its own PR removed the only mixed-change blocker on the final `#105` README sync.
  Workflow problems: Parent-level cleanup work can easily get blocked by unrelated local docs edits when a maintained index file is shared by multiple efforts.
  Improvements to adopt: When a parent issue is blocked only by a maintained index file, separate unrelated local docs edits first so the final closing slice stays reviewable.
  Skill candidates or skill updates: Consider a small work-packages or closeout note recommending an explicit "shared index cleanup" slice when parent Issues depend on README synchronization after child PRs merge.
  Follow-up updates: Archive this package, open and merge the final README sync PR, then close `#105`.

## Archive conditions

- Archive this package after the README sync is locally complete and the handoff notes are updated.
