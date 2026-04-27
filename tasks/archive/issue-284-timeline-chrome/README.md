# Issue 284: Timeline Chrome and Contextual Request Flow

## Purpose

Implement the Thread View UI improvements from the maintained Timeline contextual request and expansion note so Timeline remains readable, request flow stays contextual, and routine chrome stays compact.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/284

## Source docs

- `docs/notes/codex_webui_timeline_contextual_request_and_expansion_note_v0_1.md`
- `docs/notes/codex_webui_thread_view_information_architecture_note_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Keep approval/request Timeline rows in chronological context near the originating work where the current display model permits it.
- Keep normal user and primary assistant messages readable by default while preserving collapse behavior for secondary verbose payloads.
- Compact routine Thread View status and metadata chrome so it no longer dominates the top of the main column.
- Move secondary metadata/actions behind existing details or compact affordances where practical.
- Replace the form-like composer card with a shared input frame and icon-first send action.
- Preserve desktop and mobile usability with focused automated and visual evidence.

## Exit criteria

- Issue #284 acceptance criteria are satisfied or any intentionally deferred gap is linked from the Issue before close.
- Focused frontend checks pass for the touched UI/model surfaces.
- Desktop and mobile visual inspection evidence is captured after implementation.
- Dedicated pre-push validation passes before archive or merge-oriented handoff.

## Work plan

- Inspect current `chat-view` and `timeline-display-model` behavior against the maintained note.
- Implement the smallest coherent UI/model slice that satisfies the Issue acceptance criteria.
- Add or update focused tests for request placement, expansion defaults, compact chrome, composer behavior, and accessibility labels.
- Capture desktop and mobile visual evidence.
- Run local validation, then hand off to dedicated pre-push validation.

## Artifacts / evidence

- Planned visual evidence: `artifacts/visual-inspection/issue-284-timeline-chrome/`
- Planned validation: frontend `npm run check`, TypeScript check, focused Vitest/Playwright coverage, and targeted visual inspection.
- 2026-04-27 sprint slice `Timeline expansion defaults` validation from `.worktrees/issue-284-timeline-chrome/apps/frontend-bff`:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `node ./node_modules/vitest/vitest.mjs run tests/timeline-display-model.test.ts tests/chat-view-timeline.test.tsx tests/chat-view.test.tsx`
- Evidence summary:
  - long `message.user*` and primary `message.assistant*` rows now remain expanded by default
  - long secondary operational payload rows such as `tool.output` remain eligible for default folding with local expand/collapse controls
  - approval/request rows remain non-fold-eligible by default so pending and resolved request context stays visible in Timeline
- 2026-04-27 sprint slice `Routine top chrome and metadata compaction` validation from `.worktrees/issue-284-timeline-chrome/apps/frontend-bff`:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `node ./node_modules/vitest/vitest.mjs run tests/chat-view.test.tsx tests/chat-page-client.test.tsx tests/chat-view-details.test.tsx tests/chat-view-timeline.test.tsx tests/timeline-display-model.test.ts`
- 2026-04-27 sprint slice `Contextual request placement in Thread View Timeline` validation from `.worktrees/issue-284-timeline-chrome/apps/frontend-bff`:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `node ./node_modules/vitest/vitest.mjs run tests/timeline-display-model.test.ts tests/chat-view-timeline.test.tsx tests/chat-view.test.tsx tests/chat-view-details.test.tsx`
- 2026-04-27 sprint slice `Full-width shell and integrated composer` validation from `.worktrees/issue-284-timeline-chrome/apps/frontend-bff`:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `node ./node_modules/vitest/vitest.mjs run tests/chat-view.test.tsx tests/chat-page-client.test.tsx tests/chat-view-navigation.test.tsx tests/chat-view-timeline.test.tsx tests/timeline-display-model.test.ts`
- Visual evidence:
  - `artifacts/visual-inspection/issue-284-timeline-chrome/desktop-chromium-workspace01-latest-thread-wait10s.png`
  - `artifacts/visual-inspection/issue-284-timeline-chrome/mobile-chromium-workspace01-latest-thread-wait10s.png`
  - `artifacts/visual-inspection/issue-284-timeline-chrome/desktop-chromium-contextual-pending-request.png`
  - `artifacts/visual-inspection/issue-284-timeline-chrome/mobile-chromium-contextual-pending-request.png`
  - `artifacts/visual-inspection/issue-284-timeline-chrome/desktop-chromium-contextual-resolved-request.png`
  - `artifacts/visual-inspection/issue-284-timeline-chrome/mobile-chromium-contextual-resolved-request.png`
  - `artifacts/visual-inspection/issue-284-timeline-chrome/contextual-request-manifest.json`
  - `artifacts/visual-inspection/issue-284-timeline-chrome/desktop-sidebar-normal.png`
  - `artifacts/visual-inspection/issue-284-timeline-chrome/desktop-sidebar-minibar.png`
  - `artifacts/visual-inspection/issue-284-timeline-chrome/mobile-thread-view.png`
  - `artifacts/visual-inspection/issue-284-timeline-chrome/issue-284-full-width-manifest.json`
- Visual summary:
  - desktop selected Thread View no longer shows the routine workspace/stream/thread-count metric chips in the main header
  - desktop Timeline content starts in the initial viewport under a compact thread context row
  - mobile selected Thread View remains readable with no observed overlap between thread header, Timeline rows, drawer controls, and composer
  - desktop normal sidebar and collapsed minibar both sit flush against the physical left viewport edge, with Thread View expanding across the remaining width instead of a centered outer shell
  - desktop composer now renders as one shared frame with the textarea and trailing icon-first send action inside the same control
  - mobile Thread View kept the `Threads` footer action reachable, preserved the icon-only send control inside the shared composer frame, and showed no horizontal overflow in the captured selected-thread state
- Contextual request placement evidence summary:
  - pending request rows now carry request identity metadata from timeline items or stream payloads so Thread View can match contextual rows by `request_id`, `item_id`, or `turn_id`
  - when a matching row exists, approve, deny, and request-detail controls render inside that Timeline row and the old top pending-request card is suppressed
  - when no matching row exists, Thread View keeps a compact fallback request summary above the Timeline so request actions remain reachable
  - latest resolved requests can render as contextual Timeline rows with resolved-state badges and request-detail affordance, without approve or deny controls
  - focused tests cover matching metadata extraction, pending-row controls, fallback summary rendering, resolved-row rendering, and chronology preservation relative to earlier Timeline content
  - refreshed desktop and mobile Playwright route-mock screenshots cover contextual pending and resolved request rows with matching `request_id`, `turn_id`, and `item_id`; no fallback request card was observed in the matched-row states
  - full-width shell evidence used a dedicated worktree-local frontend dev server on `127.0.0.1:3010` plus Playwright route mocks for a deterministic selected-thread state
  - focused tests now assert the icon-first primary send control by accessible name (`Start thread` / `Send message`) rather than visible button text, while preserving empty-draft disablement and post-submit draft clearing

## Status / handoff notes

- Status: `completed - ready to archive`
- Notes:
  - Active package created with branch `issue-284-timeline-chrome` and worktree `.worktrees/issue-284-timeline-chrome`.
  - Completed sprint slice: Timeline expansion defaults.
  - Completed sprint slice: routine top chrome and metadata compaction.
  - Completed sprint slice: contextual request placement in Thread View Timeline.
  - Completed sprint slice: full-width shell and integrated composer.
  - Dedicated pre-push validation passed with `npm run check`, TypeScript, focused Vitest, and `git diff --check`.
  - Completion retrospective at the package-archive boundary: Issue #284 package scope is locally complete and covered by evaluator approvals, pre-push validation, and desktop/mobile visual evidence; final Issue close still requires the PR to reach `main`, branch/worktree cleanup, Project `Done`, and clean synced local state.
  - What worked: splitting the issue into timeline defaults, chrome compaction, contextual requests, and final shell/composer slices kept each evaluator gate concrete.
  - Workflow problems: stale frontend dev-server visual evidence initially made contextual request screenshots misleading; this was corrected by restarting on a fresh port and logging the anomaly.
  - Improvements to adopt: when visual evidence depends on recently changed frontend source, use a fresh worktree-local dev-server port or explicitly restart before capture.
  - Skill candidates or updates: no new skill needed; the visual-inspection skill or runbook could note the fresh-port restart pattern for stale Next.js dev-server evidence.

## Archive conditions

- Archive this package after the exit criteria are met, pre-push validation passes, retrospective notes are recorded, and the package is ready for PR/merge handoff.
