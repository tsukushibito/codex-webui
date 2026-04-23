# Issue 183 Timeline Grouping

## Purpose

- Implement the v0.9 thread-view timeline grouping, density, and assistant delta merge slice for Issue #183.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/183

## Source docs

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/notes/codex_webui_agent_ui_benchmark_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Replace all-card timeline rendering with grouped, readable thread chronology.
- Merge assistant streaming deltas into one visible assistant item while output is active.
- Define practical density tiers for user and assistant messages, approval or error items, file/tool/status rows, and low-priority logs.
- Add compact log rows or collapsed handling so low-priority items do not crowd out primary thread content.
- Preserve sticky composer and timeline scrolling behavior while streaming.

## Exit criteria

- Streaming no longer creates one visible card per assistant delta.
- User and assistant turn grouping keeps the primary thread narrative readable.
- Approval, error, file/tool/status, and low-priority log items render with appropriate density.
- Sticky composer and timeline scrolling behavior remain compatible with the grouped timeline.
- Focused frontend tests cover assistant delta merge, density tiers, and primary timeline readability behavior.

## Work plan

- Inspect current thread view, timeline, stream update, and tests in `apps/frontend-bff`.
- Add or adjust a timeline view-model layer for grouping, assistant delta coalescing, and density classification.
- Update the thread timeline rendering to use grouped message blocks and compact operational rows.
- Add focused tests for streaming delta merge, compact rows, and stable scrolling/composer layout assumptions.
- Run the frontend validation commands required for this slice.

## Artifacts / evidence

- Sprint validation: `npm run check` passed.
- Sprint validation: `npm test -- --run tests/timeline-display-model.test.ts tests/chat-view.test.tsx` passed.
- Sprint validation: `npm test -- --run tests/chat-page-client.test.tsx -t "keeps the final assistant message visible|renders the final assistant message from the stream"` passed.
- Sprint validation: `npm run build` passed after evaluator requested the missing build evidence.
- Pre-push validation: `npm run check` passed.
- Pre-push validation: `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
- Pre-push validation: `npm test` passed with 11 files and 65 tests.
- Pre-push validation: `npm run build` passed.
- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-23T12-34-21Z-issue-183-close/events.ndjson`

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-183-timeline-grouping`
- Active worktree: `.worktrees/issue-183-timeline-grouping`
- Notes: Implemented the Issue #183 timeline display slice with a single derived timeline display model, assistant delta coalescing, completed-stream dedupe, turn grouping, density classification, compact operational rows, and focused tests. Sprint evaluator approved the slice. Dedicated pre-push validation passed. Completion retrospective found no workflow updates or new skill candidates; Issue close still requires commit, PR, merge to `main`, parent checkout sync, worktree cleanup, and final GitHub tracking updates.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and handoff notes are updated.
- Archive condition status: met for this local package.
