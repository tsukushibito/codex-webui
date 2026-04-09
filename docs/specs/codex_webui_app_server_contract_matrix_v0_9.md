# Codex WebUI App Server Contract Matrix v0.9

## 1. Purpose

This document fixes the App Server dependency contracts that Codex WebUI v0.9 is allowed to rely on.

It exists because the v0.9 requirements, common spec, internal API spec, and public API spec all treat App Server native facts as the source of truth and explicitly require a separate contract matrix before implementation.

---

## 2. Target dependency baseline for v0.9

### 2.1 Operational target

The current v0.9 implementation target is the App Server behavior observed with:

- runtime / CLI version: `codex-cli 0.118.0`
- observation artifacts under `artifacts/app_server_observability/observations/`

### 2.2 Version caveat

The observed artifacts did not record a separate App Server build/version string. The maintained dependency baseline for v0.9 is therefore:

- the App Server behavior envelope observed in the `codex-cli 0.118.0` runs
- plus the explicitly allowed contracts and gaps fixed in this matrix

This runtime or artifact pin is the fixed v0.9 dependency baseline until an app-server-specific version string becomes observable.
If a later implementation can expose that version directly, this document should be amended to include it.

---

## 3. Evidence basis

The matrix below is based primarily on:

- `docs/validation/app_server_behavior_validation_plan_checklist.md`
- `artifacts/app_server_observability/observations/p2-*`
- `artifacts/app_server_observability/observations/p3-*`
- `artifacts/app_server_observability/observations/p4-*`

Where evidence is incomplete, this document marks the dependency as:

- `allowed`
- `allowed_with_app_completion`
- `reserved_do_not_depend`

---

## 4. Allowed dependency contracts

| Area | Contract | Status | Notes |
|---|---|---|---|
| Thread identity | native `thread.id` | `allowed` | Use as public/internal `thread_id`. |
| Turn identity | native `turn.id` | `allowed` | Stable enough for internal/public references. |
| Native thread status | `idle` | `allowed` | Observed directly in stream and history reacquisition. |
| Native thread status | `active` | `allowed` | Observed directly in stream and history reacquisition. |
| Native active flags | `waitingOnApproval` | `allowed` | Reacquirable through `thread/read`. |
| Native active flags | `waitingOnUserInput` | `allowed_with_app_completion` | Use as the public/internal waiting-for-input interpretation when the thread returns to `idle` after a continuable turn. Do not require a separately emitted native flag in current target behavior. |
| Native turn status | `inProgress` | `allowed` | Observed directly. |
| Native turn status | `completed` | `allowed` | Observed directly. |
| Native turn status | `interrupted` | `allowed` | Observed directly, including deny/stop flows. |
| Native turn status | `failed` | `reserved_do_not_depend` | Not observed as a reliable native turn terminal status in the current target behavior. Public failure projection must use stream-derived item/error evidence instead. |
| Request identity | native approval `request_id` | `allowed_with_app_completion` | Native request IDs are visible in approval flow, but the request object is not reacquirable from history. Public reachability therefore requires app-owned retention and thread-context helper metadata. |
| Request detail | approval summary fields from native request payload | `allowed_with_app_completion` | `risk_category`, short summary, and operation summary have native candidates; `reason`, `requested_at`, `responded_at`, and decision type may require app completion. |
| Request detail history reacquisition | native history-only recovery of approval object | `reserved_do_not_depend` | Pending or resolved approval objects are not reconstructed by `thread/read(includeTurns=true)` alone. |
| Approval pending recovery | `thread.status = active[waitingOnApproval]` plus latest turn `inProgress` | `allowed` | This is the stable native basis for pending-approval reacquisition. |
| Request resolution type | native resolution type in `serverRequest/resolved` | `reserved_do_not_depend` | Approve vs deny cannot be derived from the native resolved event alone in the observed target. |
| Item identity | native item IDs across stream and history | `reserved_do_not_depend` | Stream-side and history-side item IDs do not reliably match. |
| Message projection | `userMessage` and non-empty `agentMessage` completion | `allowed` | Safe native basis for public message projection. |
| Empty assistant final message | empty `agentMessage` as public message | `reserved_do_not_depend` | Do not materialize as a user-visible assistant message by default. |
| Command execution failure | `commandExecution.status = failed` item evidence | `allowed_with_app_completion` | Failure is observable in stream, but may disappear from history. Public error projection must preserve stream-derived evidence. |
| Event identity | stable native event ID | `reserved_do_not_depend` | No reliable cross-stream/history native event identity was observed. Use app-owned event IDs when needed. |
| Thread ordering | native strict thread ordering key | `reserved_do_not_depend` | Native data did not expose a stable replay-safe ordering key. Runtime must assign thread-scoped `sequence`. |
| Thread preview recency | native `preview` as latest-turn summary | `reserved_do_not_depend` | Observed to retain stale prompt text in some reload cases. |

---

## 5. Open/load and `notLoaded`

### 5.1 Current target rule

The current evidence set does not establish a native history status that can be depended on as a directly observed `notLoaded` thread status in the same way as `idle` or `active`.

### 5.2 Allowed v0.9 dependency

WebUI may still use the `notLoaded` concept in v0.9 only as:

- a runtime-facing dependency slot tied to explicit open/load behavior
- a facade/runtime operational state derived from persisted thread reachability and loadability

Public and internal APIs must not pretend that full thread history or request objects remain available merely because a thread can be reopened.

---

## 6. Recovery consequences fixed for v0.9

The following consequences are fixed for the current target behavior:

1. REST reacquisition is authoritative for thread status and history that the native history actually retains.
2. Approval request objects, request IDs, and approval item references are not recoverable from history-only reload and therefore require app-owned helper retention if the UI must reopen them safely.
3. Public and internal request-detail helpers must remain reachable from thread context for pending and just-resolved requests during the defined retention window.
4. Runtime must assign thread-scoped `sequence` and stable event identifiers needed for dedupe and convergence.
5. Public failure/error cues may depend on retained stream-derived evidence because the current target behavior can lose native failure detail on later history reacquisition.

---

## 7. Reserved dependencies that v0.9 must not silently assume

Until this matrix is amended with fresh evidence, v0.9 must not silently depend on:

- a stable native event ID that survives stream/reload/history correlation
- a stable native item ID that matches between stream and history
- native history-only reconstruction of approval request objects
- a native request resolution event that fully distinguishes approve, deny, and stop outcomes by itself
- a native strict ordering key sufficient to replace app-owned `sequence`
- a reliable native preview field as the latest-turn summary
- a native turn-level terminal `failed` status as the primary public failure basis

---

## 8. Required alignment for later specs and implementation

Public API, internal API, and runtime implementation must stay within this matrix.

If a later implementation wants to depend on additional native behavior, update this matrix first and then update the dependent v0.9 docs.
