# Issue 304 Readable Width

## Purpose

- Constrain the Thread View reading surface on wide desktop viewports while preserving the full-screen workbench layout.

## Primary issue

- Issue: [#304 UI: constrain Thread View readable width on wide screens](https://github.com/tsukushibito/codex-webui/issues/304)

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/notes/codex_webui_timeline_contextual_request_and_expansion_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Define and apply a maximum readable width for Thread View timeline, request, empty/opening, and composer surfaces.
- Center the readable Thread View column only when the available desktop area exceeds the maximum width.
- Preserve Navigation placement, Detail Surface behavior, full-height layout, and mobile/narrow desktop behavior.
- Add focused tests or visual evidence covering wide desktop, normal desktop, and mobile widths.

## Exit criteria

- Wide desktop Thread View content stops growing beyond the chosen readable max width and has balanced horizontal margins.
- Timeline rows, request rows, running/live rows, empty/opening states, and composer align to the same constrained column.
- Navigation remains flush to the viewport edge and Detail Surface remains usable when open.
- Mobile and narrow desktop layouts avoid unnecessary margins, overlap, clipping, and horizontal overflow.
- Targeted validation and visual evidence for the affected frontend surfaces are recorded.

## Work plan

- Inspect current Thread View layout structure and CSS ownership for timeline, composer, empty, and details-adjacent states.
- Introduce a shared readable-column wrapper or CSS constraint using existing component boundaries.
- Update affected styles so the constraint applies consistently across selected-thread and first-input states.
- Add or update automated checks where practical, then capture desktop/mobile visual evidence.
- Run frontend lint/type/test checks appropriate for the changed files.

## Artifacts / evidence

- Visual evidence:
  - `artifacts/visual-inspection/issue-304-readable-width/desktop-wide-readable-column.png`
  - `artifacts/visual-inspection/issue-304-readable-width/desktop-wide-detail-surface.png`
  - `artifacts/visual-inspection/issue-304-readable-width/desktop-normal-readable-column.png`
  - `artifacts/visual-inspection/issue-304-readable-width/mobile-readable-column.png`
- Sprint validation:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `npm test`
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test e2e/issue-304-readable-width.spec.ts --project=desktop-chromium --reporter=line`
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test e2e/issue-304-readable-width.spec.ts --project=mobile-chromium --reporter=line`

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-304-readable-width`
- Active worktree: `.worktrees/issue-304-readable-width`
- Notes: Implemented a shared `960px` Thread View readable column and focused Playwright coverage for wide desktop, detail-open desktop, normal desktop, and mobile layouts. Completion retrospective: package archive boundary is satisfied; Issue close is not yet satisfied until the branch is committed, pushed, merged to `main`, parent checkout is synced, worktree cleanup is complete, and Project/Issue completion tracking is updated. Workflow note: external Playwright URL validation is sensitive to dev-server ownership; when rerunning browser gates, record whether the validator should reuse a live URL or allow Playwright to own the full stack.

## Archive conditions

- Archive this package after the exit criteria are met, dedicated pre-push validation passes, completion retrospective is recorded, and handoff notes point to the final validation evidence.
