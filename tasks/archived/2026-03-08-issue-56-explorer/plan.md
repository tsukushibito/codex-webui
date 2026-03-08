# Issue 56 Implementation Plan

TDD: no
Reason: the task is mainly visual and structural. The meaningful validation is component behavior checks plus Playwright screenshots.

## Steps
1. Add workspace helpers for flattening changed file entries from the existing tree.
2. Refactor `WorkspaceTree` to render a `Changed` section followed by a compact explorer tree.
3. Update explorer CSS to use dense row styling and subdued compact status markers.
4. Update frontend tests for the revised explorer semantics if needed.
5. Validate with `npm run check`, frontend tests, and Playwright desktop/mobile captures.
