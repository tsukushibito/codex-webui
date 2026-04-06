# Issue #98 Chat Status Feedback

## Purpose

- Stabilize Chat status and error feedback so transient messages do not reflow the desktop card grid during session actions.

## Primary issue

- Issue: `#98` https://github.com/tsukushibito/codex-webui/issues/98

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md`
- `docs/specs/codex_webui_public_api_v0_8.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Inspect the current Chat feedback placement and layout rules in `apps/frontend-bff`
- Implement a UI-only fix that keeps session, transcript, and activity panels visually stable while transient feedback appears
- Re-verify desktop and smartphone-width Chat behavior after the layout adjustment

## Exit criteria

- `Session started.` / `Session stopped.` and comparable Chat feedback no longer shift the desktop card layout
- Chat remains readable on desktop and smartphone-width layouts during create, start, send, and stop actions
- Focused automated coverage or equivalent regression evidence is added for the layout behavior

## Work plan

- Inspect `ChatView` structure and `globals.css` rules that place transient feedback in the grid flow
- Move or restyle Chat feedback so it does not participate in panel placement changes
- Update or add focused tests for the revised Chat feedback structure
- Run the smallest credible validation for the affected UI paths

## Artifacts / evidence

- Added `chat-feedback-stack` layout isolation in `apps/frontend-bff/src/chat-view.tsx`
- Added desktop full-width grid placement for transient feedback in `apps/frontend-bff/app/globals.css`
- Added focused regression coverage in `apps/frontend-bff/tests/chat-view.test.tsx`
- Added Playwright layout/readability coverage in `apps/frontend-bff/e2e/chat-flow.spec.ts`
- Validation: `npm test -- --run tests/chat-view.test.tsx`
- Validation: `npm run test:e2e -- e2e/chat-flow.spec.ts`

## Status / handoff notes

- Status: `locally complete`
- Notes: A focused UI fix was implemented in `apps/frontend-bff` so transient Chat feedback renders in a dedicated layout row instead of as a card-flow grid item. Focused view coverage passed via `npm test -- --run tests/chat-view.test.tsx`, and Playwright `chat-flow.spec.ts` verifies desktop card-position stability plus mobile no-horizontal-scroll behavior across create/start/send/stop feedback states. The package is archived; remaining work is GitHub completion flow only: open and merge the PR, sync `main`, remove the active worktree, then close `#98`.

## Archive conditions

- Archive this package after the layout fix, regression evidence, and handoff notes are complete.

## Completion retrospective

### Completion boundary

- Issue-close boundary after the implementation slice became merge-ready with focused unit and Playwright evidence.

### Contract check

- Satisfied: `Session started.` / `Session stopped.` and comparable Chat feedback no longer rearrange Chat cards, evidenced by the dedicated `chat-feedback-stack`, desktop full-width grid placement, and Playwright desktop card-position assertions.
- Satisfied: desktop and smartphone-width Chat remain readable during create/start/send/stop flows, evidenced by Playwright desktop and mobile coverage in `apps/frontend-bff/e2e/chat-flow.spec.ts`.
- Satisfied: focused automated coverage exists for the layout behavior, evidenced by `apps/frontend-bff/tests/chat-view.test.tsx` plus `apps/frontend-bff/e2e/chat-flow.spec.ts`.

### What worked

- The bug stayed bounded to `apps/frontend-bff` and did not require runtime changes.
- A small DOM/CSS fix plus Playwright layout assertions was enough to prove the acceptance conditions.

### Workflow problems

- The delegated intake/planner/evaluator passes violated their read-only boundaries and required local correction before the sprint could be hard-gated cleanly.

### Improvements to adopt

- For UI layout defects, require at least one viewport-aware browser assertion early so the first validation pass proves the real acceptance condition instead of only static markup structure.

### Skill candidates or skill updates

- None

### Follow-up updates

- Merge the implementation branch, sync the parent `main`, remove the active worktree, close `#98`, and then resume `#93` / `#63` bookkeeping if needed.
