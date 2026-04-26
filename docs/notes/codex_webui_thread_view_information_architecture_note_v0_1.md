# Codex WebUI Thread View Information Architecture Note v0.1

Last updated: 2026-04-26

## Purpose

This note captures reusable UI review findings for making the desktop Thread View Timeline-first while keeping lower-frequency details recoverable.

It is a maintained design note, not a normative specification. Promote stable decisions into `docs/specs/codex_webui_ui_layout_spec_v0_9.md` when they become implementation contracts.

## Inspection Source

The review was based on the locally running latest WebUI desktop capture for `workspace01`:

- `artifacts/visual-inspection/workspace01-thread-latest-2026-04-26-wait8s/desktop-chromium-workspace01-thread-latest-wait8s.png`

Observed route:

- `/chat?workspaceId=ws_17daf81ea5774a298734540e1df3f7b2&threadId=019dc8a7-bedd-7ef2-ab96-abe0aa799a50`

Relevant implementation surface:

- `apps/frontend-bff/src/chat-view.tsx`

## Summary Judgment

The current desktop Thread View shows too much always-visible status and metadata around the main work surface.

Timeline is the primary object users need to inspect, but the viewport gives substantial space to:

- uppercase area labels such as `THREAD VIEW`, `NAVIGATION`, `CURRENT THREAD`, and `TIMELINE`
- large thread title/header content
- workspace, stream, thread-count metric chips
- `Current activity`
- `Thread feedback`
- large Navigation thread cards
- a large composer card

The result is that the Timeline starts too low and has too little visible space. The UI should keep Timeline as the center of gravity, remove redundant scaffolding, and move lower-priority status, metadata, and explanatory text into a dedicated details surface.

## Main Display Priority

Thread View should prioritize these always-visible surfaces:

1. Timeline and current thread context
2. immediate required user action, only when the thread needs one
3. compact composer reachability
4. compact thread selection in Navigation

The main pane should not behave like a status dashboard where every runtime and UI state is described in prose. It should behave like a work log with lightweight controls around it.

## Visibility Decision Rules

Use these rules when deciding where information belongs:

- Always visible: information or controls needed to continue work in the current thread.
- Inline alert above Timeline: states that require near-term user attention, such as approval, error, reconnecting, interruption, or a blocked send.
- Thread Details: information users may need to inspect, verify, debug, or audit, but do not need for the normal reading and reply loop.
- Accessible-only label: structural identification that is useful for assistive technology but redundant as visible text.
- Hidden only if recoverable: do not remove information entirely unless it is duplicated, non-actionable, or already available through a clearer surface.

This gives implementation work a stable test: if a visible element does not help the user read Timeline, choose a next action, or send a reply, it should usually move out of the primary viewport.

## Timeline Design Requirements

Removing surrounding noise is only useful if the Timeline becomes a stronger primary surface.

Recommended direction:

- make Timeline begin higher in the initial desktop viewport
- keep event rows dense enough for scanning without collapsing meaningful content by default
- fold long command output, logs, and verbose assistant text behind local expand controls
- keep approval/request events inline where they occurred, with action controls only while action is pending
- preserve latest-event visibility while streaming, but avoid aggressive auto-scroll once the user scrolls away
- provide an obvious return-to-latest affordance when new activity arrives off-screen
- keep timestamps and status annotations compact; use tooltips or Details for full metadata
- visually distinguish user input, assistant output, tool activity, approvals, errors, and system/runtime events without turning each row into a card-heavy dashboard

Timeline should gain both vertical space and semantic clarity. The cleanup work is incomplete if the empty space is merely replaced by other static panels.

## Area Label Redundancy

The current layout labels each area with explicit uppercase section text such as:

- `THREAD VIEW`
- `NAVIGATION`
- `CURRENT THREAD`
- `TIMELINE`

These labels consume vertical space and often restate what the layout already communicates through position, content, and controls.

Recommended direction:

- remove decorative or structural labels when the surrounding UI already identifies the area
- do not show both an area label and a heading that says nearly the same thing
- use accessible labels, `aria-label`, tooltips, and landmarks where semantic identification is needed but visible text would be redundant
- keep visible labels only when they reduce ambiguity for users, such as a compact `Details` title in a drawer or a necessary form label
- prefer direct content headings over container labels; for example, show the selected workspace or thread list controls rather than a standalone `NAVIGATION` label
- make Timeline visually primary through placement and density, not by stacking `CURRENT THREAD` and `TIMELINE` labels above it

