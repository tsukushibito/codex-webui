# Issue 102 Approval Wait-State Convergence

## Purpose

- Restore browser-visible approval convergence so `waiting_approval` appears in Chat and Approval views without requiring a manual reload.

## Primary issue

- Issue: `#102 https://github.com/tsukushibito/codex-webui/issues/102`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md`
- `docs/specs/codex_webui_public_api_v0_8.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Identify why approval-requested state does not move the browser into `waiting_approval` until reload.
- Fix the live convergence path so Chat status and Approval UI reflect the same approval event without manual refresh.
- Add focused regression coverage for browser-visible approval-requested convergence.

## Exit criteria

- Approval-requested state is reflected in Chat without reload.
- Approval queue/detail and Chat status converge from the same live event path.
- Focused validation covers the approval-requested browser-visible path.

## Work plan

- Inspect the SSE relay, approval event handling, and browser state updates for `approval.requested`.
- Implement the smallest cross-layer fix that keeps Chat and Approval views in sync without reload.
- Add or update focused tests and rerun the touched validation commands.

## Artifacts / evidence

- Validation:
- `cd apps/frontend-bff && npm test`
- `cd apps/frontend-bff && npm test -- --run tests/chat-page-client.test.tsx tests/chat-view.test.tsx`
- `cd apps/frontend-bff && npm test -- --run tests/chat-page-client.test.tsx tests/approval-page-client.test.tsx tests/chat-view.test.tsx tests/approval-view.test.tsx`
- Current implementation candidate stays browser-side in `chat-page-client.tsx` with focused no-reload approval convergence coverage in `tests/chat-page-client.test.tsx`
- Approval-side no-reload convergence is now covered in `tests/approval-page-client.test.tsx`
- Manual validation: DevTunnel browser confirmation showed `waiting_approval` without reload after approval was requested

## Status / handoff notes

- Status: `locally complete`
- Notes: `The current slice keeps the fix browser-side. Chat now applies approval-requested state to both the selected session and the session list without reload, ApprovalPageClient has focused no-reload convergence coverage, and a DevTunnel manual check confirmed waiting_approval is visible without reload. Remaining work for this issue is GitHub completion flow only: archive package, open/merge PR, sync main, cleanup worktree, then close #102.`

## Archive conditions

- Archive this package when the approval wait-state convergence slice is locally complete and the handoff notes are updated.

## Completion retrospective

### Completion boundary

- Issue-close boundary after the implementation slice became merge-ready and manual DevTunnel verification confirmed the approval wait-state behavior.

### Contract check

- Satisfied: when approval is requested, the active session reflects `waiting_approval` without reload, evidenced by the browser-state fix, focused chat regression coverage, and the DevTunnel manual confirmation.
- Satisfied: Approval UI and Chat status converge consistently for the same approval event, evidenced by the Chat state update plus focused `ApprovalPageClient` no-reload convergence coverage.
- Satisfied: focused validation covers the browser-visible approval-requested path, evidenced by targeted chat and approval client tests plus the remote browser confirmation.

### What worked

- The issue stayed bounded by treating the first Chat-side fix as one candidate and then using evaluator feedback to require Approval-side proof before completion.
- Browser-side client tests were enough to prove the second half of the convergence requirement without widening into a runtime change.

### Workflow problems

- The first bounded fix underfit the issue contract because it improved Chat state only; evaluator feedback was needed to pull the Approval-side proof into scope.

### Improvements to adopt

- For UI convergence bugs, phrase the sprint acceptance criteria in terms of every user-visible surface up front so the first implementation pass does not stop at one page.

### Skill candidates or skill updates

- None

### Follow-up updates

- After this issue reaches `main`, resume `#93` and `#63` with the remaining acceptance bookkeeping and any still-open follow-up `#98`.
