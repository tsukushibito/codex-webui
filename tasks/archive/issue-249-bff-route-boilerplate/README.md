# issue-249-bff-route-boilerplate

## Purpose

Reduce duplicated BFF route mechanics around runtime calls, JSON passthrough, SSE relay errors, and retired route responses while keeping endpoint-specific behavior explicit.

## Primary issue

- GitHub Issue: #249

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Identify repeated route-level passthrough, retired-response, and SSE error mechanics in `apps/frontend-bff/app/api/v1/**/route.ts` and BFF helper modules.
- Extract concrete helpers only where duplication is mechanical.
- Preserve public URLs, response status codes, error payload shapes, SSE event behavior, and endpoint-specific mapping logic.

## Exit criteria

- Duplicated passthrough/retired/SSE helper code is reduced.
- Route files remain simple and explicit.
- BFF checks, TypeScript, targeted route tests, and pre-push validation pass, allowing the known baseline UI test drift only when reproduced on `main`.

## Work plan

1. Map duplicated route mechanics and existing helper boundaries.
2. Let the sprint planner define a bounded refactor slice.
3. Implement the approved route-helper extraction from this worktree.
4. Run BFF validation and evaluator review.
5. Run dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint 1 extracted `mapRuntimeJsonResult` in `apps/frontend-bff/src/handlers/shared.ts` and applied it to request-helper handlers in `apps/frontend-bff/src/handlers/requests.ts`.
- Sprint 1 evaluator verdict: approved. Request route paths, methods, body reading, mapper calls, and active error mappings remain explicit.
- Sprint 2 added shared retired route handlers in `apps/frontend-bff/src/retired-routes.ts` and replaced duplicated retired route `GET`/`POST` wrappers with direct exports.
- Sprint 2 evaluator verdict: approved. Retired route 410 payloads and stream route config exports are preserved.
- Validation evidence before pre-push:
  - `cd apps/frontend-bff && npm run check`: pass.
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: pass.
  - `cd apps/frontend-bff && npm test -- tests/routes.test.ts`: pass, 22 tests.
  - `cd apps/frontend-bff && npm test`: only known baseline drift remains in `tests/chat-page-client.test.tsx`, two assertions expecting `Selected`.
  - `cd apps/frontend-bff && npm run build`: pass.
  - `git diff --check`: pass.
- Dedicated pre-push validation evidence:
  - `git status --short --branch`: dirty only from this package/code slice.
  - `cd apps/frontend-bff && npm run check`: pass.
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: pass.
  - `cd apps/frontend-bff && npm test -- tests/routes.test.ts`: pass.
  - `cd apps/frontend-bff && npm test`: only known baseline drift remains in `tests/chat-page-client.test.tsx`, two assertions expecting `Selected`.
  - `cd apps/frontend-bff && npm run build`: pass.
  - `rg` checks confirm retired route wrappers no longer call `retiredLegacyRouteResponse` from route files and request helpers flow through `mapRuntimeJsonResult`.
  - `git diff --check`: pass.

## Status / handoff notes

- Status: locally complete; ready for archive and PR follow-through.
- Active branch: `issue-249-bff-route-boilerplate`.
- Active worktree: `.worktrees/issue-249-bff-route-boilerplate`.
- Completion tracking, PR merge, worktree cleanup, Project `Done`, and Issue close remain pending.
- Completion retrospective:
  - Completion boundary: package archive before PR publication.
  - Contract check: passthrough, retired response wrapper, and route behavior validation conditions are satisfied by the helper extraction, retired route direct exports, route tests, and build evidence above.
  - What worked: splitting runtime JSON passthrough and retired route wrapper cleanup into two small slices kept endpoint behavior reviewable.
  - Workflow problems: full `npm test` remains blocked by the known `Selected` UI baseline drift outside this Issue.
  - Improvements to adopt: continue using focused `rg` checks for mechanical refactor acceptance.
  - Skill candidates or skill updates: none.
  - Follow-up updates: publish PR, merge to `main`, remove the worktree, clear Issue execution links, set Project status to `Done`, and close #249.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Package is moved to `tasks/archive/issue-249-bff-route-boilerplate/` before PR completion tracking.
