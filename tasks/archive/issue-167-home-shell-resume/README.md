# Issue 167: Home Shell Resume

## Purpose

Rework Home and workspace selection so the app shell exposes current workspace context, compact workspace switching, high-priority resume entrypoints, and first-input thread start without returning to a card-heavy workspace destination.

## Primary issue

- Issue: [#167 Phase 4B follow-up 4: Rework Home and workspace switcher as app-shell resume entrypoints](https://github.com/tsukushibito/codex-webui/issues/167)

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`, section 5.3
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`, sections 18.2, 18.3, 18.5, and 18.6
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`, sections 4.3, 4.4, and 7
- `docs/specs/codex_webui_public_api_v0_9.md`, sections 6.8, 7.8, 8.1, and 9.3
- `apps/frontend-bff/README.md`

## Scope for this package

- Make Home prioritize resume candidates and high-priority thread/workspace signals.
- Present the current workspace as compact app-shell context rather than a permanently expanded workspace tree.
- Provide a compact workspace switcher path from Home.
- Keep `Ask Codex` tied to the selected workspace and the first-input start route.
- Add focused route, data, and component tests for resume ordering, workspace switching, and high-priority workspace/thread cues.

## Exit criteria

- Home leads directly to workspace selection, first-input thread start, or high-priority thread resume.
- Current workspace context is visible without dominating Home as a workspace-card grid.
- Mobile users can reach the most relevant resume target without first navigating through a card-heavy workspace destination.
- Focused tests cover resume candidates, compact workspace selection, and high-priority workspace/thread signals.
- Local validation for the touched `frontend-bff` surface passes before pre-push validation.

## Work plan

- Inspect current Home data shape, Home client state, and Home view composition.
- Adjust Home data/view-model handling only where the existing public v0.9 Home aggregate supports the UI.
- Recompose `HomeView` and `HomePageClient` around selected workspace context, resume entrypoints, and compact switching.
- Update focused tests before broad validation.
- Run targeted `frontend-bff` checks, then hand off to dedicated pre-push validation.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-21T12-10-24Z-issue-167-close/events.ndjson`
- Sprint evaluator verdict: `approved`
- Dedicated pre-push validation gate: `passed`
- Validation evidence:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `npm test`
  - `npm run build`
  - `npm run test:e2e -- e2e/chat-flow.spec.ts`
  - `npm run test:e2e -- e2e/chat-flow.runtime.spec.ts`

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-167-home-shell-resume`
- Active worktree: `.worktrees/issue-167-home-shell-resume`
- Active PR: `None`
- Notes:
  - Home now presents a compact current-workspace app-shell context, closed-by-default workspace switcher, top resume entrypoint, and workspace-scoped `Ask Codex` first-input path.
  - Focused unit/component and desktop/mobile Playwright coverage passed for the Home-to-chat first-input flow.
  - Completion retrospective: package exit criteria are satisfied locally; Issue close remains blocked until the branch is committed, pushed, reviewed/merged to `main`, parent checkout is synced, and the worktree is removed.
  - Workflow note: the worktree needed a local ignored `apps/codex-runtime/node_modules` symlink before Playwright could start the runtime webServer.

## Archive conditions

- Archive this package after the exit criteria are met, dedicated pre-push validation has passed, completion retrospective has run, and handoff notes include validation evidence.
