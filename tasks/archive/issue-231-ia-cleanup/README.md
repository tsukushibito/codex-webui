# Issue #231 IA Cleanup

## Purpose

Make the selected desktop Thread View Timeline-first by removing redundant visible scaffolding and duplicate idle/status surfaces from the primary viewport.

## Primary issue

- https://github.com/tsukushibito/codex-webui/issues/231

## Source docs

- `docs/notes/codex_webui_thread_view_information_architecture_note_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/validation/codex_webui_ux_renewal_validation_gates_v0_1.md`

## Scope for this package

- Remove or demote redundant visible area labels in the selected Thread View.
- Remove the always-visible `Current activity` card from the main pane.
- Remove normal idle `Thread feedback` from the main-flow card stack while keeping action-critical feedback visible.
- Compact the main thread context and move low-frequency metadata out of the primary viewport.
- Land the maintained Thread View IA note rewrite that created this issue line.

## Exit criteria

- Desktop idle Thread View no longer shows the same idle state in multiple prose surfaces.
- Timeline begins higher in the main pane after redundant labels, status cards, and large header scaffolding are removed.
- Normal idle feedback is not shown as a large main-flow card.
- Action-critical approval, error, reconnecting, interruption, and blocked-send feedback remains visible.
- Focused tests and `apps/frontend-bff` checks pass.

## Work plan

1. Inspect the current `chat-view` component structure and tests.
2. Remove redundant visible labels and duplicate idle/status surfaces with accessible labels where needed.
3. Compact the selected-thread context without breaking no-thread and first-input states.
4. Update or add focused coverage for idle duplication and action-critical feedback.
5. Run targeted validation and prepare for the pre-push gate.

## Artifacts / evidence

- Sprint evaluator verdict: approved.
- Dedicated pre-push validation: passed.
- Validation evidence:
  - `npm run check`: passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `npm test -- tests/chat-view.test.tsx tests/chat-page-client.test.tsx`: 31 tests passed.
  - `npm run test:e2e -- e2e/chat-flow.spec.ts e2e/chat-flow.runtime.spec.ts e2e/approval-flow.spec.ts e2e/background-priority.spec.ts e2e/issue-222-approval-resolution-followup.spec.ts --project=desktop-chromium --reporter=line`: 7 tests passed.
  - `npm run test:e2e -- e2e/chat-flow.spec.ts e2e/approval-flow.spec.ts e2e/background-priority.spec.ts --project=mobile-chromium --reporter=line`: 4 tests passed.

## Status / handoff notes

- Active worktree: `.worktrees/issue-231-ia-cleanup`
- Active branch: `issue-231-ia-cleanup`
- Active PR: None yet.
- Completion boundary: package archive and PR handoff.
- Contract check:
  - Redundant visible scaffolding removed from Thread View, Navigation, and Timeline areas while retaining named regions.
  - `Current activity` card removed from the primary pane.
  - Idle `Thread feedback` hidden from the main flow.
  - Action-critical feedback remains inline for approval, running, reconnecting, and recovery states.
- Retrospective:
  - What worked: evaluator caught missing browser evidence before publish; rerunning focused E2E after fixing worktree symlinks provided full desktop/mobile coverage.
  - Workflow problems: worktree-local `apps/codex-runtime/node_modules` symlink initially pointed at the wrong relative path, blocking Playwright startup.
  - Improvements to adopt: when creating app worktrees, verify both frontend and runtime `node_modules` symlinks resolve before starting Playwright.
  - Skill candidates or skill updates: consider tightening `codex-webui-work-packages` symlink guidance with a quick `test -e` check for app-local tooling.
  - Follow-up updates: no docs or skill updates required for this package beyond the maintained IA note already included.

## Archive conditions

- Sprint implementation is approved.
- Dedicated pre-push validation passes.
- Package notes include validation evidence.
- Package is moved to `tasks/archive/issue-231-ia-cleanup/` before final Project completion tracking.
