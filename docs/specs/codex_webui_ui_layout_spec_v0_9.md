# Codex WebUI UI layout specification v0.9

## 1. Purpose

This document defines the normative UI layout and interaction structure for Codex WebUI v0.9.

Its goals are:

- fix the primary screen and navigation model for desktop and smartphone browsers
- keep the UI aligned with the v0.9 native-first and thin-facade direction
- define how `thread_view`, `timeline`, `workspace`, request flow, and detail surfaces are arranged on screen
- define how users discover approval, error, and resume-priority situations without introducing a dedicated WebUI-owned state machine
- make layout decisions explicit without overstepping into API-shape or component-implementation details

This specification is written for MVP. It defines the UI structure that later frontend implementation and lower-level API/view-model work must satisfy.

---

## 2. Document priority and scope

### 2.1 Priority order

When documents disagree, use this order:

1. `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
2. `docs/specs/codex_webui_common_spec_v0_9.md`
3. this specification
4. `docs/specs/codex_webui_public_api_v0_9.md`
5. `docs/specs/codex_webui_internal_api_v0_9.md`

This document is subordinate to the v0.9 requirements and common specification. It must not redefine App Server-native state or introduce a competing WebUI-owned lifecycle model.

### 2.2 Scope

This specification applies to:

- desktop and mobile screen composition
- primary and secondary UI surfaces
- navigation structure for workspace and thread discovery
- thread-view composition
- approval and request-flow presentation inside thread context
- notification and detail-surface interaction rules

### 2.3 Out of scope

This specification does not define:

- public or internal API payload schemas
- exact component hierarchy or React implementation details
- exact CSS breakpoints, spacing scales, or token values
- final iconography, copywriting, or visual styling system
- canonical API semantics for sort ranking or recovery retention where those must be fixed in requirements or API specifications

---

## 3. Core UI direction

### 3.1 Primary conversation unit

The primary conversation unit is `thread`.

UI layout must treat `thread_view` as the main user-facing screen for observing, intervening in, and continuing a single thread.

### 3.2 Main body of the primary screen

The main body of `thread_view` must be the `timeline`.

The UI must not split conversation, execution, approval, and error visibility across multiple primary screens when the same thread context can represent them coherently.

### 3.3 Approval remains request flow

Approval must be presented as thread-scoped request flow.

The layout must not assume a dedicated global approval screen or approval inbox as the primary path for intervention.

### 3.4 First input starts the thread

The canonical start of a new thread in the UI is the first accepted user input in a workspace context.

The layout must not foreground empty-thread creation as the primary conversation-start concept.

### 3.5 Secondary detail surface

Detailed inspection must be handled by a secondary detail surface rather than by replacing the primary thread context.

The detail surface is secondary by definition. It exists to inspect selected content while preserving thread context.

### 3.6 Notification and detail are separate

The UI must separate notification from detailed inspection.

Approval, error, and other high-priority situations must first be made noticeable through lightweight signals such as badges, inline cards, banners, toasts, or current-activity updates. The UI must not rely on automatic detail-surface opening as the primary notification method.

### 3.7 Navigation centers on thread discovery

Navigation must center on thread discovery and return flow, not on a permanently expanded workspace tree.

Workspace is operationally important, but the navigation primary surface is the thread list within the current workspace context.

---

## 4. Information architecture

### 4.1 Primary surface

The primary surface is `thread_view`.

At minimum, this surface must allow the user to understand:

- which thread is open
- what is happening now
- whether approval, failure, or error needs attention
- what action is currently available
- whether normal input is accepted

### 4.2 Secondary surface

The secondary surface is the detail surface.

It may show selected-item details such as:

- request detail
- error detail
- diff summary
- selected timeline item detail
- long command or context content
- supporting turn or item references

### 4.3 Priority discovery

The UI must let users discover high-priority threads without introducing dedicated canonical UI resources for `resume_cue` or `blocked_cue`.

Those cues may be expressed through:

- thread badges
- current-activity summaries
- filters
- default sort behavior
- lightweight notifications
- workspace-level priority summaries

### 4.4 Workspace visibility

Workspace must be visible as the current operating context, but it must not dominate the main navigation layout.

The normal navigation state should show the current workspace and its thread list. Full workspace choice should appear only when the user opens the workspace switcher.

---

## 5. Desktop layout

### 5.1 Base composition

The default desktop composition is:

`[ Navigation ] [ Thread View ]`

### 5.2 Detail-open composition

When secondary detail is open, the default desktop composition is:

`[ Navigation ] [ Thread View ] [ Detail Surface ]`

### 5.3 Desktop detail-surface behavior

On desktop, the detail surface must:

- appear on the right side
- remain secondary rather than becoming a permanent third primary column
- open only when needed
- prefer a non-overlay side panel when width is sufficient
- be allowed to degrade to a right-side overlay or side sheet when width is insufficient

### 5.4 Desktop rationale

The desktop layout must preserve side-by-side reading of the timeline and selected detail without forcing thread-context loss or separate screen navigation.

---

## 6. Mobile layout

### 6.1 Base composition

The default mobile composition is a single-column `thread_view`.

Navigation must open as a drawer, sheet, or equivalent overlay. Mobile must not attempt to preserve a desktop-style right detail column.

### 6.2 Mobile detail-surface behavior

On mobile, detail must be presented as an overlay detail surface.

Two forms are allowed:

- sheet-style detail for lighter detail payloads such as short request summaries, short error summaries, diff summaries, or item supplements
- full-screen detail for heavier payloads such as long approval detail, long command or context content, long error detail, or future deeper diff inspection

### 6.3 Mobile interaction priority

Mobile UI should keep one dominant action path visible at a time.

At minimum:

- when request response is pending, request-response actions should be more prominent than normal composing
- when a turn is executing, interrupt should be more prominent than normal composing
- when full-screen detail is open, a stable return path to `thread_view` must remain obvious
- background high-priority changes must remain discoverable without requiring the user to open navigation first

---

## 7. Navigation model

### 7.1 Role of navigation

Navigation is a thread-list view in the current workspace context.

Its main responsibilities are:

- show the current workspace
- open workspace selection when requested
- provide the `Ask Codex` entrypoint
- list threads
- support filter and sort controls
- surface lightweight badge-based or summary-based priority signals

### 7.2 Required navigation elements

Navigation must include:

- current workspace switcher
- `Ask Codex`
- thread-list controls for filtering and sorting
- thread list
- lightweight state badges for at least approval, error, failed, and active situations when those states are available

### 7.3 Workspace switcher

The workspace switcher is the compact control that shows the current workspace and opens workspace selection on user action.

The workspace switcher must not be implemented as a permanently expanded workspace tree by default.

When opened, the workspace list must support:

- viewing available workspaces
- selecting a workspace
- starting workspace creation
- optionally prioritizing recent workspaces
- showing a lightweight per-workspace high-priority summary

The high-priority summary should expose at least one of:

- count of high-priority threads in the workspace
- top-priority reason such as waiting approval, system error, or latest-turn failure

### 7.4 Workspace switcher presentation

Allowed workspace switcher presentation:

- desktop: popover, dropdown, or lightweight side sheet
- mobile: sheet, drawer, or full-screen list

### 7.5 Thread-list filters

Navigation should provide direct filters expressed in concrete user-facing state language.

Examples include:

- `All`
- `Active`
- `Waiting approval`
- `Errors / Failed`
- `Recent`

Abstract labels such as `Blocked` should not be the only primary entrypoint when more concrete labels are available.

### 7.6 Thread-list sort

Navigation should provide a default priority-aware sort such as `Recommended`, plus explicit recency or alpha alternatives.

The UI may treat `Recommended` as the default return-priority ordering, but the canonical ranking semantics, tie-break rules, and scope boundaries must be fixed in requirements or API specifications rather than invented only in layout implementation.

### 7.7 Thread-list row summary

Each thread row should show at least:

- thread title
- short current-activity summary
- badge or equivalent lightweight status marker
- time information equivalent to `updated_at`

The current workspace name may be omitted when the list is already scoped to one workspace.

### 7.8 Cross-workspace priority discovery

The main thread list may remain scoped to the current workspace.

However, the UI must still provide a path to discover high-priority threads in other workspaces through lightweight signals such as:

- workspace-switcher priority summaries
- banner or toast navigation
- other non-canonical notification surfaces

---

## 8. `Ask Codex` semantics

### 8.1 Meaning

`Ask Codex` is the entrypoint for sending the first input in a workspace context.

It is not the primary concept for creating an empty thread.

### 8.2 Expected behavior

When the user invokes `Ask Codex`:

- if no workspace is selected, the UI should first guide workspace selection
- if a workspace is already selected, the UI should open the new-input composer in that workspace context
- the thread should begin when the first input is accepted

The main UX must not create empty threads in the list before the first accepted input.

---

## 9. Thread view composition

### 9.1 Required structure

`thread_view` must include at least:

- thread header
- current activity
- timeline
- pending request affordance when a request is pending
- composer or equivalent next-input affordance
- interrupt affordance when interruption is available

### 9.2 Timeline as the main body

The timeline must remain the main body of the thread view.

It should make thread-scoped chronology understandable across user messages, assistant output, request flow, error states, and state transitions.

### 9.3 Minimum timeline visibility

The timeline must represent at least:

- user messages
- assistant messages
- approval requests
- approval resolutions
- errors
- status changes when surfaced to the user

### 9.4 Optional richer timeline visibility

When available, the timeline may also surface:

- progress summaries
- command execution
- file changes
- tool calls
- plans
- reviews

### 9.5 Current activity

Current activity should appear as a pinned summary near the top of the thread view.

It is derived from native facts and recent thread evidence. It is not independent canonical state.

### 9.6 Approval resolution visibility

After approval is resolved, the UI should preserve a visible timeline representation of that resolution rather than removing the event entirely from thread context.

That representation should allow the user to understand that the request was resolved and, during the supported recovery period, re-open request detail if that capability is still available.

---

## 10. Approval and request-flow presentation

### 10.1 Primary handling model

Approval must be handled inside thread context.

The main UX must not require users to leave the thread and navigate to a dedicated global approval page to respond.

### 10.2 Pending approval visibility

While approval is pending, `thread_view` must make the following visible:

- that a pending request exists
- concise risk or seriousness information when available
- a short summary
- a path to open detail
- a path to approve or deny

### 10.3 Resolved approval visibility

After approval is resolved, the pending card itself need not remain pinned.

Instead, the UI should leave a thread-scoped resolution representation in the timeline that communicates:

- whether the request was approved or denied
- a short summary
- whether request detail can still be revisited

### 10.4 Request detail expectations

When request detail is available before response, and during any supported post-resolution recovery period, the UI should be able to show at least:

- risk classification when available
- action summary
- reason
- operation summary
- request time
- target thread
- target turn, item, or equivalent identifying context

If post-resolution detail is supported, decision and response time should also be shown when available.

### 10.5 Recovery-window dependency

The UI layout assumes a post-resolution recovery window may exist for reopening recently resolved request detail from thread context.

However, the guarantee scope for that recovery window, including reload or reconnect expectations, must be fixed outside this layout specification in requirements or API specifications.

---

## 11. Detail-surface behavior

### 11.1 Detail surface as a secondary view

The detail surface is a secondary view for selected content.

It is not a replacement primary screen, and it is not a permanently open inspector by requirement.

### 11.2 Open triggers

The detail surface should open from user-driven selection such as:

- selecting a timeline item
- selecting a pending request affordance
- selecting an approval-resolution item
- selecting an error item
- selecting a diff-summary affordance
- selecting a current-activity detail affordance
- selecting a notification or badge affordance that targets detail

### 11.3 Non-triggers

The detail surface must not open automatically only because:

- a thread was opened
- an approval request appeared
- an error occurred
- a background thread became high priority

### 11.4 Selection-driven rule

The governing interaction rule is:

- detail opens selection-driven
- detail does not open event-driven

---

## 12. Notifications and background priority

### 12.1 Notification channels

The UI should use lightweight notification channels for awareness, such as:

- badges
- inline cards
- banners
- toasts
- current-activity updates
- navigation list updates

### 12.2 Background high-priority threads

When a non-visible thread becomes high priority, such as waiting approval, system error, or latest-turn failure, the UI should make that state discoverable without automatically forcing the user into detail.

### 12.3 Relationship to navigation

High-priority discovery should rely on a combination of:

- badge updates
- current-activity or summary updates
- filters
- default sort behavior
- banner or toast navigation
- workspace-switcher priority summaries

The UI must not require a dedicated global inbox or dedicated canonical blocked-thread panel to satisfy this behavior.

---

## 13. Rejected layout patterns

The following patterns are not the intended v0.9 layout direction:

- a three-primary-screen model centered on separate Home, Chat, and Approval screens
- separate primary surfaces for message content and execution activity within the same thread
- a dedicated global approval inbox as the required main intervention path
- a permanently fixed three-column layout
- a permanently expanded workspace tree as the main left navigation model
- a turn-first information architecture that displaces thread as the primary unit
- treating `Ask Codex` primarily as empty-thread creation
- automatic opening of the detail surface on approval or error events
- requiring standalone dedicated UI modules for `resume_cue` or `blocked_cue`

---

## 14. Normative dependencies outside this document

This specification intentionally depends on other maintained documents for the following guarantees:

- the canonical semantics for `Recommended` sort, including ranking order, workspace scope, and tie-break behavior
- the canonical guarantee range for approval-resolution recovery windows
- any canonical wording or API treatment for resume-priority and intervention-needed helper cues

Until those are fixed elsewhere, layout implementation may support the intended UX direction but must not silently hard-code conflicting canonical semantics.
