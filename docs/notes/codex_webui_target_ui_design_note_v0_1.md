# Codex WebUI Target UI Design Note v0.1

Last updated: 2026-04-25

## Purpose

This note captures the current target UI reference for the v0.9 UX refresh so later implementation and review sessions can align on one shared browser-facing outcome.

This note is a maintained design reference, not a normative specification. The normative behavior and ownership rules remain in:

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`

## Reference status

The visual source for this note is the user-provided chat attachment from 2026-04-25 that depicts a desktop shell plus a mobile companion view for `Codex WebUI v0.9`.

The same image is now preserved in the repository as a tracked reference asset:

- `artifacts/visual-inspection/2026-04-24T23-29-37Z-spec-ideal-ui/codex-webui-spec-ideal-screen.png`

This note preserves the reusable implementation-facing decomposition of that visual target.

## Primary composition

The target desktop composition is:

```text
[ Navigation ] [ Thread View ] [ Detail Surface ]
```

The target mobile composition is:

```text
[ Thread View ]
  + top title context
  + inline approval summary
  + timeline
  + bottom composer
  + tabs or affordances for Threads / Details reachability
```

## Desktop region breakdown

### Navigation

The left rail is a compact but information-dense thread discovery surface.

Expected visible elements:

- current workspace switcher
- primary `Ask Codex` action
- lightweight thread filters such as `All`, `Active`, `Waiting approval`, `Errors`, and `Recent`
- thread list with title-first rows
- relative update time
- status badge per row
- current activity summary per row
- selected thread emphasis
- current user account area at the bottom

The target visual treatment is app-shell oriented rather than dashboard-card oriented.

### Thread View

The center pane is the dominant work surface.

Expected visible elements:

- selected thread title as the main heading
- workspace and scope breadcrumb under the title
- inline `Interrupt` action near the thread heading
- pinned current activity summary with step/progress context
- pinned approval/request card above the timeline when action is required
- user-facing timeline rows rather than raw event cards
- one composer at the bottom for thread start or continuation

The target timeline shows conversation and execution chronology together:

- `You`
- `Codex`
- `Plan`
- `Tool call`
- `Command`
- `File changes`
- `Approval requested`
- request resolution and continued execution

### Detail Surface

The right pane is a secondary inspection surface.

Expected visible elements:

- request detail header and close affordance
- risk classification
- operation / reason / requested metadata
- thread and turn context
- change summary metrics
- changed file list
- compact diff preview
- action to open the diff in the editor

This pane is visually secondary but dense enough to support approval and error inspection without leaving the thread context.

## Mobile breakdown

The target mobile surface preserves the same information architecture rather than introducing a different screen model.

Expected visible elements:

- thread title and workspace context at the top
- pending approval summary above timeline content when present
- approve / deny actions reachable without leaving the thread
- timeline rows using the same role hierarchy as desktop
- bottom composer fixed near the viewport edge
- bottom affordance for `Threads` and `Details`

The mobile target is not a condensed approval inbox. It is still thread-first.

## Visual direction

The reference visual implies the following design direction:

- warm off-white background rather than flat white
- border-led panels with restrained shadow
- dark teal as the primary accent
- orange for approval and high-priority emphasis
- red reserved for destructive or deny affordances
- green for positive completion or approve actions
- dense but not cramped spacing
- desktop application feel rather than marketing page feel

## Non-goals implied by the target

The target should not regress into:

- Home as the primary screen
- raw event log presentation
- thread rows dominated by opaque IDs
- automatic detail opening on high-priority events
- standalone approval-inbox dependency
- separate thread-start and continuation composers

## Implementation reading guide

When using this note during implementation, interpret the target in this order:

1. maintained requirements and specs define behavior
2. this note defines the intended visual and structural outcome
3. `.tmp/codex_webui_v0_9_ux_improvement_plan.md` defines the current reviewed execution framing
