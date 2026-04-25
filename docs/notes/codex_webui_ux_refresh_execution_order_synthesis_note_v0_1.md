# Codex WebUI UX Refresh Execution Order Synthesis Note v0.1

Last updated: 2026-04-25

## Purpose

This note records the recommended execution order for the current UX refresh follow-up line so implementation can proceed with the right dependency order after the reviewed plan and GitHub Project updates.

This is sequencing guidance, not a normative contract.

## Inputs

- `.tmp/codex_webui_v0_9_ux_improvement_plan.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- GitHub parent issue `#175`
- GitHub follow-up issues `#198` through `#203`

## Recommended order

### 1. Issue #198

`UX refresh: fix title, sort, request-detail, and recovery source-of-truth boundaries`

Do this first because the remaining slices depend on stable answers for:

- public title exposure
- `Recommended` sort ownership and semantics
- minimum confirmation information versus richer request-detail expansion
- recovery-window expectations for just-resolved request detail

### 2. Issue #199

`BFF: expose thread title and helper fields needed by the UX refresh`

Do this second because the UI slices should not hardcode fallback behavior for fields that belong in the public helper layer.

This issue should make title-first Navigation and header rendering possible without raw-ID-first compromises.

### 3. Issue #200

`UI: refresh timeline rendering and absorb opening/recovery into thread view`

Do this before the rest of the shell polish because it corrects the most visible semantic break:

- raw event log feel
- per-delta assistant rendering
- recovery states escaping the thread-view model

### 4. Issue #201

`UI: redesign Navigation and thread identity for thread-first discovery`

Do this after title/helper exposure is available, because Navigation quality depends on those fields and on stable sort/filter expectations.

### 5. Issue #202

`UI: strengthen thread header, current activity, request card, and detail surface`

Do this after the timeline and Navigation slices because:

- header and current activity should reflect the corrected thread identity model
- request/detail UI should stay inside the helper boundary fixed earlier
- approval/detail polish is easier once the main center-pane chronology is stable

### 6. Issue #203

`Validation: add regression coverage for opening, recovery, request detail, and mobile UX`

Prepare coverage incrementally, but treat final execution of this slice as the last gating step before closing the refresh line.

## Dependency summary

Hard dependencies:

- `#198` before `#199`
- `#198` before any `Recommended` sort UI behavior
- `#199` before final Navigation and header UX
- `#200` before final current-activity and detail-surface polish
- `#200`, `#201`, and `#202` before final validation closeout in `#203`

Allowed overlap:

- `#203` test scaffolding can start while `#200` to `#202` are in flight
- visual polish inside `#201` and `#202` can overlap after semantic behavior is stable

## Practical execution guidance

If the work is done as separate PR slices, prefer this merge order:

1. `#198`
2. `#199`
3. `#200`
4. `#201`
5. `#202`
6. `#203`

If one slice reveals missing contract or helper data, route that gap back to `#198` or `#199` rather than papering over it in the UI.

## Exit interpretation

The UX refresh line should be considered implementation-complete only when:

- the target thread-first shell is reachable on `main`
- opening and recovery remain inside `thread_view`
- Navigation is title-first and return-priority-aware
- request/detail UX stays inside maintained helper boundaries
- regression coverage exists for desktop and mobile-critical states

