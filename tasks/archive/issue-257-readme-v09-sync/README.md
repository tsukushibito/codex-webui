# Issue 257 README v0.9 sync

## Purpose

Update stale root and app README scope text so contributors start from the maintained v0.9 thread/request direction instead of the older session/approval implementation framing.

## Primary issue

- https://github.com/tsukushibito/codex-webui/issues/257

## Source docs

- `README.md`
- `apps/codex-runtime/README.md`
- `apps/frontend-bff/README.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`

## Scope for this package

- Replace stale session/approval-centered scope wording in README files with v0.9 thread/request wording.
- Keep setup, commands, validation order, and app-local operational instructions intact.
- Avoid duplicating long v0.9 specs in README files.

## Exit criteria

- Root README points contributors to current v0.9 source-of-truth docs.
- `apps/codex-runtime/README.md` describes current runtime responsibilities around thread/request/timeline helpers.
- `apps/frontend-bff/README.md` describes current BFF/UI responsibilities around public v0.9 routes, shaping, and streams.
- Markdown/diff validation passes.

## Work plan

1. Update root README current implementation and source-of-truth links.
2. Update runtime README scope text without changing command sections.
3. Update frontend-bff README scope text without changing command sections.
4. Run focused markdown/diff checks.
5. Archive this package after local completion evidence is recorded.

## Artifacts / evidence

- Validation:
  - `rg -n "v0_8|session/message/event/approval|workspace and session state|Scope in this slice|first public API BFF slice|first implementation slice" README.md apps/codex-runtime/README.md apps/frontend-bff/README.md` returned no matches.
  - `git diff --check` passed.
- `docs/index.md` and `docs/log.md` were not updated because this slice changed root/app operational README orientation, not maintained `docs/` wiki content or navigation.

## Status / handoff notes

- 2026-04-26: Package created. Active branch is `issue-257-readme-v09-sync`; active worktree is `.worktrees/issue-257-readme-v09-sync`.
- 2026-04-26: Updated root, runtime, and frontend-bff README scope text to point at v0.9 thread/request/timeline contracts while preserving command sections.
- 2026-04-26 retrospective:
  - Completion boundary: package archive for #257.
  - Contract check: stale README terminology removed; command/validation sections were left intact.
  - What worked: limiting the patch to scope/source-of-truth text kept the docs change low risk.
  - Workflow problems: none beyond the already logged Issue-body quoting anomaly from the parent refactor run.
  - Improvements to adopt: for README scope refreshes, verify stale phrases with `rg` before archiving.
  - Skill candidates or updates: none.
  - Follow-up updates: final Issue close waits for PR merge, parent sync, and worktree cleanup.

## Archive conditions

- Archive after README updates are complete, focused validation has passed, and the package notes include final evidence.
