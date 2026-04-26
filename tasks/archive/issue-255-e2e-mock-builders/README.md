# issue-255-e2e-mock-builders

## Purpose

Consolidate Playwright browser mock fixtures and common thread/request interaction setup so E2E scenarios can reuse builders instead of copying large JSON structures.

## Primary issue

- GitHub Issue: #255

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `apps/frontend-bff/README.md`
- `tasks/README.md`

## Scope for this package

- Identify a bounded E2E fixture/helper consolidation slice.
- Introduce focused builders for common workspace, thread, timeline, pending request, or notification mock shapes where they remove real duplication.
- Keep scenario specs readable and avoid production behavior changes.
- Preserve existing E2E behavior and validation commands.

## Exit criteria

- At least one duplicated E2E fixture area uses reusable builders rather than copied large JSON structures.
- Existing affected E2E specs pass or any environment-only blocker is documented with equivalent targeted evidence.
- Evaluator review and dedicated pre-push validation pass before archive/PR follow-through.

## Work plan

1. Map the current `e2e/helpers/browser-mocks.ts` and specs that duplicate thread/request/notification shapes.
2. Let the sprint planner choose one bounded helper consolidation slice.
3. Implement the approved helper/builder extraction and update affected specs.
4. Run targeted E2E or focused validation plus full BFF checks.
5. Run evaluator review and dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint planner chose a bounded helper consolidation slice: add shared E2E fixture builders in `apps/frontend-bff/e2e/helpers/browser-mocks.ts` and refactor only `apps/frontend-bff/e2e/background-priority.spec.ts`.
- Implementation exported `fulfillJson` and added shallow builders:
  - `mockWorkspaceFixture`
  - `mockThreadSummaryFixture`
  - `mockThreadListItemFixture`
  - `mockThreadViewFixture`
  - `mockTimelineItemFixture`
  - `mockApprovalRequestFixture`
  - `mockApprovalRequestDetailFixture`
- `background-priority.spec.ts` now uses the builders for workspace, primary/background thread list items, thread views, timeline items, pending request, and request detail while preserving `thread_001`, `thread_background`, `req_background`, timestamps, labels, statuses, `reason`, `operation_summary`, `decision_options`, and `context.environment`.
- Worker validation passed:
  - `cd apps/frontend-bff && npm run check`
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
- Default Playwright startup was blocked by an existing process on `127.0.0.1:3001`. The main orchestrator ran the targeted E2E on an isolated manual stack with runtime `127.0.0.1:3101` and BFF `127.0.0.1:3100`, then stopped both servers:
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:e2e -- background-priority.spec.ts --reporter=line` passed 2 tests.
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:e2e -- approval-flow.spec.ts chat-flow.spec.ts --reporter=line` passed 6 tests.
- Sprint evaluator verdict: approved. No findings.
- Dedicated pre-push validation passed:
  - `git diff --check`
  - changed-file and helper marker checks
  - `cd apps/frontend-bff && npm run check`
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `cd apps/frontend-bff && npm test`
  - `cd apps/frontend-bff && npm run build`

## Status / handoff notes

- Status: locally complete; archived after evaluator approval and dedicated pre-push validation.
- Active branch: `issue-255-e2e-mock-builders`.
- Active worktree: `.worktrees/issue-255-e2e-mock-builders`.
- PR merge, worktree cleanup, Project `Done`, and Issue close remain pending.

## Completion retrospective

### Completion boundary

Package archive boundary for #255. Issue close remains gated on PR merge to `main`, synced clean parent checkout, worktree cleanup, and GitHub Project update.

### Contract check

- Satisfied: a duplicated E2E fixture area now uses reusable builders rather than copied large JSON structures.
- Satisfied: existing E2E behavior for the affected scenario and helper compatibility specs passed on an isolated alternate-port stack.
- Satisfied: production behavior was not changed; the implementation diff is limited to E2E helper/spec files plus package tracking.

### What worked

Keeping the builder extraction focused on one local mock flow avoided a broad E2E harness rewrite while still creating reusable public-shape factories.

### Workflow problems

Default Playwright ports remained occupied, so E2E validation had to use a manual alternate-port runtime/BFF stack.

### Improvements to adopt

When default Playwright startup is blocked by occupied ports, record both the blocked default command and the alternate stack URLs used for validation.

### Skill candidates or skill updates

None.

### Follow-up updates

Future E2E additions should prefer the new `browser-mocks.ts` builders for workspace, thread, timeline, and approval request shapes instead of copying full response JSON.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Completion retrospective is recorded.
- Package is moved to `tasks/archive/issue-255-e2e-mock-builders/` before PR completion tracking.
