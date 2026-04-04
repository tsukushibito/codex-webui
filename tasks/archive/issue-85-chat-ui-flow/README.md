# Phase 4B-2 Chat UI Flow

## Purpose

- Execute Issue #85 by implementing the smartphone-focused Chat screen, session interaction flow, and reconnect handling for Phase 4B.

## Primary issue

- Issue: `#85` https://github.com/tsukushibito/codex-webui/issues/85

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md` section 9.3
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md` sections 6 and 8
- `docs/specs/codex_webui_public_api_v0_8.md` sections 5.2, 9.2, and 12.2
- `apps/frontend-bff/README.md`

## Scope for this package

- Replace the placeholder `/chat` route in `apps/frontend-bff` with the first real smartphone-focused Chat screen.
- Implement session list, session creation, and session start entry points that use the documented public API.
- Render session detail, message history, activity log, and session status.
- Support message send, stop, and session stream updates with REST reacquisition after disconnect.
- Keep the Chat layout usable at 360px width without horizontal scrolling.

## Exit criteria

- Main chat operations work through the documented public API.
- Session stream updates render correctly in the UI, including delta and completed states.
- Chat can recover consistency through REST reacquisition after stream disconnect.
- The Chat screen remains usable at smartphone width without horizontal scrolling.
- Validation evidence is recorded here before archive.

## Work plan

- Audit the merged Home shell and BFF routes to define the smallest Chat-focused UI slice.
- Implement Chat data access, session flow actions, and session stream handling in `apps/frontend-bff`.
- Add focused tests for Chat data/rendering behavior and reconnect handling where practical.
- Record validation results and any Approval-slice dependencies in the handoff notes.

## Artifacts / evidence

- Validation passed: `npm test` in `apps/frontend-bff`
- Validation passed: `npm run build` in `apps/frontend-bff`
- Reconnect note: Chat reacquires session, messages, and events from REST when the session stream errors before attempting to reconnect
- Responsive/manual verification note: Chat uses a single-column shell up to 720px with full-width cards, wrapping action rows, and no fixed-width controls
- Remaining check for later slices: Chat-side approval waiting is visible, but full approval action reflection remains in `#86`

## Status / handoff notes

- Status: `implementation complete pending evaluator review`
- Notes: `Replaced the /chat placeholder with a real Chat shell covering session list/create/start, transcript, event log, message send, stop, and stream reconnect reacquisition.`
- Validation: `npm test` passed with 16 tests across route, Home, and Chat coverage.
- Validation: `npm run build` passed and generated the dynamic /chat route.
- Follow-up constraint: Approval actions are intentionally deferred to `#86`; Chat only surfaces approval-waiting state in this slice.
- Retrospective: Reusing the merged Home shell kept the UI slice bounded and reduced new styling churn.
- Retrospective: The worker stalled during `npm install` and needed manual recovery before validation; no repo-tracked process change adopted from this slice yet.

## Archive conditions

- Archive this package when the exit criteria are met, validation evidence is recorded, and the handoff notes are updated for merge/completion tracking.
