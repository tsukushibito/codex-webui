# Codex WebUI Current UI Gap Analysis Note v0.1

Last updated: 2026-04-26

## Purpose

This note captures reusable UX gap analysis for the current `frontend-bff` thread UI against the maintained v0.9 thread-first target.

It is a maintained design note, not a normative specification. The target behavior and layout ownership remain in:

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/notes/codex_webui_target_ui_design_note_v0_1.md`

## Inspection Sources

Visual inspection was performed against the locally running app on `http://127.0.0.1:3000`.

Captured evidence:

- `artifacts/visual-inspection/ui-gap-analysis/desktop-chromium-chat.png`
- `artifacts/visual-inspection/ui-gap-analysis/mobile-chromium-chat.png`
- `artifacts/visual-inspection/ui-gap-analysis-selected-thread/desktop-chromium-selected-thread.png`
- `artifacts/visual-inspection/ui-gap-analysis-selected-thread/mobile-chromium-selected-thread.png`

Relevant implementation surfaces:

- `apps/frontend-bff/src/chat-view.tsx`
- `apps/frontend-bff/src/chat-page-client.tsx`
- `apps/frontend-bff/src/timeline-display-model.ts`
- `apps/frontend-bff/app/globals.css`

## Summary Judgment

The current UI has the v0.9 data surfaces wired together, but the browser experience still reads like a low-density form-oriented admin prototype rather than the target thread-first coding assistant.

The largest gaps are structural:

- the main timeline is not yet a useful work chronology
- new-thread creation is not a first-class action once a thread is selected
- the composer is placed as a form at the bottom of the document instead of as a persistent continuation affordance
- mobile layout scales the desktop form language instead of preserving dense thread context
- detail inspection is technically available, but it is surfaced through repetitive generic buttons and raw JSON rather than useful task-specific summaries

## Current Thread Creation Gap

The implementation can start a new thread only when `selectedThreadId` is `null`.

Once a user selects an existing thread in a workspace, the single composer switches from `Start thread` to `Send input`. The left navigation lists existing threads, but it does not provide a clear `+ Ask Codex` or `New thread` action that returns the selected state to workspace-only thread creation.

Observed impact:

- a workspace with existing threads can show a start-thread screen when opened without `threadId`
- after selecting a thread, the visible path back to new-thread creation is weak or absent
- users may need to manipulate the URL to remove `threadId`, which is not an acceptable primary workflow

Implementation references:

- `apps/frontend-bff/src/chat-view.tsx` derives `isStartingThread` from `selectedThreadId === null`
- `apps/frontend-bff/src/chat-page-client.tsx` sends follow-up input when `selectedThreadId` is present and starts a thread only when it is absent

Expected direction:

- add a first-class navigation action for starting a new thread in the current workspace
- make that action clear on both desktop and mobile
- keep the action distinct from selecting existing thread rows

## Timeline Quality Gaps

Timeline is correctly the main body by specification, but the current display model exposes too much event plumbing.

Observed in the selected-thread screenshots:

- repeated `Status update` rows with `thread status changed`
- repeated `Codex` rows whose content is only `assistant streaming`
- every stored timeline item shows a full-width `Timeline item detail` button
- timeline rows read as independent cards rather than one coherent execution chronology
- useful completion content is buried after many low-value status and streaming rows

Likely causes in the current implementation:

- `timeline-display-model.ts` treats stored `message.assistant.delta` timeline items as primary assistant rows instead of folding them into the final assistant message
- status events are rendered as visible rows even when they do not add user-facing state change value
- `chat-view.tsx` renders the same generic detail affordance for every `timelineItemId`
- density classification is event-kind based, not task-meaning based

Expected direction:

- collapse assistant deltas into one assistant message per logical item or turn
- demote routine status transitions into compact separators, inline metadata, or hidden implementation events
- reserve visible detail affordances for items with meaningful expanded content
- make timeline rows role-specific: user, assistant, plan, tool call, command, file changes, approval, approval resolution, error, and recovery

## Detail Surface Gaps

The detail surface exists, but its entry points and content are not yet aligned with the target approval and inspection workflow.

Observed gaps:

- detail is hidden until a generic row button is clicked
- generic timeline detail opens raw payload JSON, which is useful for debugging but not for primary UX
- request detail has a better shape, but the visual hierarchy is still far from the target right-side inspection pane with risk, operation, file changes, and diff preview
- desktop only expands to the third pane when a detail selection exists, so the shell does not consistently communicate that inspection is part of the work surface

Expected direction:

- use the detail surface for meaningful selected-item inspection, not raw event dumps
- make approval, error, failed turn, command output, file changes, and diff summaries the main detail use cases
- keep raw JSON behind an explicit debug affordance if needed

## Composer and Continuation Gaps

The current composer is structurally a form card after the timeline.

Observed gaps:

- on long selected-thread timelines, the composer is pushed far below the active context
- on mobile, the user must scroll through many low-value rows before reaching `Send input`
- the large textarea and full-width submit button dominate start-thread screens
- the composer label changes between `Ask Codex` and `Send input`, but the surrounding UI does not make the mode switch obvious enough

Expected direction:

- keep the composer persistently reachable at the bottom of Thread View
- preserve one composer for start and continuation, but make the mode explicit through thread selection and navigation state
- avoid making start-thread and continuation flows feel like separate form pages

## Navigation Gaps

The navigation pane contains workspace switching and a thread list, but it does not yet match the target thread discovery surface.

Observed gaps:

- no primary `Ask Codex` or `New thread` action in Navigation
- no visible thread filters such as all, active, waiting approval, errors, or recent
- thread rows are low-density and expose opaque thread refs
- active state uses heavy warm accent treatment that competes with status meaning
- workspace creation and workspace switching occupy valuable thread navigation space

