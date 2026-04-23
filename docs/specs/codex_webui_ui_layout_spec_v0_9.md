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

The dedicated Home screen is not part of the primary v0.9 UI model. The maintained direction is thread-first: `thread_view` is primary, while navigation, workspace switching, thread lists, resume cues, empty states, notifications, and detail surfaces are supporting surfaces.

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

### 4.0 App shell without Home as a primary screen

The v0.9 app shell must not depend on Home as a primary screen.

Former Home-style responsibilities are assigned as follows:

- workspace identity and workspace selection belong to Navigation and the workspace switcher
- current-workspace thread discovery belongs to the Navigation thread list
- high-priority return discovery belongs to resume cues, blocked cues, badges, filters, priority-aware sort, workspace summaries, and lightweight notifications
- no-content guidance belongs to contextual empty states
- first-use or new-work guidance belongs to the first-input composer state in workspace context

Home may exist later as an optional overview or aggregate, but v0.9 implementation and QA must be able to explain and validate the primary browser UX without it.

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

### 4.5 Empty and no-selection states

Empty states are contextual app-shell states, not a Home substitute.

The UI must define at least:

- no workspace selected: Navigation shows the workspace switcher or workspace-selection prompt, and `thread_view` shows a workspace-selection-oriented start state rather than an empty thread
- selected workspace with no threads: Navigation shows an empty current-workspace thread list and an `Ask Codex` / new-input path
- no thread selected while a workspace is selected: `thread_view` shows the workspace-scoped first-input state or a prompt to choose a thread from Navigation
- first-input / new-input state: the composer is available in workspace context, and a thread begins only after the first input is accepted
- `notLoaded` thread selected: `thread_view` may show a loading, resume, or opening state while the backend establishes App Server thread view
- open-required internal state: backend or facade recovery required to open or resume a thread is absorbed behind the public `thread_view` opening flow and is not exposed as a separate primary screen

These states must preserve the same app-shell responsibilities: Navigation owns discovery and switching, `thread_view` owns conversation start and continuation, and the detail surface remains secondary.

### 4.6 Desktop-first composition and mobile degradation

The normative composition is desktop-first:

- desktop primary state: `[ Navigation ] [ Thread View ]`
- desktop secondary-detail state: `[ Navigation ] [ Thread View ] [ Detail Surface ]`
- mobile primary state: single-column `thread_view` with Navigation and Detail Surface reachable through drawers, sheets, overlays, or full-screen detail

Mobile is a reachability degradation of the same information architecture, not a different screen model.

At mobile width, the UI may hide persistent Navigation and right-side Detail Surface columns, but it must keep workspace selection, thread selection, pending request response, interrupt, composer, and return-to-thread paths reachable within the mobile constraints in the v0.9 requirements.

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

### 5.5 Desktop region ownership

Desktop implementation must use the existing two-state composition as the normative screen model:

- default: `[ Navigation ] [ Thread View ]`
- selected detail open: `[ Navigation ] [ Thread View ] [ Detail Surface ]`

These are region responsibilities, not separate primary pages. The old Home / Chat / Approval primary page separation is explicitly rejected for v0.9 desktop implementation. Former Home-style return and discovery responsibilities belong to Navigation, conversation and intervention belong to Thread View, and expanded inspection belongs to Detail Surface.

Navigation owns:

- current workspace identity and workspace switching
- current-workspace thread discovery
- thread list row summaries
- filters, sort, and priority-aware return order
- lightweight badges for approval, error, failed, active, and similar states when those facts are available
- resume cue and blocked cue display as derived lightweight signals
- cross-workspace high-priority summaries through the workspace switcher, notifications, or equivalent lightweight affordances

Thread View owns:

- thread header
- current activity
- pending request summary and response affordances
- timeline as the main body
- single composer or first-input composer state
- interrupt affordance when available
- no-thread-selected, `notLoaded`, and open-required recovery presentation as thread opening or resume flow

Detail Surface owns selected-item inspection only. It may show request detail, error detail, failure detail, selected timeline item detail, file or diff summaries, and long supporting content. It must not become an always-on activity monitor, a global approval inbox, or the only place where approval, error, failed-turn, resume, or blocked state is discoverable.

### 5.6 Desktop state matrix

The following matrix defines desktop state ownership for implementation. The listed states are user-facing interpretations of native facts, helper aggregates, and recent evidence; they are not new canonical WebUI lifecycle resources.

