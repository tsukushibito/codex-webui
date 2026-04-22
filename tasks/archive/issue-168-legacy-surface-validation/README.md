# Issue 168 Legacy Surface Validation

## Purpose

- Retire or explicitly quarantine browser-unused legacy session/approval public surfaces and harden validation for the v0.9 thread-first UI refresh.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/168

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`, section 5.3
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `tasks/archive/issue-164-ui-state-matrix/README.md`
- `tasks/archive/issue-166-request-detail-recovery/README.md`
- `tasks/archive/issue-167-home-shell-resume/README.md`

## Scope for this package

- Remove or quarantine browser-unused `sessions` and standalone `approvals` public route behavior in `apps/frontend-bff`.
- Remove or update route, component, and e2e test fixtures that still enforce the old session/approval worldview as browser-critical behavior.
- Keep any remaining compatibility behavior explicitly non-browser-critical.
- Add or harden focused coverage for thread/request browser behavior, including request response from thread context, REST reacquisition, interrupt, and background promotion signals.
- Capture desktop and mobile validation evidence, including a 360 CSS px no-horizontal-scroll check and ngrok remote-browser smoke where relevant.

## Exit criteria

- Maintained browser workflows do not depend on standalone session/approval public APIs.
- Remaining legacy compatibility is explicitly quarantined or tracked as non-browser-critical.
- Focused route/unit/component coverage protects the v0.9 thread/request browser paths.
- Validation evidence covers desktop and smartphone paths for first-input start, follow-up input, pending request response, interrupt, reload/reconnect, and background promotion.
- The dedicated pre-push validation gate passes before archive or publish-oriented handoff.

## Work plan

- Audit `apps/frontend-bff` legacy session/approval route handlers, route files, tests, and browser mocks.
- Remove or quarantine public legacy route handlers and update tests to assert v0.9 thread/request behavior instead of old browser-critical session/approval paths.
- Extend focused browser route/component coverage for request detail, notification-triggered refresh, REST reacquisition, and mobile layout constraints.
- Run local validation in the `frontend-bff` app, then capture required browser evidence under `artifacts/`.
- Update this package with validation evidence and hand off to pre-push validation before archive/publish work.

## Artifacts / evidence

- Browser validation evidence: [`browser-validation-2026-04-22.md`](../../artifacts/issue-168-legacy-surface-validation/browser-validation-2026-04-22.md).
- 360 CSS px measurements: [`360-no-horizontal-scroll-measurements.json`](../../artifacts/issue-168-legacy-surface-validation/360-no-horizontal-scroll-measurements.json); Home, Chat thread, and Chat request detail all recorded `clientWidth=360`, `scrollWidth=360`, pass.
- Ngrok smoke: [`ngrok-remote-browser-smoke.json`](../../artifacts/issue-168-legacy-surface-validation/ngrok-remote-browser-smoke.json); authenticated browser reached the current ngrok URL and rendered `Home`; unauthenticated status was `401`, authenticated status was `200`.
- Route-retirement sprint validation:
  - `npm run check` passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `node ./node_modules/vitest/vitest.mjs run tests/routes.test.ts tests/browser-state-matrix.test.ts tests/chat-data.test.ts` passed with 30 tests.
  - `npm test` passed with 57 tests.
  - `npm run build` passed.
  - `node ./node_modules/@playwright/test/cli.js test e2e/approval-flow.spec.ts` passed with 4 tests.
- Evidence-capture sprint validation:
  - `npm run test --prefix apps/frontend-bff -- tests/chat-page-client.test.tsx tests/home-page-client.test.tsx` passed with 14 tests.
  - `npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.spec.ts e2e/approval-flow.spec.ts --project=desktop-chromium --reporter=line` passed with 3 tests.
  - `npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.spec.ts e2e/approval-flow.spec.ts --project=mobile-chromium --reporter=line` passed with 3 tests.
  - `npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=desktop-chromium --reporter=line` passed with 1 test.
  - `npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=mobile-chromium --reporter=line` passed with 1 test.
- Dedicated pre-push validation gate: passed after rerunning the 360 measurement with a temporary local BFF server.

## Status / handoff notes

- Status: `locally complete; archived after pre-push validation`
- Active branch: `issue-168-legacy-surface-validation`
- Active worktree: `.worktrees/issue-168-legacy-surface-validation`
- Notes:
  - Retired browser-unused legacy public session and standalone approval route families behind deterministic `410 legacy_route_retired` responses.
  - Updated route tests, the browser state matrix, and e2e browser mocks so maintained browser workflows rely on v0.9 thread/request surfaces.
  - Captured desktop/mobile validation evidence for first-input start, follow-up input, pending request response, interrupt, reload/reconnect, background promotion, 360 CSS px no-horizontal-scroll, and current ngrok remote-browser smoke.
  - Full runtime e2e over ngrok was attempted on mobile and desktop but failed at the post-start `Waiting for your input` assertion after reaching the remote app; the narrower supported ngrok remote-browser smoke passed and is recorded as current #168 evidence.
  - Completion retrospective:
    - Completion boundary: package archive after sprint approvals and dedicated pre-push validation.
    - Contract check: package exit criteria are satisfied by the route retirement implementation, focused/full validation commands, browser validation artifact, 360 CSS px measurements, and ngrok smoke evidence.
    - What worked: separating route retirement from evidence capture kept the implementation and validation artifacts reviewable.
    - Workflow problems: the first pre-push validator run used the 360 measurement script without starting the BFF dev server, so it failed with `ERR_CONNECTION_REFUSED` before a corrected rerun passed.
    - Improvements to adopt: when a validation helper assumes a local server, include the server startup in the validator command framing or make the helper self-starting.
    - Skill candidates or skill updates: consider tightening future evidence-capture planner prompts to specify self-contained measurement commands.
    - Follow-up updates: commit, push, PR, merge to `main`, parent checkout sync, worktree cleanup, Issue close, and Project `Done` remain pending.

## Archive conditions

- Archive this package when the exit criteria are met, pre-push validation has passed, completion retrospective is recorded, and handoff notes are updated.
