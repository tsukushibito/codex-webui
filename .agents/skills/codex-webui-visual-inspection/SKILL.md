---
name: codex-webui-visual-inspection
description: Capture and inspect `codex-webui` browser UI screenshots with Playwright for Codex-led frontend work. Use when implementing or reviewing visual UI changes, checking desktop/mobile layout, comparing before/after screenshots, or collecting visual evidence under `artifacts/visual-inspection/`.
---

# Codex WebUI Visual Inspection

## Overview

Use this skill when Codex needs to see and evaluate the `codex-webui` browser UI, especially during frontend polish, responsive layout work, or visual regression checks.

This skill standardizes screenshot capture and review. It does not replace functional E2E tests, sprint evaluation, or pre-push validation.

## Build Context

Read these before changing or inspecting the frontend:

- `README.md`
- `AGENTS.md`
- `apps/frontend-bff/README.md`
- `apps/frontend-bff/playwright.config.ts`

If the visual change belongs to a specific app area, read the nearest relevant `README.md` before editing.

## Standard Workflow

1. Identify the UI state, route, viewport, and before/after need.
2. Start the app stack if no usable `PLAYWRIGHT_BASE_URL` is already running.
3. Capture screenshots with `scripts/capture-ui-screenshots.mjs`.
4. Open the captured PNGs with `view_image`.
5. Inspect layout, spacing, alignment, typography scale, overflow, text clipping, stacking, and mobile behavior.
6. Make scoped UI changes only after reading the relevant frontend files.
7. Capture the same screenshots again and compare before/after.
8. Run the relevant frontend validation commands before declaring the UI work complete.

Default capture command from the repo root:

```bash
node .agents/skills/codex-webui-visual-inspection/scripts/capture-ui-screenshots.mjs
```

Useful options:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 \
  node .agents/skills/codex-webui-visual-inspection/scripts/capture-ui-screenshots.mjs \
  --route / \
  --route /sessions/example=thread-example \
  --out artifacts/visual-inspection/manual-pass
```

The script writes PNGs and `manifest.json` under `artifacts/visual-inspection/<timestamp>/` by default.

## Capture Expectations

Capture at least:

- desktop Chromium viewport
- mobile Chromium viewport
- the route or state directly affected by the change

For UI work that changes flows, capture the important states, not only the landing route. Examples include:

- empty or initial home state
- active chat/thread state
- assistant streaming or pending state
- approval wait state
- error or disconnected state
- narrow mobile layout

If a state requires scripted user actions, prefer adding a focused Playwright helper or temporary local capture script over hand-clicking in a headed browser.

## Visual Review Checklist

Review screenshots for:

- text clipped, wrapped awkwardly, or too small for its container
- controls that resize or shift when labels, badges, hover states, or loading text changes
- overlapping panels, sticky bars, dialogs, or mobile safe-area issues
- weak hierarchy in dense operational views
- one-note color palettes or decorative treatments that distract from work-focused UI
- desktop/mobile inconsistencies that change meaning or block common workflows

Use concrete observations tied to screenshot filenames. Avoid vague visual judgments without evidence.

## Validation

For frontend UI edits under `apps/frontend-bff`, normally run:

```bash
npm run check
node ./node_modules/typescript/bin/tsc --noEmit --pretty false
npm test
```

Run from `apps/frontend-bff`. Add `npm run test:e2e` when the change affects user flows, responsive behavior covered by E2E tests, or Playwright helpers.

## Guardrails

- Do not treat screenshots as a substitute for functional tests.
- Do not keep visual evidence outside `artifacts/visual-inspection/`.
- Do not commit generated screenshots unless the user explicitly asks.
- Do not make broad design-system rewrites for a narrow visual issue.
- Do not inspect only desktop when mobile behavior is user-facing.
- Do not claim visual verification without opening the generated images.