| Desktop state | Navigation responsibility | Thread View responsibility | Detail Surface responsibility |
| --- | --- | --- | --- |
| waiting on input | Thread row remains selectable and may show no blocking badge; `resume_cue` may emphasize last viewed or recently updated threads according to priority order. | Header identifies the selected thread and workspace. Current activity states that input is accepted or that the thread is idle. Timeline remains visible. Composer is enabled as the normal continuation path. | Closed by default. Opens only if the user selects an existing timeline item, request resolution, file summary, or other detail affordance. |
| in progress | Thread row shows active badge or equivalent lightweight state. Navigation may keep the active thread visible in priority-aware sorting without auto-switching away from another selected thread. | Header remains stable. Current activity summarizes execution, streaming, tool use, or progress. Timeline remains visible and updates in thread order. Composer availability follows native-derived availability; interrupt is visible when supported. | Closed by default. Opens only from user selection of current-activity detail, command/tool detail, timeline item, file summary, or similar detail affordance. |
| waiting on approval | Thread row shows waiting approval badge and blocked cue when available. Resume cue priority follows the requirements-level order, where `waitingOnApproval` is highest priority. Navigation may expose filters or workspace summaries, but must not route the user to a global approval inbox. | Header remains in thread context. Current activity states that approval is required. A pending request summary appears inside `thread_view` with concise risk/summary information, approve/deny response affordances or a path to them, and a path to detail when minimum confirmation information does not fit inline. Timeline remains visible and includes the approval request. Normal composer must not compete with request-response controls. | Opens only when the user selects pending request detail or a targeted notification/badge/detail affordance. Detail may show minimum confirmation information before approve/deny, but response remains thread-scoped request flow rather than a separate Approval screen. |
| system error / failed turn | Thread row shows error or failed badge and blocked cue when available. Resume cue priority emphasizes `systemError` before latest-turn failed, after waiting approval. Navigation may surface the condition through filters, sort, workspace summaries, banners, or toasts without auto-opening detail. | Header remains stable. Current activity summarizes the system error or latest failed turn and the next available recovery action when known. Timeline remains visible and includes the error, failed evidence, or recovery status in chronology. Composer availability follows native-derived recovery/input availability rather than a WebUI-owned failed state. | Closed by default. Opens when the user selects the error item, failed-turn item, current-activity detail, notification, or badge affordance. Detail owns expanded error/failure diagnostics and recovery guidance, but the thread remains selected and visible. |
| `notLoaded` | Thread row remains selectable from Navigation and may carry resume cue emphasis based on persisted summary, updated time, or high-priority helper data when available. Navigation does not expose `notLoaded` as a separate primary destination. | Selecting the row targets `thread_view`. Thread View shows an opening, loading, or resume-in-progress state while the facade establishes the App Server thread view. Timeline may show a loading placeholder until reacquisition succeeds; once loaded, the normal timeline is shown. | Closed by default. The selected detail state is preserved only if still valid after the thread view loads; otherwise the Detail Surface remains closed or empty. |
| open-required recovery | Navigation treats the thread as the same selected or resumable thread and may show lightweight unavailable or retry emphasis only if the public facade cannot complete recovery. It must not expose internal `thread_open_required` as a user-facing screen or resource. | Internal open-required recovery is absorbed by the facade as part of the same `thread_view` opening flow. Thread View may show opening, retrying, temporarily unavailable, or resume guidance according to the public result, but must not require the user to visit Home or a separate recovery page. | Closed by default. Opens only after a user selects available error/recovery detail from Thread View or a targeted notification/badge. Internal helper names such as `thread_open_required` are not shown as the primary user model. |

### 5.7 Desktop ownership details

Thread header belongs to Thread View. It identifies the selected thread, enough workspace context to make action scope clear, and high-level state when that state affects immediate action.

Current activity belongs to Thread View. It is a pinned, derived summary for running, waiting on input, waiting on approval, system error, latest failed turn, opening, or temporarily unavailable conditions. It must be rebuilt from native facts, helper aggregates, and recent evidence rather than stored as standalone canonical state.

Pending request summary belongs to Thread View. It is the default desktop approval intervention surface and must keep response/detail affordances inside `thread_view`. Navigation may advertise that approval is needed, and Detail Surface may inspect expanded confirmation detail, but neither replaces the thread-scoped request flow.

