# Issue 179 Desktop State Spec

## Purpose

- Create implementation-ready desktop screen specifications for Navigation, Thread View, and Detail Surface states in the renewed v0.9 UX.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/179

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/notes/codex_webui_agent_ui_benchmark_note_v0_1.md`

## Scope for this package

- Add or update maintained docs so engineers can implement the desktop shell without guessing layout ownership.
- Specify the three-region desktop model across Navigation, Thread View, and Detail Surface.
- Define desktop states for waiting on input, in progress, waiting on approval, system error / failed turn, not loaded, and open-required recovery.
- Specify responsibilities for thread header, current activity, pending request summary, timeline, composer, thread list row, badges, blocked cue, and resume cue.
- Keep mobile as an explicitly deferred follow-up and avoid restoring Home / Chat / Approval as separate primary screens.

## Exit criteria

- The maintained desktop state specification is reachable under `docs/` and linked from the relevant wiki entrypoints if needed.
- The spec covers the Issue #179 acceptance criteria in implementation-ready terms.
- The package has passed the local sprint evaluator and the dedicated pre-push validation gate before archive or publish handoff.

## Work plan

- Identify the correct maintained doc location for the desktop screen state specification.
- Draft desktop state rules that extend the existing v0.9 layout spec without duplicating source-of-truth language unnecessarily.
- Update `docs/index.md` and `docs/log.md` only if discoverability materially changes.
- Run focused docs validation and any available lint/type checks appropriate to the touched files.
- Record evidence and handoff notes before pre-push validation.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-23T02-32-27Z-issue-179-close/events.ndjson`
- Desktop layout image status: no maintained image asset or Issue #179 attachment/comment image was found. The only local draft reference found is the parent-checkout `.tmp/CodexWebUI_UX重視_作業計画書_v0_1.md` filename mention of `codexwebui_approval_interface_screenshot.png`; that mention is not itself a maintained or normative asset, and no matching PNG file was found. Written rules are anchored to the existing textual desktop compositions in `docs/specs/codex_webui_ui_layout_spec_v0_9.md`.
- Touched docs:
  - `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
  - `docs/log.md`
  - `tasks/issue-179-desktop-state-spec/README.md`
- Validation evidence:
  - `git diff -- docs/specs/codex_webui_ui_layout_spec_v0_9.md docs/log.md docs/index.md tasks/issue-179-desktop-state-spec/README.md` showed tracked changes in `docs/specs/codex_webui_ui_layout_spec_v0_9.md` and `docs/log.md`; `docs/index.md` had no diff. The task README is untracked in this worktree, so it is visible through `git status --short` rather than tracked diff.
  - `rg -n "Home / Chat / Approval|global approval inbox|open-required|notLoaded|waiting on approval|Detail Surface|Navigation|Thread View|resume cue|blocked cue" docs/specs/codex_webui_ui_layout_spec_v0_9.md` found the desktop composition, state matrix, thread-scoped approval, recovery, and cue ownership terms.
  - `rg -n "issue-179|desktop state|Desktop|layout" docs/log.md tasks/issue-179-desktop-state-spec/README.md` found the new log entry and package evidence/status notes.
  - Follow-up image-reference validation confirmed the maintained docs now distinguish the `.tmp` filename mention from a maintained/normative image asset, and no matching `codexwebui_approval_interface_screenshot.png` file was found.
  - `git status --short -- docs/specs/codex_webui_ui_layout_spec_v0_9.md docs/log.md docs/index.md tasks/issue-179-desktop-state-spec/README.md` showed modified tracked docs and untracked task README.
  - Docs lint/check discovery found no documented docs-only lint command; only app-local lint guidance was present, and no app files were changed.

## Status / handoff notes

- Status: `locally complete - archived for publish handoff`
- Active branch: `issue-179-desktop-state-spec`
- Active worktree: `.worktrees/issue-179-desktop-state-spec`
- Notes: Added desktop state ownership rules for Navigation, Thread View, and Detail Surface. The spec covers waiting on input, in progress, waiting on approval, system error / failed turn, `notLoaded`, and open-required recovery without restoring Home / Chat / Approval as primary pages. Mobile remains deferred to existing v0.9 mobile reachability rules.
- Sprint result: evaluator approved the docs-only slice.
- Pre-push validation: passed with no blocking failures or gaps.
- Completion retrospective: Package archive boundary only. Contract check is satisfied locally by the maintained layout spec update, docs log entry, task evidence, evaluator approval, and dedicated pre-push validation. What worked: the slice stayed in the docs-only write scope and the missing image asset was handled as a maintained-source distinction instead of inventing a new normative asset. Workflow problems: the initial task package included one wrong note path, an initial `gh pr list` command used an unsupported JSON field, and the image reference required a follow-up check to distinguish `.tmp` filename mentions from maintained assets. Improvements to adopt: validate source-doc paths immediately when creating packages, and describe missing visual assets as maintained-asset status rather than broad "no reference" language. Skill candidates or skill updates: none. Follow-up updates: commit and publish the branch, open/merge a PR, sync parent `main`, remove the active worktree, update Issue/Project completion tracking, and close Issue #179 only after the work is reachable on `main` and local state is clean.

## Archive conditions

- Archive this package after the desktop spec exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and the Issue execution metadata points to the archived package.