The target UI should remove as much explanatory scaffolding as possible while preserving accessibility and discoverability.

## Current Activity Redundancy

`Current activity` is a large card that repeats state already shown elsewhere.

Current behavior:

- the same state is shown in the main header badge
- the same or similar state is shown in the selected Navigation thread card
- `Thread feedback` often repeats the same idle/running/approval meaning

For the inspected idle state, the duplication is especially clear:

- `Current activity`: `Waiting for your input`
- header badge: `Waiting for your input`
- selected thread card: `Waiting for your input`
- `Thread feedback`: `Ready for your next input`

Recommended direction:

- remove the always-visible `Current activity` card from the main pane
- keep a compact status icon or short badge in the compact thread context area
- expose the longer current-activity explanation in Thread Details
- show inline state prose only for exceptional states that require attention, such as approval, error, reconnecting, or interruption

## Thread Feedback Placement

`Thread feedback` is more useful than `Current activity` because it can include next actions:

- `Focus composer`
- `Approve request`
- `Deny request`
- `Request detail`
- `Refresh thread`
- `Interrupt thread`

However, it should not always be a large card in the main flow.

Recommended direction:

- move normal feedback summary into Thread Details
- keep only action-critical feedback inline
- do not show the idle `Ready for your next input` feedback card in the main pane
- for approval, error, reconnecting, or interruptable running states, show a compact inline alert/action row above Timeline
- keep the full feedback title, summary, and secondary actions in Thread Details

## Compact Thread Context

The current header includes a large title and multiple metric chips. Much of this is not needed when Navigation already identifies the selected thread.

Recommended direction:

- make the main thread context compact and Timeline-oriented
- avoid stacking structural labels such as `CURRENT THREAD` and `TIMELINE`
- on desktop with the normal sidebar visible, hide the title or keep only a one-line truncated title if it materially helps orientation
- when Navigation is in minibar mode, on mobile, or after direct URL entry, keep a one-line truncated thread title so the current thread remains identifiable
- move workspace ID, thread ID, updated timestamp, stream state, and thread count into Thread Details
- replace text-heavy status badges with an icon plus accessible label and tooltip
- keep a `Details` icon button in the compact context area so hidden information remains discoverable

The title should be treated as contextual support, not as a large page hero.

## Thread Details Surface

The right place for low-frequency status and metadata is a dedicated Thread Details surface.

Preferred behavior:

- desktop: right drawer or secondary side panel
- mobile: bottom sheet
- entry point: `Details` icon button near the compact thread context and, where useful, from selected Timeline items

Suggested sections:

- Overview: title, workspace name, workspace ID, thread ID, created/updated timestamps
- Status: current activity, stream state, native status, latest turn status, composer availability
- Next action: feedback summary and available secondary actions
- Requests: pending and recently resolved approvals
- Artifacts: files, command output, diffs, and meaningful extracted items
- Debug: raw JSON behind an explicit collapsed debug affordance

Recommended detail behavior:

- open with Overview and any current required action visible first
- keep Debug collapsed by default and clearly separated from user-facing details
- do not let Details become another always-visible dashboard unless the user explicitly opens or pins it
- preserve Timeline scroll position when Details opens or closes

This keeps information available without forcing it into the primary Timeline viewport.

## Navigation Thread Card Density

Navigation should help users choose a thread, not explain the entire thread state.

Current selected-card density includes:

- thread title
- full updated timestamp
- `Selected` badge
- status badge
- repeated status text

For idle states, `Waiting for your input` can appear twice in the same card. This is unnecessary.

Recommended card content:

- status icon
- thread title
- short updated time or relative time
- one short preview or cue only when meaningful
- selected state via left border, background, or check icon rather than a `Selected` text badge

Recommended attention handling:

- idle / waiting input: muted dot or no visible status text
- running: spinner or activity icon
- approval required: warning icon and short `Approval` label
- failed/error: error icon and short `Failed` label
- unread/new activity: small count or dot

Do not repeat long state prose in Navigation cards. Put full state explanation in Thread Details.

## Navigation Sidebar Modes

Navigation should behave as a sidebar with two user-selectable display modes:

- normal sidebar: full workspace controls, filters, and thread cards
- minibar: narrow persistent rail with compact navigation affordances

This supports Timeline-first work without removing navigation. Users who are focused on the current thread can collapse Navigation into a minibar, while users triaging threads can expand it back to the normal sidebar.

