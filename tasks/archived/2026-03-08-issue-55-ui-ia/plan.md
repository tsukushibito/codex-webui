# Issue 55 Implementation Plan

TDD: no
Reason: this is primarily a visual and structural UI change. Automated tests and Playwright screenshots are the right validation, but writing tests first would not materially reduce the layout-design uncertainty.

## Steps
1. Update shared pane types and mobile pane tabs for `Chat`, `Actions`, `Inspect`.
2. Refactor `Shell` to introduce:
   - topbar status emphasis
   - action queue section
   - context-switched inspect panel
   - mobile pane routing that no longer mirrors the desktop layout
3. Add/adjust CSS for the new structure and reduce empty persistent panels.
4. Update frontend tests to match the new interaction model.
5. Run `npm run check`, `npm run test:frontend`, and Playwright captures on desktop/mobile.
