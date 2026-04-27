# Codex WebUI Timeline Contextual Request and Expansion Note v0.1

Last updated: 2026-04-27

## Purpose

This note captures focused Timeline and composer-adjacent improvements that should be handled separately from the broader Thread View information architecture cleanup:

- keep approval/request events visibly tied to the message, turn, or operation that caused them
- keep ordinary conversation content readable by default, while folding only secondary verbose payloads when appropriate
- keep routine status, metadata, and composer controls compact so Timeline remains the main reading surface
- use the full desktop viewport, with Navigation or its minibar anchored to the physical left edge

This is a maintained design note, not a normative specification. Promote stable decisions into `docs/specs/codex_webui_ui_layout_spec_v0_9.md` if they become implementation contracts.

## Inspection Source

This note incorporates review feedback from the latest `workspace01` Thread View captures:

- `artifacts/visual-inspection/workspace01-latest-thread-2026-04-27/desktop-chromium-workspace01-latest-thread.png`
- `artifacts/visual-inspection/workspace01-latest-thread-2026-04-27/desktop-chromium-workspace01-latest-thread-timeline-top.png`
- `artifacts/visual-inspection/workspace01-latest-thread-2026-04-27/mobile-chromium-workspace01-latest-thread.png`

## Problem

The inspected Thread View can make an approval/request appear at the top of Timeline or otherwise visually detached from the prompt or operation that caused it.

This makes the request hard to interpret because the user must manually infer:

- which user prompt led to the request
- which assistant action or tool operation is blocked by the request
- whether the request belongs to the currently visible Timeline context
- why approval is being asked for now

The Timeline can also become hard to inspect if normal user or assistant messages are collapsed before the user has read them. Local expansion is useful for long payloads, but it should not hide the primary conversation by default.

The inspected Thread View also spends too much main-column space on routine thread chrome before the user reaches the Timeline or composer:

- a large top status badge such as `Waiting for your input`
- repeated workspace, updated time, stream, and thread-count metadata
- prominent text buttons such as `Refresh` and `Details`
- a form-like `Send input` card with explanatory captions and a full-width text submit button

This chrome is useful when inspecting thread state, but it should not dominate the normal read-and-reply loop.

## Request Event Placement

Approval and request rows should stay in chronological and visual context.

Recommended direction:

- anchor approval/request events near the originating message, turn, assistant action, or tool operation
- do not hoist approval/request rows above unrelated earlier Timeline content just because they are high priority
- keep pending approvals prominent in place, with visible response controls while action is required
- after resolution, leave a compact request-resolution row in the same local Timeline context
- use labels, operation summaries, risk cues, and spacing to make the relationship understandable without heavy connector graphics
- allow a global or header-level attention signal for pending approval, but make that signal navigate back to the in-context Timeline row rather than replacing it

The primary approval surface can be attention-grabbing without breaking the causal chain in the work log.

## Expansion Defaults

Timeline expansion should distinguish primary conversation content from secondary verbose payloads.

Recommended direction:

- keep normal user messages expanded by default
- keep normal assistant messages expanded by default when they are the primary answer or explanation
- do not default-collapse ordinary conversation content before the user has had a chance to inspect it
- allow long command output, logs, raw JSON, stack traces, generated diffs, and other secondary payloads to collapse by default
- when secondary payloads collapse, keep an actionable summary visible, such as command name, exit state, affected file count, first error line, or short output preview
- provide an obvious local expand control with accessible name and keyboard reachability
- preserve the user's per-row expansion choice while they remain in the thread

This keeps the Timeline readable while still protecting the viewport from low-signal bulk output.

## Routine Status and Thread Chrome

Routine thread status should be visible without becoming the first dominant object in the main column.

Recommended direction:

- move ordinary status such as idle, opening, live, or waiting-for-input out of the top of the main column
- show routine status as a small status line near the composer, above the message input, where it explains whether input is accepted or the thread is still opening
- reserve top-of-thread inline alerts for exceptional states that require near-term attention, such as pending approval, failed turn, reconnecting, blocked send, or destructive-risk confirmation
- remove repeated visible metadata directly under the thread title when it is already available from Navigation or a details surface
- replace visible workspace, stream, thread-count, updated-time, refresh, and detail controls with a small overflow or `more actions` icon button near the upper-right of the compact thread context
- present the hidden metadata and secondary actions in a dialog, popover, drawer, or detail surface opened from that overflow button
- keep the overflow button keyboard-accessible, screen-reader labeled, and large enough to operate on touch targets even when visually compact