Recommended normal sidebar content:

- compact current workspace selector or switcher
- primary `Ask Codex` / new-thread action
- lightweight attention filters
- dense thread list cards

Recommended minibar content:

- expand/collapse control
- compact `Ask Codex` icon
- thread list or attention shortcut icon
- status/attention indicators, such as running, approval, failed, or unread counts
- current workspace affordance when the current workspace is not otherwise visible

Recommended behavior:

- preserve the selected workspace and selected thread across mode switches
- avoid replacing the minibar with nothing; keep a visible way back to Navigation
- make the mode switch keyboard-accessible and screen-reader labeled
- persist the user's preferred sidebar mode locally when appropriate
- on desktop, use the minibar to give Timeline more horizontal space
- on mobile, prefer bottom-sheet or drawer behavior rather than a permanent minibar unless viewport width supports it

The sidebar mode is an information-density control, not a way to hide required workflow access.

## Navigation Filters

The current filters are useful, but they can be lighter.

Recommended direction:

- keep `All` as the default
- hide zero-count badges where possible
- consider icon tabs or compact segmented controls for attention states
- treat `Recent` as optional because the list ordering already communicates recency

The goal is to preserve scanning and triage while reducing the left pane's visual weight.

## Composer Density

The composer remains important, but it should not visually compete with Timeline.

Recommended direction:

- make the composer compact and sticky near the bottom of Thread View
- keep the textarea initial height modest
- expand on focus or when content grows
- avoid making the submit button visually heavier than Timeline content
- keep mode hints short, such as `Continue thread` or `Start new thread`

## Recommended Implementation Order

1. Remove redundant visible area labels such as `THREAD VIEW`, `NAVIGATION`, `CURRENT THREAD`, and duplicate `TIMELINE` scaffolding where layout and controls already communicate the region.
2. Remove the always-visible `Current activity` card.
3. Move normal `Thread feedback` into Thread Details and keep only action-critical feedback inline.
4. Compact the main thread context and move metadata chips into Thread Details.
5. Improve Timeline density and behavior so the reclaimed viewport produces a better reading and action surface.
6. Add a Thread Details drawer or panel with status, metadata, requests, artifacts, and debug sections.
7. Simplify Navigation thread cards around title, short time, status icon, selected affordance, and attention marker.
8. Add normal-sidebar and minibar display modes for Navigation so users can trade thread triage density for Timeline space.
9. Compact the composer so Timeline owns more of the initial viewport.

This order intentionally removes obvious duplication first, then introduces the recoverability surfaces that make the cleanup safe.

## Acceptance Criteria for Follow-up Issues

Use these criteria when splitting this note into implementation Issues:

- Desktop idle Thread View no longer shows the same idle state in multiple prose surfaces.
- Desktop initial viewport gives visibly more space to Timeline than the inspected capture.
- Timeline begins higher in the main pane after redundant labels, status cards, and large header scaffolding are removed.
- Normal idle feedback is available in Thread Details but not shown as a large main-flow card.
- Approval, error, reconnecting, interruption, and blocked-send states still produce visible inline affordances.
- Thread metadata, current activity explanation, feedback summary, request state, artifacts, and debug data remain reachable from Thread Details.
- Desktop normal sidebar can switch to a minibar without losing selected workspace or selected thread context.
- Minibar always provides a visible path back to full Navigation.
- Thread title remains available when it is needed for orientation, especially in minibar mode, mobile layout, or direct URL entry.
- Navigation cards do not repeat long status prose and do not rely on a `Selected` text badge as the primary selected-state indicator.
- Keyboard and screen-reader users can operate Details, sidebar mode switching, and action-critical feedback controls.
- Existing thread selection, message sending, approval, refresh, and interruption workflows continue to work after the layout cleanup.

## Open Design Questions

- Should desktop with normal sidebar visible hide the thread title entirely, or keep a one-line truncated title near the Timeline?
- Which structural labels are still necessary as visible text, and which should become accessible-only labels?
- What minimum controls must remain in the Navigation minibar so users can recover full Navigation without losing context?
- Should the details surface be a persistent side panel, a temporary drawer, or support both?
- Which states deserve an inline alert above Timeline rather than only a status icon plus Details entry?
- Should Navigation filters remain text labels, move to icons, or become a menu when the thread count is small?
- Which Timeline row types should support local expansion in the first implementation slice?