Timeline belongs to Thread View and remains visible for waiting on input, in progress, waiting on approval, system error / failed turn, and loaded recovery states. During `notLoaded` or open-required recovery, Thread View may show an opening placeholder until timeline reacquisition succeeds. Error, failed-turn, approval request, and approval resolution evidence should remain represented in timeline chronology when available.

Composer belongs to Thread View. There is one normal composer path for first input or selected-thread continuation. Request-response controls and interrupt controls may sit near current activity or the composer area, but they are not separate approval or task composers.

Thread list row belongs to Navigation. The row is the compact discovery and return unit for a thread; it carries title, current-activity summary, updated time, badges, and lightweight resume/blocked cues when available.

Badges belong primarily to Navigation and may also appear inside Thread View summaries. They are lightweight state markers, not canonical resources. At minimum, desktop rows must be able to distinguish approval, error, failed, and active situations when those facts are available.

Blocked cue belongs to Navigation and may also be reflected in Thread View current activity. It is a derived display cue for intervention-needed states such as `waitingOnApproval`, `systemError`, or latest failed evidence. It must not be implemented as a standalone canonical resource or required standalone module.

Resume cue belongs to Navigation and lightweight notifications. It is a derived return-priority cue based on native status, active flags, latest failure evidence, last viewed thread, updated time, and workspace context. It must not auto-switch the selected thread by itself and must not require a dedicated standalone resume module.

### 5.8 Desktop image reference status

No desktop layout image is normative unless a maintained source or Issue reference explicitly provides an image asset. A filename mention in an unmaintained `.tmp` draft is not itself a maintained or normative asset. If a desktop layout image is later added, its regions must map to these rules: left region as Navigation, center region as Thread View, and right selected-item region as Detail Surface. Image labels or visual affordances must not override the normative rejection of Home / Chat / Approval primary page separation, the thread-scoped approval flow, or the selection-driven Detail Surface rule.

### 5.9 Mobile deferral for desktop states

Issue #179 defines desktop state ownership only. Mobile remains governed by the existing v0.9 mobile reachability rules in section 6 and the v0.9 requirements. This desktop state matrix must not expand mobile behavior beyond that existing reachability model.

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
- surface resume cues and blocked cues as lightweight badge-based or summary-based priority signals
- expose cross-workspace high-priority discovery without becoming a global inbox

### 7.2 Required navigation elements

Navigation must include:

- current workspace switcher
- `Ask Codex`
- thread-list controls for filtering and sorting
- thread list
- lightweight state badges for at least approval, error, failed, and active situations when those states are available
- resume cue expression for the thread or threads the user should return to
- blocked cue expression when a thread needs intervention or cannot continue normally

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

On reconnect or revisit, desktop Navigation should make the top resume-priority candidates visible or directly reachable according to the requirements-level priority order:

1. thread with `waitingOnApproval`
2. thread with `systemError`
3. thread whose latest turn is `failed`
4. currently active thread
5. last viewed thread
6. most recently updated thread

This is a return path and emphasis rule, not a requirement to automatically navigate away from the last viewed thread.

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

Navigation must not require a dedicated global approval inbox, dedicated global blocked-thread panel, or Home screen to satisfy cross-workspace high-priority discovery.

### 7.9 Navigation empty states

Navigation must define empty states for:

- no workspace selected
- workspace list empty or unavailable
- selected workspace with no threads
- filter returns no matching threads
- all high-priority badges clear

These empty states should guide the next reachable action, such as selecting a workspace, creating a workspace, clearing filters, or using the first-input composer. They must not create empty thread records as a way to fill the list.

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
- pending request summary when a request is pending
- timeline
- pending request affordance when a request is pending
- single composer or equivalent next-input affordance
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

### 9.6 Header and pending request summary

The thread header must identify the selected thread and enough workspace context for the user to understand where actions will apply.

When a request is pending, `thread_view` must present a concise pending request summary inside thread context. The summary must expose the response affordance or a path to the response affordance, and it must provide a path to detail when the minimum confirmation information does not fit inline.

The pending request summary may be pinned or otherwise emphasized while pending, but it must not move approval handling into a separate global approval screen.

### 9.7 Single composer and first-input start

`thread_view` owns one composer path for user input in a workspace or selected thread context.

The UI must not expose multiple competing composers for the same thread. Request-response controls and interrupt controls may appear near the composer or current activity, but they are distinct affordances from the normal next-input composer.

