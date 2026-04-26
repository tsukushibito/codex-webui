# Codex WebUI shared contract strategy v0.1

Last updated: 2026-04-26

## 1. Purpose

This document records the near-term shared-contract strategy for reducing drift between `codex-runtime`, `frontend-bff`, and tests during the v0.9 cutover.

The strategy is intentionally narrow. It chooses how the repo should protect active contracts now without introducing package ownership, build, or lockfile changes before those boundaries are stable.

## 2. Current constraints

- `apps/codex-runtime` and `apps/frontend-bff` are separate Node.js/TypeScript packages.
- The repo does not currently have a root workspace package, root `package.json`, or `packages/` directory.
- Runtime domain projections and BFF runtime-client/public mapping types overlap, especially for thread, request, timeline, and workspace shapes.
- The maintained semantic contracts live in the v0.9 internal and public API specifications.
- Both app packages already use Zod, so executable boundary schemas can be added locally without new dependency or workspace churn.

## 3. Alternatives considered

### 3.1 Root shared package

A root `packages/contracts` package would make shared imports explicit, but it requires workspace ownership, dependency wiring, package manager decisions, and lockfile changes. That is too much surface area for the current refactor slice.

### 3.2 Generated contracts

Generated TypeScript or schema artifacts could eventually reduce drift, but a generator needs a stable source format, generated-file policy, and validation ownership. Those decisions are not yet settled.

### 3.3 Runtime schema export

Exporting runtime schemas directly to the BFF would risk cross-app source imports and unclear dependency direction while runtime internals are still being refined.

### 3.4 BFF-local runtime-boundary schemas

BFF-local schemas duplicate a small part of the semantic contract, but they create executable drift detection at the boundary where runtime JSON enters the public facade. They fit the current two-package repo shape and can be promoted later.

## 4. Decision

For the v0.9 cutover, defer a physical shared package or generator.

Use the maintained v0.9 API specs as the semantic source of truth, and add narrow BFF-local runtime-boundary schemas for high-risk runtime responses when contract drift would otherwise be easy to miss.

Each schema pilot should:

- cover one resource family at a time
- validate runtime JSON before public mapping
- keep public response mapping unchanged unless the public spec changes
- avoid importing runtime source from the BFF or BFF source from the runtime
- avoid root workspace, package, and lockfile churn
- include focused tests that prove valid responses pass and drifted responses fail before mapping

## 5. Initial pilot

The initial pilot covers `GET /api/v1/workspaces/{workspace_id}/threads`.

`frontend-bff` validates the runtime `ListResponse<RuntimeThreadSummary>` shape before mapping it to the public thread-list item response. This catches drift such as missing `derived_hints` before the public mapping code can silently consume an invalid runtime payload.

## 6. Promotion criteria

Revisit a shared package or generator when at least two of these become true:

- three or more v0.9 resource families have BFF-local runtime-boundary schemas with repeated structure
- runtime and BFF package ownership and workspace tooling are settled
- generated contract artifacts have a clear source of truth and checked-in file policy
- validation shows repeated drift that local boundary schemas cannot manage cleanly

Until then, keep shared-contract work incremental and executable at the current app boundary.

## 7. Non-goals

- no root `package.json`
- no `packages/` directory
- no workspace configuration
- no new lockfiles
- no cross-app source imports
- no broad runtime/public type migration
- no replacement of the maintained v0.9 API specifications
