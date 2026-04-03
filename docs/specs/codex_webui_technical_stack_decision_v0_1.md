# Codex WebUI technical stack decision v0.1

Last updated: 2026-04-04

## 1. Purpose

This document records the minimum technical stack decision required to implement Phase 3 and later phases of the Codex WebUI MVP.

The purpose is to reduce rework caused by late stack changes while keeping the decision surface small enough for MVP.

This document is a maintained design decision, not an implementation manual.

---

## 2. Inputs

This decision is based on the following maintained documents.

- `docs/requirements/codex_webui_mvp_requirements_v0_8.md`
- `docs/specs/codex_webui_common_spec_v0_8.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `docs/specs/codex_webui_public_api_v0_8.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`

---

## 3. Decision summary

For MVP, adopt the following stack.

### 3.1 `codex-runtime`

- `Node.js 22`
- `TypeScript`
- `Fastify`
- `better-sqlite3`
- `Drizzle ORM`
- `Zod`

### 3.2 `frontend-bff`

- `Node.js 22`
- `TypeScript`
- `Next.js 15`
- Route Handlers for public API and SSE relay
- `Zod` for request/response validation where needed

### 3.3 UI

- `React 19`
- `TypeScript`
- browser-native SSE consumption via `EventSource`

### 3.4 Testing

- `Vitest` for unit and integration tests
- `Playwright` for end-to-end browser verification

### 3.5 Packaging and local execution

- `Docker Compose`

### 3.6 Persistence

- `SQLite` as the MVP app-owned persistence store
- A single local database file per environment

---

## 4. Why this stack

### 4.1 Optimize for MVP simplicity

The MVP is a personal single-user system, not a multi-tenant production service.

The requirements and internal API assume:

- only `frontend-bff` is exposed externally
- `codex-runtime` is private
- `codex app-server` is managed inside `codex-runtime`
- realtime updates are REST + SSE
- app-owned persistence is required for overlay, approval state, event identity, sequence, and idempotency

This makes a small two-service Node-based architecture sufficient.

### 4.2 Keep one language across runtime, BFF, and UI

Phase 3 and Phase 4 share many contracts:

- internal/public schema mapping
- SSE payload shape
- event type handling
- idempotency key handling
- approval and session status transitions

Using TypeScript end-to-end reduces contract drift and allows the same types and validation approach to be shared across layers.

### 4.3 Favor a simple local database over distributed infrastructure

The MVP does not require:

- fixed production-grade DB technology
- event bus products
- full event replay
- multi-user concurrency at service scale

The runtime mainly needs durable storage for:

- workspace registry
- session overlay metadata
- approval projection/state
- stable message, approval, and event IDs
- sequence counters
- idempotency keys
- recovery helper state such as `recovery_pending`

`SQLite` is sufficient for these needs and keeps Phase 3 focused on runtime correctness rather than infrastructure.

### 4.4 Match the runtime operating model

`codex-runtime` must manage a long-lived process, interact with `codex app-server` over `stdio`, and supply REST + SSE to `frontend-bff`.

Node.js is a good fit for:

- subprocess management
- async stream handling
- SSE endpoints
- JSON-first contracts

---

## 5. Explicit non-decisions

This decision does not fix the following.

- concrete ID format such as UUID or ULID
- final SSE transport `event:` naming
- projection cache retention period
- full replay or event bus introduction
- production-scale database migration beyond MVP

These remain intentionally open because the common and internal specifications do not require them to be fixed yet.

---

## 6. Rejected alternatives for MVP

### 6.1 Python runtime plus TypeScript BFF/UI

This is technically viable, but was not selected because:

- cross-language contract maintenance cost is higher
- Phase 3 and Phase 4 are tightly coupled through internal/public mappings
- the repo does not already contain an implementation base that justifies a split

### 6.2 Postgres plus Redis plus queue/event bus

This was not selected because:

- it adds operational complexity that MVP does not require
- it expands the failure surface before overlay/projection/recovery semantics are proven
- the specifications explicitly avoid requiring fixed DB technology or event bus products at this stage

### 6.3 Single service that combines BFF and runtime

This was not selected because:

- the maintained requirements and specs already separate `frontend-bff` and `codex-runtime`
- keeping the internal boundary visible reduces later rework in public/internal mapping
- the only public entrypoint requirement is clearer with a separate BFF

---

## 7. Revisit conditions

Revisit this decision if one of the following becomes true.

- single-user assumption is removed
- runtime restart continuity during `running` becomes an MVP requirement
- `SQLite` becomes a bottleneck for required persistence or recovery guarantees
- the public/internal boundary is intentionally collapsed or expanded
- `codex app-server` integration constraints change materially from the current `stdio`-based assumption

---

## 8. Implementation guidance boundary

This document is the source of truth for stack selection only.

Concrete setup, commands, directory layout, and development workflow should be documented in area-specific `README.md` files after implementation directories are created.
