# Runtime Native-First Persistence Boundary

## Purpose

- Define the minimal SQLite persistence boundary for native-first runtime behavior so `codex-runtime` stops treating DB projections as canonical thread state.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/322

## Source docs

- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Audit `apps/codex-runtime/src/db/schema.ts` and runtime domain reads/writes.
- Classify runtime SQLite data as WebUI-owned canonical data, short-lived helper/idempotency metadata, rebuildable cache, or duplicate native conversation state.
- Document the retained DB surface near the runtime implementation or maintained source docs.
- Identify code paths that currently use DB-only `sessions`, `messages`, or full `session_events` as canonical thread/status/transcript state.

## Exit criteria

- Runtime has a clear documented persistence boundary for Issue #321.
- The implementation plan names which data remains persisted and which native-backed reads must replace DB reads.
- The audit is specific enough to drive #323 and #324 without re-triage.
- Targeted runtime validation passes for touched files.

## Work plan

- Review v0.9 native-first source docs and current runtime schema/service boundaries.
- Add or update concise maintained documentation for the retained DB surface.
- Add implementation-facing notes where they reduce ambiguity for #323/#324.
- Run targeted formatting/check validation for the touched app or docs.

## Artifacts / evidence

- Planned evidence: `apps/codex-runtime` targeted validation output in handoff notes.

## Status / handoff notes

- Status: `locally complete`
- Notes: Added the runtime SQLite persistence boundary to `apps/codex-runtime/README.md`.
- Sprint evidence: planner selected a README-only slice; worker changed only `apps/codex-runtime/README.md`; evaluator verdict was `approved`.
- Pre-push validation: passed with `npm run check`, `npm test`, `npm run build`, and `git diff --check` in the active worktree.
- Completion retrospective:
  - Completion boundary: package archive only; Issue close still requires PR publication, merge to `main`, parent checkout sync, and worktree cleanup.
  - Contract check: package scope satisfied by the README classification covering all current runtime SQLite tables and #323/#324 handoff mapping.
  - What worked: splitting #321 first kept this slice small enough to validate cleanly.
  - Workflow problems: the initial worktree dependency symlink was wrong and blocked validation until corrected.
  - Improvements to adopt: verify shared `node_modules` symlink targets immediately after worktree creation when package setup creates them.
  - Skill candidates or updates: consider tightening `codex-webui-work-packages` symlink guidance if this path issue repeats.
  - Follow-up updates: continue with PR publication and completion tracking for #322, then resume #321 through #323/#324.

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate has passed, and handoff notes are updated.
