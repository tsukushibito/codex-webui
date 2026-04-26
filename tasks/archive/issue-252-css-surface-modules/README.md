# issue-252-css-surface-modules

## Purpose

Organize `apps/frontend-bff/app/globals.css` around actual thread-first UI surfaces instead of one accumulated stylesheet.

## Primary issue

- GitHub Issue: #252

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Reorganize the global stylesheet into surface-owned sections or modules that fit the current Next.js setup.
- Preserve existing class names and visual behavior unless a local cleanup is required by the reorganization.
- Keep app shell, navigation, timeline, details, request, composer, and responsive rules easy to locate.
- Add focused architecture or visual-regression coverage appropriate to the CSS ownership change.

## Exit criteria

- Style ownership is clear for app shell, navigation, timeline, details, request, and composer rules.
- Existing desktop and mobile thread-first layouts remain visually stable.
- Targeted checks, full BFF validation, evaluator review, and dedicated pre-push validation pass.

## Work plan

1. Map current `globals.css` selectors to UI surfaces and responsive regions.
2. Let the sprint planner choose a bounded CSS organization slice.
3. Implement the approved stylesheet structure without changing public class contracts unnecessarily.
4. Run targeted frontend checks and any required visual/E2E evidence.
5. Run evaluator review and dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint planner chose a bounded stylesheet-organization slice: keep the existing `globals.css` entrypoint, add in-file surface ownership comments, and avoid CSS imports, partials, CSS Modules, selector renames, or visual redesign.
- Worker implementation changed `apps/frontend-bff/app/globals.css` only for implementation. The CSS diff adds ownership comments for foundation/shared primitives, app shell, navigation, thread view, request/feedback, timeline, composer, detail surface, utilities, mobile responsive rules, and desktop responsive rules.
- Visual evidence captured under `artifacts/visual-inspection/issue-252-css-surface-modules/`:
  - `desktop-selected-thread-navigation.png`
  - `desktop-selected-thread-detail-surface.png`
  - `mobile-selected-thread.png`
  - `mobile-pending-request-detail.png`
  - `mobile-first-input-composer-reachability.png`
- Worker validation passed:
  - `cd apps/frontend-bff && npm run check`
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `cd apps/frontend-bff && npm test`
  - `cd apps/frontend-bff && npm run build`
- Targeted E2E note: targeted run on both the existing external stack and an isolated manual stack at runtime `127.0.0.1:3101` plus BFF `127.0.0.1:3100` produced 11 passes and 3 failures, all in `issue-215-first-input-composer.spec.ts`. The evaluator judged these failures out of scope for #252 because the implementation diff is CSS comments only and the failures are locator/button availability drift, not stylesheet behavior.
- Sprint evaluator verdict: approved. No findings.
- Dedicated pre-push validation passed:
  - `git diff --check`
  - `git diff --numstat apps/frontend-bff/app/globals.css` reported `31 0`
  - `git diff -U0 -- apps/frontend-bff/app/globals.css | rg '^[+-][^+-]'` showed only CSS comment additions
  - `cd apps/frontend-bff && npm run check`
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `cd apps/frontend-bff && npm test`
  - `cd apps/frontend-bff && npm run build`
  - `rg -n 'import "\./globals\.css"' apps/frontend-bff/app/layout.tsx`
  - visual evidence file presence check

## Status / handoff notes

- Status: locally complete; archived after evaluator approval and dedicated pre-push validation.
- Active branch: `issue-252-css-surface-modules`.
- Active worktree: `.worktrees/issue-252-css-surface-modules`.
- PR merge, worktree cleanup, Project `Done`, and Issue close remain pending.

## Completion retrospective

### Completion boundary

Package archive boundary for #252. Issue close remains gated on PR merge to `main`, synced clean parent checkout, worktree cleanup, and GitHub Project update.

### Contract check

- Satisfied: style ownership is clearer for app shell, navigation, thread view, timeline, request/feedback, composer, detail surface, utilities, and responsive rules through explicit `globals.css` section comments.
- Satisfied: desktop and mobile thread-first layouts remain stable by construction because the implementation diff is comment-only; visual evidence covers the requested key states.
- Satisfied: root global CSS import remains unchanged and no new CSS entrypoints or modules were introduced.

### What worked

Keeping the sprint as comment-only organization avoided cascade risk while still improving maintainability of the current global stylesheet.

### Workflow problems

The targeted `issue-215-first-input-composer` E2E suite has existing locator/button expectation drift that fails even on an isolated alternate-port stack. That drift is outside #252 but should be handled by the upcoming E2E/test refactor issues.

### Improvements to adopt

For comment-only CSS organization slices, include a diff-level validation that changed CSS lines are comments only. This made the out-of-scope E2E drift easy to classify.

### Skill candidates or skill updates

None.

### Follow-up updates

Use #254 or #255 to address the `issue-215-first-input-composer` E2E drift instead of hiding it inside CSS work. After PR merge for #252, clear active execution fields, remove the worktree, move Project status to `Done`, and close #252 only after `main` is clean and synced.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Completion retrospective is recorded.
- Package is moved to `tasks/archive/issue-252-css-surface-modules/` before PR completion tracking.
