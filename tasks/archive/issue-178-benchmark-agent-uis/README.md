# Issue 178 Benchmark Agent UIs

## Purpose

- Capture benchmark findings across reference agent and assistant UI families so UX renewal work can use structural IA inputs without visual copying.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/178

## Source docs

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/README.md`

## Scope for this package

- Select at least five reference UI families across CLI/TUI, assistant, IDE assistant, and autonomous agent/task-runner categories.
- Compare main pane, navigation, activity/status visibility, approval/risky-action handling, detail surfaces, composer behavior, and background task cues.
- Record CodexWebUI adopt and do-not-adopt patterns in a maintained note.
- Tie adopted patterns to CodexWebUI-native requirements and explicitly avoid visual mimicry.

## Exit criteria

- Benchmark findings are summarized in a maintained note or linked artifact.
- Adopted patterns are tied to CodexWebUI-native requirements.
- Visual mimicry is explicitly avoided.
- `docs/index.md` and `docs/log.md` are updated if the maintained note changes wiki navigation or maintained knowledge.

## Work plan

- Review v0.9 UX requirements and UI layout responsibilities.
- Draft the benchmark note under `docs/notes/`.
- Update wiki navigation and log entries if needed.
- Run docs-focused validation checks.

## Artifacts / evidence

- Maintained note: `docs/notes/codex_webui_agent_ui_benchmark_note_v0_1.md`
- Wiki navigation: `docs/index.md`
- Wiki log: `docs/log.md`
- Sprint evaluator verdict: `approved`
- Dedicated pre-push validation gate: `passed`
- Validation:
  - `git diff --check`
  - `test -f docs/notes/codex_webui_agent_ui_benchmark_note_v0_1.md`
  - `rg -n "visual mimicry|visual copying|structural|interaction" docs/notes/codex_webui_agent_ui_benchmark_note_v0_1.md`
  - `rg -n "thread_view|timeline|request flow|Detail Surface|Navigation|resume|blocked|mobile|smartphone" docs/notes/codex_webui_agent_ui_benchmark_note_v0_1.md`
  - `rg -n "codex_webui_agent_ui_benchmark_note_v0_1" docs/index.md docs/log.md`
  - `git diff --name-only`
  - `git status --short`

## Status / handoff notes

- Status: `archived`
- Notes:
  - Issue #178 exit criteria are met by `docs/notes/codex_webui_agent_ui_benchmark_note_v0_1.md`.
  - The note covers six reference UI families across CLI/TUI, assistant, IDE assistant, and autonomous agent/task-runner categories.
  - Adopt and do-not-adopt patterns are tied to CodexWebUI v0.9 responsibilities and explicitly avoid visual mimicry.
  - Completion retrospective: no new durable process or skill update is needed; the expected workflow friction was that `git diff --name-only` does not show the newly created active package until it is archived/tracked, so status evidence used `git status --short` as well.
  - Remaining follow-through after archive: create PR, merge to `main`, sync parent checkout, remove active worktree, and close Issue #178 / set Project `Done` only after the work is reachable on `main` and local state is clean.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, the completion retrospective is recorded, and handoff notes are updated.
