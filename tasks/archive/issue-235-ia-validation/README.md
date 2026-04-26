# Issue #235 Timeline-First IA Validation

## Purpose

Add reproducible validation for the Timeline-first information architecture cleanup so reduced status chrome, Thread Details recoverability, Timeline space, and Navigation minibar behavior do not regress.

## Primary issue

- https://github.com/tsukushibito/codex-webui/issues/235

## Source docs

- `docs/notes/codex_webui_thread_view_information_architecture_note_v0_1.md`
- `docs/validation/codex_webui_ux_renewal_validation_gates_v0_1.md`
- `apps/frontend-bff/e2e/`

## Scope for this package

- Add focused Playwright coverage for desktop Timeline-first viewport behavior.
- Validate Thread Details reachability after the cleanup.
- Validate Navigation card density and sidebar/minibar recovery.
- Validate mobile compact recovery paths and request detail reachability.
- Attach desktop/mobile visual evidence from the E2E run.

## Exit criteria

- Desktop E2E proves duplicate visible status surfaces remain absent and Timeline keeps a dominant viewport share.
- E2E proves details content is still reachable.
- E2E proves minibar switching preserves current workspace/thread orientation.
- Mobile E2E proves compact Threads/Details recovery paths remain reachable.
- Focused checks pass.

## Artifacts / evidence

- Local validation passed:
  - `npm run check`: passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `npm run test:e2e -- e2e/issue-235-timeline-first-ia.spec.ts --project=desktop-chromium --reporter=line`: 1 passed, 1 skipped.
  - `npm run test:e2e -- e2e/issue-235-timeline-first-ia.spec.ts --project=mobile-chromium --reporter=line`: 1 passed, 1 skipped.
- The new E2E attaches desktop and mobile screenshots through Playwright `testInfo.attach`.
- Playwright emitted the known `NO_COLOR` / `FORCE_COLOR` warning; it did not block tests.

## Status / handoff notes

- Active worktree: `.worktrees/issue-235-ia-validation`
- Active branch: `issue-235-ia-validation`
- Active PR: None yet.
- Completion boundary: package archive, PR, main merge, Issue close.
- Contract check:
  - Desktop E2E checks no visible Current Activity card, no inline idle Thread Feedback card, selected Navigation card `aria-current`, Thread Details reachability, minibar collapse/expand, and no horizontal scroll.
  - Desktop viewport check confirms the Timeline scroll region remains visible and larger than the compact header in the initial thread view.
  - Mobile E2E checks pending request controls, Details recovery, Threads recovery, and no horizontal scroll.
- Retrospective:
  - What worked: using existing browser mocks made the IA validation deterministic without new backend fixtures.
  - Workflow problems: project-specific tests need explicit skips because the validation spec contains desktop-only and mobile-only cases.
  - Improvements to adopt: future viewport assertions should verify concrete UI contracts without overfitting exact pixel ratios.
  - Skill candidates or skill updates: none.
