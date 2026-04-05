# Issue 93 Playwright E2E Acceptance

## Purpose

- Establish the Playwright-backed execution slice for `#93` so desktop and smartphone-width browser flows can be exercised with repo-local E2E evidence before the final DevTunnels smoke check.

## Primary issue

- Issue: `#93 https://github.com/tsukushibito/codex-webui/issues/93`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md`
- `docs/specs/codex_webui_public_api_v0_8.md`
- `docs/specs/codex_webui_technical_stack_decision_v0_1.md`

## Scope for this package

- Add a repo-local Playwright environment under `apps/frontend-bff` for browser-level validation.
- Cover the main MVP Chat path and representative approval/recovery paths with desktop and smartphone-width projects.
- Record what Playwright can validate automatically and what still requires a final DevTunnels manual smoke check.
- Feed the resulting E2E/UI acceptance notes back into `#93` and parent issue `#63`.

## Exit criteria

- Playwright is wired into `apps/frontend-bff` with runnable desktop and mobile projects.
- At least the main Chat flow and one recovery/approval-oriented browser path are covered by automated E2E tests.
- The package notes clearly separate automated browser evidence from the remaining manual DevTunnels verification gap.
- `#93` execution tracking points to this package while the slice is in progress.

## Work plan

- Install and configure Playwright in `apps/frontend-bff`, including local server orchestration for `frontend-bff` and `codex-runtime`.
- Add initial E2E specs for `workspace create -> session create -> start -> dialogue -> stop` and mobile-width UI coverage.
- Run the focused Playwright suite and any touched app tests/builds needed to keep the new harness credible.
- Update handoff notes with the automated coverage achieved and the exact manual checks still needed through DevTunnels.

## Artifacts / evidence

- Mocked browser-shell Playwright harness:
  - `apps/frontend-bff/playwright.config.ts`
  - `apps/frontend-bff/e2e/chat-flow.spec.ts`
  - `apps/frontend-bff/e2e/approval-flow.spec.ts`
  - `apps/frontend-bff/e2e/helpers/browser-mocks.ts`
- Runtime-backed Playwright harness:
  - `apps/frontend-bff/playwright.config.ts`
  - `apps/frontend-bff/e2e/chat-flow.runtime.spec.ts`
- Supporting setup:
  - `apps/frontend-bff/package.json`
  - `apps/frontend-bff/package-lock.json`
  - `.gitignore`
- Validation runs:
  - Mocked browser-shell slice:
  - `cd apps/frontend-bff && npm test`
  - `cd apps/frontend-bff && npm run test:e2e -- --list`
  - `cd apps/frontend-bff && npm run test:e2e`
  - Runtime-backed slice:
  - `cd apps/frontend-bff && npm run test:e2e -- --grep "live runtime stack"`
  - Consolidated rerun:
  - `cd apps/frontend-bff && npm test`
  - `cd apps/frontend-bff && npm run test:e2e -- --reporter=line`
  - `cd apps/frontend-bff && npm run build`
- Observed result:
  - Mocked browser-shell evidence:
  - desktop/mobile approval flow passed
  - desktop/mobile chat flow passed after fixing the test to fill the composer before asserting the send button is enabled
  - these specs validate browser-shell behavior against mocked public API responses served through the real `frontend-bff` shell
  - Runtime-backed browser evidence:
  - desktop/mobile `chat-flow.runtime.spec.ts` now passes against live `frontend-bff` + `codex-runtime`
  - targeted command result: `[desktop-chromium]` passed in `27.2s`, `[mobile-chromium]` passed in `3.4s`, `2 passed (1.6m)`
  - full Playwright rerun result: `6 passed (1.3m)` across desktop/mobile mocked + runtime-backed coverage
  - `npm test` rerun result: `8` files passed, `21` tests passed
  - `npm run build` passes when executed standalone after Playwright cleanup
  - note: one earlier `npm run build` failure (`Cannot find module for page: /_document`) occurred only when `next build` was run in parallel with Playwright's `next dev`; the standalone rerun was green
  - Remaining manual gap:
  - DevTunnels smoke checks still remain for final external-browser confirmation on PC and smartphone width

## Status / handoff notes

- Status: `locally complete`
- Notes: `The Playwright acceptance harness is ready to merge independently of final #93 closure. Mocked desktop/mobile browser-shell coverage and runtime-backed main-chat coverage are green, and the remaining work for #93 is manual DevTunnel acceptance plus any follow-up issues from those checks. Current known follow-up from manual validation is that approval UI status does not enter waiting_approval until reload.`

## Archive conditions

- Archive this package when the Playwright-based acceptance slice is complete, the handoff notes are updated, and the remaining manual browser checks are clearly identified.

## Completion retrospective

### Completion boundary

- Package archive after the Playwright/browser-automation slice became merge-ready, while issue `#93` remains open for the remaining manual acceptance work.

### Contract check

- Not applicable: this boundary archives the local Playwright slice, not the full close of `#93`.

### What worked

- Splitting acceptance into mocked browser-shell coverage, runtime-backed coverage, and external-browser smoke checks kept the automation slice small enough to land.
- Desktop and mobile Playwright projects gave fast feedback on both layout and core chat flow regressions.

### Workflow problems

- The first browser-path failures only reproduced through DevTunnel and were not visible in the initial local-only Playwright slice.
- `#93` mixed durable automation work and open-ended manual validation, so the active package needed to be archived before the issue itself was ready to close.

### Improvements to adopt

- Merge automation harnesses as soon as they are independently valuable, even when the parent validation issue still has manual acceptance work left.
- Keep manual remote-browser findings tracked separately from the automation package so the issue can continue without holding infrastructure changes hostage on a long-lived branch.

### Skill candidates or skill updates

- None

### Follow-up updates

- Continue `#93` with smartphone-width manual acceptance, approval-path acceptance, and linked follow-up issue tracking for any blocking UI/E2E defects.