The main column should use top space for orientation and exceptional action, not for routine diagnostics.

## Desktop Viewport Use

The desktop app shell should use the full browser viewport rather than appearing as a centered, card-like work area.

Recommended direction:

- place Navigation flush against the left edge of the viewport in normal desktop mode
- keep the Navigation minibar flush against the left edge when the sidebar is collapsed
- let Thread View expand into the remaining horizontal space instead of keeping a large outer margin around the whole app
- keep Detail Surface on the right when opened, using remaining width without turning the entire shell into a centered card
- preserve enough internal padding and readable line length inside Timeline rows, but apply that constraint to content regions rather than to the whole app shell
- avoid making desktop look like a mobile-width panel floating inside a larger canvas

The desktop layout should feel like a workbench that owns the screen, while still allowing the Timeline content itself to remain comfortably readable.

## Composer Control Shape

The composer should feel like one compact message input control, not a separate form card with explanatory copy.

Recommended direction:

- remove redundant captions such as `Continue the current thread.` and `Input will continue the selected thread.` from the visible composer
- place the message input field and send action inside one shared input frame, following the common chat-composer pattern
- use an icon-only send button inside the input frame rather than a full-width `Send input` or `Send Message` text button
- expose the send button meaning through tooltip text and an accessible name such as `Send message`
- keep disabled, opening, blocked, and submitting states visible through compact status text, button state, and accessible announcements rather than long explanatory prose
- iconize other obvious controls, such as refresh, details, expand, collapse, close, and more actions, when an established icon exists and the meaning can be supplied by tooltip and accessible name
- keep destructive, approval, or ambiguous actions text-labeled when icon-only presentation would weaken user confidence or safety

This keeps the composer reachable and familiar while preserving the single-composer rule.

## Acceptance Criteria for Follow-up Issues

- Approval/request Timeline rows remain near the originating message, turn, or operation rather than being hoisted above unrelated Timeline content.
- Pending approval remains visually prominent and actionable without losing its local Timeline context.
- Resolved approval remains represented near the originating context in compact form.
- Header, Navigation, or status attention signals for approval route the user to the contextual Timeline row or request detail.
- Normal user and assistant messages are readable by default.
- Collapse affordances do not hide ordinary conversation content by default.
- Long command output, logs, raw JSON, stack traces, generated diffs, and similar secondary payloads may collapse by default only when a useful summary and clear expand control remain visible.
- Keyboard and screen-reader users can discover and operate row expansion controls.
- Routine thread status is not shown as a large top-of-main-column badge in normal idle, opening, or waiting-for-input states.
- A compact status line appears near the composer when it helps explain input availability or thread opening state.
- Workspace, stream, thread-count, updated-time, refresh, and details chrome is not repeated as large visible controls under the thread title; secondary metadata and actions are reachable through a compact overflow or details affordance.
- Desktop layout uses the full viewport: Navigation is aligned to the physical left edge, the collapsed minibar remains at that edge, and Thread View fills the remaining space.
- The composer combines message input and send action in one shared input frame.
- The primary send action is icon-first, with tooltip text and an accessible name rather than a large text button.
- Icon-only controls are used for obvious secondary actions where they improve density without reducing accessibility or safety.

## Open Design Questions

- What row types should be eligible for default collapse in the first implementation slice?
- What length threshold should trigger default collapse for secondary payloads?
- Should very long assistant answers ever default-collapse, or should they remain expanded with in-row navigation aids?
- How should the UI show that an approval row belongs to a specific prompt, assistant action, or tool operation without adding visual clutter?
- Should approval attention signals scroll to the Timeline row, open request detail, or do both depending on viewport size?
- Which routine status facts should remain in the compact composer-adjacent status line, and which should move entirely behind the overflow/details surface?
- Should the overflow affordance open a lightweight popover on desktop and a bottom sheet on mobile, or should it always route to the existing Detail Surface?
