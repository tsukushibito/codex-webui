# Issue 177: Thread View IA

## Purpose

- Define the desktop-first browser information architecture for the UX renewal before implementation begins.
- Make Home removal, Navigation, Thread View, Detail Surface, request handling, empty states, and acceptance gates explicit in maintained docs.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/177

## Source docs

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`

## Scope for this package

- Update maintained docs so a reviewer can explain the browser UX without relying on a primary Home screen.
- Assign workspace switching, thread list, resume cues, blocked cues, and badges to Navigation and empty states.
- Define `thread_view` responsibilities for header, current activity, pending request summary, timeline, and the single composer.
- Define Detail Surface responsibilities for approval, file summary, errors, and contextual details.
- Define empty, no-thread-selected, `notLoaded`, and open-required behavior.
- Define UX acceptance gates that downstream implementation and validation issues can reuse.

## Exit criteria

- Maintained docs explicitly cover Home removal semantics, Navigation, Thread View, Detail Surface, empty states, request context, reconnect return priority, and first-input thread start.
- `docs/index.md` and `docs/log.md` are updated if discoverability or maintained wiki navigation changes.
- Issue #177 acceptance criteria are satisfied locally and ready for pre-push validation.

## Work plan

- Review the v0.9 requirements and UI layout spec for existing IA coverage.
- Add or refine maintained documentation for the missing IA responsibilities.
- Keep the changes source-of-truth oriented and avoid duplicating full implementation tasks from child issues.
- Run targeted markdown/content validation.

## Artifacts / evidence

- Sprint evaluator: approved.
- Pre-push validation: passed.
- Validation evidence:
  - `git diff --check`
  - targeted `rg` over IA terms across the UI layout spec, requirements, index, and log
  - targeted `git diff` over maintained docs
  - pre-push read-only spot checks of the updated UI layout spec sections

## Status / handoff notes

- Status: `locally complete`
- Notes:
  - Updated `docs/specs/codex_webui_ui_layout_spec_v0_9.md` to freeze the v0.9 app-shell IA for Home removal, Navigation ownership, Thread View ownership, Detail Surface ownership, empty/no-selection states, reconnect return priority, and UX acceptance gates.
  - `docs/requirements/codex_webui_mvp_requirements_v0_9.md`, `docs/index.md`, and `docs/log.md` did not need edits because the existing source-of-truth and wiki discoverability remained aligned.
  - Completion retrospective: package archive boundary is satisfied; Issue close remains blocked until the branch is pushed, PR is merged to `main`, parent checkout is synced, and the active worktree is removed.
  - Workflow problem noted: the first Issue `Execution` update used bad shell quoting and was immediately corrected; future Issue body edits with Markdown backticks should use single-quoted literals or another shell-safe path.

## Archive conditions

- Archive this package when the exit criteria are met, dedicated pre-push validation has passed, completion retrospective is recorded, and handoff notes are updated.