For a new thread, the first-input state is shown before a thread exists. The accepted first input starts the thread, and the resulting thread becomes the selected `thread_view`. Empty thread creation before accepted input is not the primary UX.

### 9.8 No-thread-selected and `notLoaded` opening

When no thread is selected and a workspace is selected, `thread_view` must show either:

- a first-input composer state for starting work in that workspace
- a no-thread-selected state that directs the user to select an existing thread or use `Ask Codex`

When a `notLoaded` thread is selected from Navigation, `thread_view` is still the target surface. The UI may show an opening or resume-in-progress state while the backend performs App Server load / resume work.

Backend states that require opening, loading, or resuming a thread must be absorbed by the facade and presented as part of this `thread_view` opening flow. The UI must not expose an internal open-required state as a standalone primary screen or require the user to visit Home to recover it.

### 9.9 Interrupt affordance

When interruption is available, `thread_view` must show an interrupt affordance in the active thread context.

On mobile, interrupt should be easier to reach than normal composing while a turn is executing. On desktop, it should remain visible in the thread context without forcing the detail surface to open.

### 9.10 Approval resolution visibility

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

The detail surface may be empty or closed when nothing is selected. It opens to inspect a selected thing, not to announce that something happened.

### 11.1.1 Detail content responsibilities

When corresponding source facts are available, the Detail Surface owns expanded inspection for:

- approval or request detail, including minimum confirmation information before approve / deny
- file summaries or changed-file summaries
- diff summaries or deeper diff inspection when supported
- errors, failures, and recovery guidance
- selected timeline item detail
- selected current-activity or context detail
- long command output, tool detail, operation detail, or supporting references that would overload the timeline

The timeline or pending request summary should keep enough context visible that the user understands why the detail exists before opening it.

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

If a notification or badge leads to detail, the user action on that notification or badge is the selection. The event itself must not automatically open Detail Surface.

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

## 13. UX acceptance gates

Implementation and QA must validate the v0.9 UI against these gates:

1. No primary Home dependency: a reviewer can explain workspace selection, thread discovery, return priority, approval attention, and no-content states through Navigation, `thread_view`, Detail Surface, notifications, and empty states without referencing Home as a primary screen.
2. Navigation ownership: current workspace, workspace switching, current-workspace thread discovery, filters, sort, badges, resume cues, blocked cues, cross-workspace high-priority summaries, and Navigation empty states are visible or reachable from Navigation.
3. Thread View ownership: `thread_view` contains the thread header, current activity, pending request summary or affordance, timeline as the main body, single composer, interrupt affordance, no-thread-selected handling, `notLoaded` opening state, and first-input thread start.
4. Single composer / first-input start: one normal composer path exists for a workspace or selected thread context, and a new thread starts only when the first input is accepted.
5. Approval in thread context: pending approval can be noticed, inspected to the minimum confirmation information, and approved or denied without navigating to a dedicated global approval inbox.
6. Detail Surface ownership: approval or request detail, file or diff summaries, errors, and selected timeline or context detail open in a secondary surface by user selection.
7. Selection-driven detail: approval, error, reconnect, and background-priority events may update notifications or badges, but they must not automatically open Detail Surface.
8. Empty-state coverage: no workspace selected, workspace with no threads, no thread selected, first-input / new-input, `notLoaded` opening, and internal open-required recovery are all covered without relying on Home.
9. Desktop-first reconnect return priority: desktop Navigation or equivalent app-shell return cues expose resume candidates according to the requirements-level priority order, while preserving a clear path back to the selected or last viewed thread.
10. Mobile reachability: at mobile width, workspace selection, thread selection, first-input start, pending approval response, interrupt, detail return, and reconnect return remain reachable within the v0.9 mobile requirements.
11. No global approval inbox requirement: the UI may use lightweight cross-workspace discovery, but it must not introduce a dedicated global approval inbox, independent approval resource, or Home dependency as a required intervention path.

---

## 14. Rejected layout patterns

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
- exposing internal open-required recovery as a user-facing primary screen

---

## 15. Normative dependencies outside this document

This specification intentionally depends on other maintained documents for the following guarantees:

- the canonical semantics for `Recommended` sort, including ranking order, workspace scope, and tie-break behavior
- the canonical guarantee range for approval-resolution recovery windows
- any canonical wording or API treatment for resume-priority and intervention-needed helper cues

Until those are fixed elsewhere, layout implementation may support the intended UX direction but must not silently hard-code conflicting canonical semantics.
