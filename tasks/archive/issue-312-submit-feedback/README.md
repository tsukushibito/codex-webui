# Issue 312 Submit Feedback

## Purpose

- Prevent transient follow-up submit feedback from shifting the main Thread View layout.

## Primary issue

- Issue: [#312 UI: avoid layout shift from follow-up submit feedback](https://github.com/tsukushibito/codex-webui/issues/312)

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`
- Related completed work: #302, #303, #304

## Scope for this package

- Replace the normal follow-up submit card with a lower-impact pending affordance that does not shift the main Thread View layout.
- Keep accessible status semantics for screen readers.
- Preserve stronger Thread View cards for action-critical or longer-lived states such as opening, reconnecting, recovery, request, error, or blocked-send states.
- Keep first-input/new-thread submission feedback understandable without reintroducing a global banner.
- Add focused regression coverage for follow-up send feedback placement and layout stability.

## Exit criteria

- Sending a follow-up input does not insert a full-width card above the timeline.
- The user still receives a clear pending/accepted signal near the composer, send button, or latest timeline context.
- The Thread View timeline position and readable column do not jump when the transient submit state appears or disappears.
- `aria-live` or equivalent accessible status behavior is preserved.
- Existing scoped feedback routing from #302 remains scoped to the relevant surface.

## Work plan

- Inspect current `threadFeedback` and composer feedback routing for submit states.
- Move routine follow-up submission feedback out of the Thread View header-card stack.
- Preserve stronger Thread View feedback for first-input/opening/recovery/action-critical states.
- Add or update focused tests and E2E coverage for no header-card insertion and layout stability.
- Run targeted validation before sprint evaluation.

## Artifacts / evidence

- Sprint evaluator: `approved`.
- Dedicated pre-push validation: passed.
- Validation:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `npm test` 15 files / 133 tests
  - `npm run build`
  - `node ./node_modules/@playwright/test/cli.js test e2e/issue-312-submit-feedback.spec.ts --project=desktop-chromium` 1 test

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-312-submit-feedback`
- Active worktree: `.worktrees/issue-312-submit-feedback`
- Notes: Suppressed the routine selected-thread follow-up submit card while preserving first-input strong feedback and composer-local pending/accepted status semantics. Added unit, client, and desktop E2E coverage for no submit card insertion, composer feedback accessibility, layout stability, and no horizontal overflow. Completion retrospective: package archive boundary is satisfied; Issue close still requires commit, push, PR, merge to `main`, parent checkout sync, worktree cleanup, and final Issue/Project completion tracking. No durable workflow update is required from this slice.

## Archive conditions

- Archive this package after the exit criteria are met, dedicated pre-push validation passes, completion retrospective is recorded, and handoff notes point to the final validation evidence.