Expected direction:

- make current workspace selection compact
- add a clear new-thread action at the top
- add thread filters and status counts when data is available
- make thread rows title-first, with relative time, activity summary, and compact status badge

## Current Activity Gaps

The current activity card is present but too shallow.

Observed gaps:

- idle and waiting states render as large badges plus generic prose
- running state lacks the target-style step/progress representation in the inspected state
- the card does not visually anchor what Codex is doing now relative to timeline and composer

Expected direction:

- represent running progress, current step, blocked reason, or next expected user action
- keep the card compact enough that timeline remains the main body
- use it as a pinned summary, not as another large status card

## Approval and Request Flow Gaps

The inspected local data did not include a pending approval state, but the current component structure still shows likely gaps against the target.

Implementation observations:

- pending request summary and request detail are separate component regions
- request detail can open a mobile bottom sheet
- approval actions exist, but the broader page still uses the same form-like visual language as non-approval states

Expected direction:

- pending approval should be the most prominent inline card in Thread View while the thread is blocked
- approve and deny should be visible without leaving thread context
- detail should provide minimum confirmation information before response when the inline card cannot fit it
- resolution should remain visible in the timeline after response

## Mobile Gaps

The mobile UI is the largest visible mismatch from the target.

Observed in mobile screenshots:

- typography, badges, and buttons are too large for a dense operational tool
- metric chips consume multiple rows near the top
- the timeline displays only a few low-value items per viewport
- `Timeline item detail` buttons dominate each row
- the composer is at the bottom of long document flow rather than a reachable bottom affordance
- `Threads` is a large top button, while the target uses compact mobile reachability patterns

Expected direction:

- reduce mobile typographic scale and pill/button footprint
- keep approval summary, timeline, and composer reachable within the same thread context
- use compact bottom navigation or affordances for Threads and Details
- remove repeated per-row detail buttons unless they carry meaningful item-specific action

## Visual Language Gaps

The current visual language is too dominated by beige, brown-orange accents, large rounded pills, and form cards.

Observed gaps:

- the page reads as a beige dashboard rather than a precise coding assistant
- state colors are not cleanly reserved for operational meaning
- large rounded chips and buttons create a soft consumer-app feel
- important work artifacts such as commands, file paths, tests, diffs, and request IDs are not visually foregrounded

Expected direction:

- use warm off-white and restrained borders as background structure
- reserve orange for approval/high-priority, red for destructive/error, green for success/approve, and teal for primary action/identity
- reduce decorative pill usage
- foreground concrete coding artifacts in timeline and detail surfaces

## Interaction Feedback and Recovery Gaps

Beyond the visible layout gaps, the current experience can still feel uncertain during normal coding-assistant use because user actions, background progress, and recovery paths are not explicit enough.

High-impact gaps:

- after submitting input, the UI does not clearly distinguish accepted input, thread start or turn creation, stream connection, running work, and completion
- timeline scroll behavior is not defined for thread open, send, live streaming, approval appearance, or reconnect recovery
- thread titles and summaries are not yet strong enough to make Navigation a reliable return surface without reading opaque IDs or opening each thread
- background thread updates do not yet show a rich unread or new-activity model that distinguishes completed work, waiting approval, failure, and ordinary updates
- error, failed-turn, reconnect, and open-recovery states need clearer next actions such as retry, reopen, inspect detail, or resend where supported
- desktop keyboard affordances such as submit, focus composer, close detail, and move through thread rows are not yet treated as part of the primary workflow
- approval inline summaries need the minimum confirmation set before response: operation, target, risk, and consequence, with detail used for deeper inspection rather than as a required first stop
- concrete coding artifacts such as commands, file paths, tests, diffs, request IDs, issue or PR links, and generated outputs are not extracted into scannable affordances

Expected direction:

- model post-submit feedback as a short visible state progression, not a single generic status message
- define scroll anchoring rules that keep latest activity reachable without stealing position from users reading older context
- improve thread title, activity summary, unread markers, and background update cues before relying on users to inspect every thread manually
- make failed and degraded states action-oriented so the next recovery step is visible in the same thread context
- add keyboard support for the high-frequency desktop path once the main layout is stable
- treat coding artifacts as first-class timeline and detail content instead of leaving them embedded in prose or raw JSON

## Highest-Impact Fix Order

The next UX work should prioritize structural interaction problems before minor color polish.

Recommended order:

1. Add a first-class `Ask Codex` / first-input action in Navigation and mobile Threads surface.
2. Collapse noisy timeline events into meaningful work rows.
3. Make the composer persistently reachable for both start and continuation.
4. Add clearer post-submit, running, reconnecting, and completion feedback.
5. Define scroll anchoring rules for open, send, stream, approval, and recovery flows.
6. Improve thread title, activity summary, unread, and background-update cues in Navigation.
7. Replace generic per-row `Timeline item detail` buttons with contextual detail affordances.
8. Rework mobile density and bottom reachability around thread, details, and composer.
9. Improve current activity progress and blocked-state presentation.
10. Make failure and recovery states action-oriented.
11. Extract commands, files, tests, diffs, request IDs, and links as first-class artifacts.
12. Add desktop keyboard affordances for frequent actions.
13. Refine visual language after the information hierarchy is closer to target.

## Deferred Validation Need

This note is based on local visual inspection and source reading. Before closing any implementation issue that addresses these gaps, capture desktop and mobile screenshots for:

- workspace with no selected thread but existing thread list
- selected idle thread with completed assistant response
- running thread with streaming assistant output
- pending approval with detail opened
- post-approval resolution
- mobile selected thread with composer reachability
