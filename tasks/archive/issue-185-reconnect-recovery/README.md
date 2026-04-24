# Issue #185 Reconnect Recovery

## Purpose

- Implement the reconnect recovery and background priority notification slice for Issue #185.

## Primary issue

- Issue: `#185` https://github.com/tsukushibito/codex-webui/issues/185

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`

## Scope for this package

- Implement thread-scoped reconnect recovery and sequence-gap reacquisition in the browser/BFF flow.
- Surface background `waitingOnApproval`, `systemError`, and failed-turn states through navigation emphasis or lightweight notifications.
- Absorb open-required and runtime-error recovery into the thread-view flow without reviving a separate recovery screen.

## Exit criteria

- Sequence gaps and reconnect paths trigger documented REST reacquisition that restores thread-view consistency.
- Background high-priority thread state changes are visibly emphasized in the UI.
- Open-required and runtime-error recovery paths keep the user inside the thread-first flow.
- Local implementation passes the sprint gate and the dedicated pre-push validation gate before archive-oriented handoff.

## Work plan

- Audit the current thread stream, timeline, and notification handling to define one bounded implementation slice.
- Implement the required BFF and UI changes with focused tests.
- Run sprint evaluation, then the dedicated pre-push validation gate.
- Archive the package only after the slice is validated and ready for merge/completion tracking.

## Artifacts / evidence

- Validation evidence captured from `apps/frontend-bff`:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `npm test`
  - `npm run build`
- Package lifecycle notes in this README

## Status / handoff notes

- Status: `locally complete`
- Notes: `Implemented actionable background high-priority thread notices in /chat, kept thread selection stable on notification arrival, and added focused Chat UI tests. Sprint evaluator approved the bounded slice. The dedicated pre-push validation gate passed with check, tsc, test, and build in apps/frontend-bff.`

## Archive conditions

- Archive this package when the exit criteria are met, the pre-push validation gate passes, and the handoff notes are updated.
