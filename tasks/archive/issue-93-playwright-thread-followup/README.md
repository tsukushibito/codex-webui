# Issue 93 Playwright Thread Followup

## Purpose

- Reopen `#93` with a bounded follow-up package for the thread-first Playwright regression fixes identified during the interrupted E2E refresh.

## Primary issue

- Issue: `#93 https://github.com/tsukushibito/codex-webui/issues/93`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `apps/frontend-bff/README.md`
- `tasks/archive/issue-93-playwright-e2e-acceptance/README.md`

## Scope for this package

- Reconcile the mocked and runtime-backed Playwright specs with the current v0.9 thread-first browser flow.
- Restore approval-path automation so the package validates at least one request resolution path instead of render-only coverage.
- Reintroduce the minimum UI acceptance checks needed for `#93`, especially desktop and smartphone-width stability after the thread cutover.
- Align the touched Playwright browser mocks with the public BFF contract for the endpoints used by the refreshed specs.

## Exit criteria

- `apps/frontend-bff/e2e/chat-flow.spec.ts`, `approval-flow.spec.ts`, and `chat-flow.runtime.spec.ts` reflect the thread-first UI and pass in the intended desktop/mobile coverage.
- The touched mock responses in `apps/frontend-bff/e2e/helpers/browser-mocks.ts` match the public contract shape for the exercised routes.
- Approval E2E coverage includes at least one successful request-decision assertion.
- The package notes record any remaining manual-only acceptance gap that still belongs to `#93`.

## Work plan

- Confirm the exact gap between the current thread-first UI, the archived `#93` Playwright slice, and the interrupted local repair attempt.
- Normalize the mocked browser-shell specs and helpers around the public thread/request contract and current UI labels.
- Restore focused approval and UI-acceptance assertions without reintroducing selector ambiguity.
- Rerun the affected Playwright coverage and the minimum supporting app validation needed to make the slice credible.
- Update handoff notes with the final automated coverage boundary and any follow-up defects discovered during reruns.

## Artifacts / evidence

- Planned touched files:
  - `apps/frontend-bff/e2e/helpers/browser-mocks.ts`
  - `apps/frontend-bff/e2e/chat-flow.spec.ts`
  - `apps/frontend-bff/e2e/approval-flow.spec.ts`
  - `apps/frontend-bff/e2e/chat-flow.runtime.spec.ts`
- Validation commands run:
  - `cd apps/frontend-bff && npm run test:e2e -- --reporter=line e2e/approval-flow.spec.ts e2e/chat-flow.spec.ts e2e/chat-flow.runtime.spec.ts` - passed
  - `cd apps/frontend-bff && npm run check` - passed

## Status / handoff notes

- Status: `in progress`
- Notes: `Thread-first Playwright coverage and browser mocks have been re-derived in this worktree. The refreshed approval, chat, and runtime smoke specs pass locally; the package remains active until the pre-push validation gate runs and the slice is archived. The remaining #93 manual-only boundary is the external DevTunnels browser acceptance check on PC and smartphone width, including the previously observed approval-status reload gap.`

## Archive conditions

- Archive this package when the refreshed Playwright slice is locally complete, the required validation passes, and the remaining manual acceptance boundary for `#93` is explicitly documented.

## Completion retrospective

### What worked

- Splitting the thread-first refresh into mocked browser-shell coverage, runtime smoke coverage, and focused approval assertions kept the slice bounded enough to validate cleanly.

### Workflow problems

- The remaining DevTunnels/manual browser gap had to stay explicit or the package looked more complete than it actually was.

### Improvements to adopt

- Keep manual-only acceptance boundaries in the package notes before archive so the next reviewer does not have to reconstruct them from prior work.
