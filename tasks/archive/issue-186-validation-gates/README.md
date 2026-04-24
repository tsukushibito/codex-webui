# Issue 186 Validation Gates

## Purpose

- Define the maintained E2E and UX regression validation gates that prove the UX renewal is complete by behavior, not only by route or component presence.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/186

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`, section 5.4
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `tasks/archive/issue-168-legacy-surface-validation/README.md`

## Scope for this package

- Publish maintained validation docs for the UX renewal E2E flows and regression gates.
- Align Playwright and supporting validation coverage with the maintained gate definitions where the current suite is incomplete or ambiguous.
- Capture the evidence and handoff notes needed to close Issue #186 once the work reaches `main`.

## Exit criteria

- Maintained validation source-of-truth documents define the UX renewal E2E scenarios, regression checks, and desktop visual inspection expectations.
- Repo validation coverage clearly maps to the maintained gate definitions for workspace selection, new-thread start, existing-thread continuation, approval response, streaming, reconnect convergence, and background priority return.
- The package records the evidence and completion notes needed for pre-push validation, merge follow-through, and Issue close.

## Work plan

- Audit existing validation docs and Playwright coverage against Issue #186 scope.
- Add or update maintained validation docs under `docs/validation/` for UX renewal E2E and regression gates.
- Add or update focused tests and helpers under `apps/frontend-bff/` only where the maintained gates reveal concrete gaps.
- Run local validation, then prepare for the dedicated pre-push validation gate.

## Artifacts / evidence

- Evidence:
  - maintained validation source: `docs/validation/codex_webui_ux_renewal_validation_gates_v0_1.md`
  - targeted browser coverage: `apps/frontend-bff/e2e/background-priority.spec.ts`
  - local validation command summaries:
    - `npm run check` passed
    - `node ./node_modules/next/dist/bin/next typegen` passed
    - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed
    - `npm test -- tests/chat-page-client.test.tsx tests/home-page-client.test.tsx` passed with 17 tests
    - `npm run test:e2e -- e2e/chat-flow.spec.ts e2e/approval-flow.spec.ts e2e/background-priority.spec.ts --project=desktop-chromium --reporter=line` passed with 4 tests
    - `npm run test:e2e -- e2e/chat-flow.spec.ts e2e/approval-flow.spec.ts e2e/background-priority.spec.ts --project=mobile-chromium --reporter=line` passed with 4 tests
  - `artifacts/issue-186-validation-gates/` remains available for follow-up evidence capture if pre-push validation requests it

## Status / handoff notes

- Status: `locally complete; ready to archive after pre-push validation`
- Active branch: `issue-186-validation-gates`
- Active worktree: `.worktrees/issue-186-validation-gates`
- Notes:
  - Package created from the orchestration run for Issue #186 closure.
  - Maintained UX renewal validation gates doc and focused background-priority Playwright coverage added in the active worktree.
  - Scoped local validation is complete; dedicated pre-push validation is still required before archive, merge, or Issue close.
  - `tsc --noEmit` required `next typegen` first because `tsconfig.json` includes `.next/types/**/*.ts`.
  - No active PR yet.
  - Completion retrospective:
    - Completion boundary: package archive after sprint approval and dedicated pre-push validation.
    - Contract check:
      - Maintained validation source-of-truth document: Satisfied by `docs/validation/codex_webui_ux_renewal_validation_gates_v0_1.md`.
      - Targeted automated validation coverage: Satisfied by `apps/frontend-bff/e2e/background-priority.spec.ts` plus aligned `chat-flow.spec.ts` and `approval-flow.spec.ts`.
      - Local validation evidence: Satisfied by Biome, `tsc`, focused Vitest, and desktop/mobile Playwright runs recorded above.
      - Issue close readiness: Not applicable at package-archive boundary; PR, merge-to-main, cleanup, and GitHub completion tracking remain pending.
    - What worked: keeping the sprint scoped to one maintained validation doc plus one new E2E gate made the missing coverage easy to isolate.
    - Workflow problems: worker result reporting was lost once, so the orchestrator had to recover from worktree state and rerun validation manually.
    - Improvements to adopt: pre-push and sprint prompts for frontend E2E slices should explicitly mention that mobile/desktop locator drift may require aligning older specs before the new test can validate cleanly.
    - Skill candidates or skill updates: consider tightening sprint worker prompts to require a final written validation summary before agent shutdown.
    - Follow-up updates: archive this package, commit/push/open PR, merge to `main`, sync parent checkout, remove worktree, set Project item to `Done`, and close Issue #186.

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate has passed, and the handoff notes are updated.
