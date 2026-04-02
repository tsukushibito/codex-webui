# Codex WebUI Internal API Specification v0.8

## 1. Purpose of the document

This specification defines the contract for the **internal API** used between `frontend-bff` and `codex-runtime` in Codex WebUI MVP.

This version treats Codex App Server's **Thread / Turn / Item / server-initiated request flow** as the original, and clarifies to which of the following each resource in the internal API belongs.

- **App-specific resource**
- **native-backed façade resource**
- **projection / read model**

The purpose of this specification is as follows.

- Define a minimum and firm internal contract to establish public API v0.8
- Clearly separate the responsibilities of `codex-runtime` and `frontend-bff`
- Clarify the correspondence between App Server native primitives and WebUI resources
- Define state consistency and atomicity of session / approval / message / event
- Clarify the persistence unit to meet restoration requirements
- Define the division of responsibility between SSE distribution and event / sequence
- Clarify the responsibility for converting internal schema to public schema
- Avoid unnecessary unique numbering and history duplication on the WebUI side

This specification targets MVP and does not excessively anticipate future expansion.

---

## 2. Scope of application

This specification applies to:

- Internal REST API from `frontend-bff` to `codex-runtime`
- Internal SSE stream from `frontend-bff` to `codex-runtime`
- Correspondence between native primitive of internal domain resource and App side resource
- State transition / atomicity / persistence / event generation rule
- From internal resource field mapping rule to public resource

The following are excluded.

- Public API contract itself for browsers
- Complete fixation of the entire App Server native protocol
- Fixed DB implementation technology
- Prerequisites for introducing event bus products
- Authorization model assuming multi-user support
- workspace rename / delete
- session delete / archive
- Event retransmission with complete replay

---

## 3. Assumptions

### 3.1 System requirements

- The only public boundary is `frontend-bff`
- `codex-runtime` is externally private
- Authentication is delegated to Dev Tunnels
- Single user assumption
- workspace Management target is `/workspaces` Limited to subordinates
- `codex app-server` is `codex-runtime`
- Managed as a long-lived process within the UI assumes 3 screens: Home / Chat / Approval

### 3.2 App Server Prerequisites

Codex App Server assumes that conversation native primitives have at least the following:

- `thread`
- `turn`
- `item`
- server-initiated request / client response flow

The internal API converts these native primitives into façades/projections as necessary and provides them to BFF.

### 3.3 Constraints calculated backwards from public API

Internal APIs must be able to support at least the following:

- workspace list / creation / details
- session list / creation / start / details / stop
- message list / send
- event list / session stream
- approval list / details / approve / deny / approvals stream
- Home Aggregated information for initial display

### 3.4 Important constraints for session / approval

- `session create` and `session start` are conceptually separated on the public API
- There can only be one active session in the same workspace
- Active is `running` or `waiting_approval`
- Normal messages can be sent only when `waiting_input`
- Normal messages cannot be sent during `waiting_approval`
- After `deny`, `waiting_input`
- If stopped during `waiting_approval`, approval is `canceled`
- `completed` / `failed` / `stopped` is the terminal state on the WebUI
- `completed` is the session on the runtime / app-server side
- In principle, return to `waiting_input` upon completion of one turn.
- There can be no more than one pending approval for the same session
- Even if there is an active session in the same workspace, `create` of another session is allowed.
- Active session constraints are applied at `start` and `waiting_input -> running` Final guarantee on transition

---

## 4. Design policy

### 4.1 Basic policy

- API version base is `/api/v1`
- Data format is JSON
- JSON field name is `snake_case`
- enum value is `snake_case`
- `event_type` is `domain.action`
- Date and time is UTC RFC 3339 string, end `Z`
- ID exposed to API is opaque string
- Errors use common envelope
- `409` is state conflict, `422` is value rule violation
- List type query parameter is `limit` / `cursor` / `sort`
- Initial display is REST, difference is SSE
- `Last-Event-ID` is not assumed in MVP
- A common `data` envelope is not provided in the outermost shell of a normal response.

### 4.2 Resource classification

Internal API resources are divided into three types.

#### 4.2.1 App-specific resources

- `workspace`
- workspace registry
- Correspondence between workspace and thread
- active session constraint
- WebUI public state
- Aggregate for Home

#### 4.2.2 native-backed façade resource

- `session`
- `approval`
- Part of SSE
- stop / start / resolve action

#### 4.2.3 projection / read model

- `message`
- `events`
- `active_session_summary`
- global approval summary

### 4.3 Responsibility boundaries

#### Responsibilities of `frontend-bff`

- Formatting to public API for browser
- Generating aggregated responses for UI purposes such as Home
- internal SSE relay
- Dev Tunnel public entrance
- Conversion from internal error to public error
- Field mapping from internal resource to public resource
- Read model synthesis for each screen
- `can_*` UI Final derivation of auxiliary fields

#### Responsibilities of `codex-runtime`

- Workspace management
- Correspondence management between workspace and native thread
- App Server process management
- Operation of App Server native primitive
- Final guarantee of active session constraints
- Complex state transition for approval / stop / message send
- Construction of projection for public / internal
- Minimum necessary app-owned persistence
- Read model for restoration / Cursor retention
- canonical sequencing for session streams

### 4.4 App Server alignment principles

- `workspace` is an App-side resource
- `session` is an **internal façade of the App Server thread**
- `session start` is an App-owned façade action instead of a **native 1:1 action**
- `message` is a **resource that projects a message item among App Server items**
- `approval` is **resource projected from App Server's server-initiated request flow**
- internal SSE's `event_type` is a stable event name for UI/BFF, and 1:1 correspondence with the native event name is not guaranteed.
- Reuse native ID as much as possible, and keep unique numbering on the WebUI side to the minimum necessary.

### 4.5 Original boundaries and reconstruction principles

MVP uses the following as criteria for determining inconsistencies.

- Native `thread` / `turn` / `item` / request flow fact is **App Server side is the original**
- `workspace registry`, `workspace_id <-> session_id` corresponds, public `session.status`, `active_approval_id`, approval stable ID, session `sequence` are **runtime / app-owned persistence is the original**
- If there is a discrepancy between the native side facts and the app-owned projection, reconstruct the projection from the native history as much as possible, and give priority to the persistent value for app-owned control information that cannot be reconstructed.
- Message projection is restored primarily from native history, but approval projection is restored from runtime-managed state because native history alone is insufficient.

### 4.6 Meaning of `workspace.updated_at`

`workspace.updated_at` in internal does not only represent the creation/update time of the workspace itself.
MVP treats it as **integrated time including the last state change time of subordinate session or approval**.

This makes it consistent with the Home screen sort order, diff reflection, and public `workspace.updated_at`.

---

## 5. ID Policy

### 5.1 Workspace

- `workspace_id` is an opaque ID managed by the App
- `workspace_id` is not an App Server native ID

### 5.2 Session

- `session_id` adopts **native thread ID**
- As a general rule, the same `session_id` is used whether internal or public.
- `native_thread_id` does not have a separate field and can be considered the same as `session_id`

### 5.3 Turn

- `turn_id` can be kept internally if the native turn ID can be obtained stably.
- `turn_id` is not exposed to the public API of MVP.
- It is not required to be exposed even in the internal API, but it can be used as an internal key for event / debug / projection updates.

### 5.4 Message

- `message_id` is a runtime-managed stable ID for the projected message resource
- Native item IDs may be retained only as internal correlation material
- Not all items are messages
- `message` is a subset of item

### 5.5 Approval

- `approval_id` is a runtime-managed stable ID for the approval projection
- Native request IDs may be retained for correlation/debug, but are not the internal contract ID
- The same `approval_id` must be returned for the same approval resource even after reconnecting.

### 5.6 Event

- `event_id` should uniquely identify the internal SSE event.
- In MVP, `event_id` is a runtime-managed internal contract ID.
- Native event identity may be retained only as correlation/debug material.

---

## 6. Correspondence between native primitive and internal resource

| internal concept | Native compatible | type | notes |
|---|---|---|---|
| `workspace` | None | App-specific | Original copy on runtime side |
| `session` | `thread` | façade | A subset of | projection | chat bubble display only |
| `approval` | server-initiated request flow | façade | native request as a UI resource |
| `session events` | thread / turn / item / request notification group | projection | formatted to stable event name for BFF |
| `approval stream` | request / resolution notification group | projection | global approval for updates |

---

## 7. Internal domain model

## 7.1 Workspace

```json
{
  "workspace_id": "ws_xxx",
  "workspace_name": "alpha",
  "directory_name": "alpha",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:22:00Z",
  "active_session_id": "thread_abc123",
  "active_session_summary": {
    "session_id": "thread_abc123",
    "status": "running",
    "last_message_at": "2026-03-27T05:21:40Z"
  },
  "pending_approval_count": 1
}
```

### rule

- `workspace_id` is the App side opaque ID
- `workspace_name` is the display name and creation input value
- In MVP, `directory_name` and `workspace_name` are 1:1
- The real path is derived from `/workspaces/{directory_name}`
- `updated_at`
- `active_session_summary` is the read model for Home aggregation and workspace list
- `active_session_summary` is **only if there is an active session** Non-`null`
- Not applicable for rename / delete / move

## 7.2 Session

```json
{
  "session_id": "thread_abc123",
  "workspace_id": "ws_xxx",
  "title": "Fix build error",
  "status": "waiting_input",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:22:00Z",
  "started_at": "2026-03-27T05:13:00Z",
  "last_message_at": "2026-03-27T05:21:40Z",
  "active_approval_id": null,
  "current_turn_id": null,
  "app_session_overlay_state": "open"
}
```

### supplement

- `session` is the internal façade of the App Server thread**
- `session_id` is the native thread ID
- `status` is the public/internal state summarized for WebUI and does not directly expose the native thread status
- `current_turn_id` may be kept internally if there is an active turn
- `app_session_overlay_state` is App-owned auxiliary information and can take `open` / `stopping` / `closed` as examples
- `app_session_overlay_state` is not the original of public contract

### session_status

- `created`
- `running`
- `waiting_input`
- `waiting_approval`
- `completed`
- `failed`
- `stopped`

### Interpretation of session_status

- `created`: App-owned session resource and native thread have been created, but have not yet started publicly.
- `running`: Active turn is being executed, or the progress state associated with turn execution.
- `waiting_input`: There is no active turn and messages can be sent normally.
- `waiting_approval`: Waiting for a response to native request
- `completed`: App-owned Terminal state
- `failed`: App-owned failed terminal state when runtime determines that the continuation of the same session has failed**
- `stopped`: App-owned stopped terminal state **based on the user's or system's intention to stop**

> Note:
> Even though the native thread is a durable container and can originally continue, MVP's WebUI treats `completed` / `failed` / `stopped` as terminal states. `completed` and `failed` are not assumed to be native terminal thread statuses.

## 7.3 Message

```json
{
  "message_id": "msg_001",
  "session_id": "thread_abc123",
  "role": "user",
  "content": "Please explain the diff.",
  "created_at": "2026-03-27T05:23:00Z",
  "source_item_type": "user_message"
}
```

### message_role

- `user`
- `assistant`

### rule

- `message` extracts only those items that should be displayed as chat bubbles projection
- `message_id` is the stable ID of the projected message resource
- `source_item_type` is a field for internal tracking of origin, and
- Items such as tool execution, diff, approval request, etc. that are not normally exposed to the public are not `message`
- Handled on the `events` / `approval` side - In MVP, the `system` role is not covered by the standard public / internal read model, and should be expanded in the future if necessary.

## 7.4 Approval

```json
{
  "approval_id": "apr_001",
  "session_id": "thread_abc123",
  "workspace_id": "ws_xxx",
  "status": "pending",
  "resolution": null,
  "approval_category": "external_side_effect",
  "summary": "Run git push",
  "reason": "Codex requests permission to push changes to remote.",
  "operation_summary": "git push origin main",
  "context": {
    "command": "git push origin main"
  },
  "created_at": "2026-03-27T05:18:00Z",
  "resolved_at": null,
  "native_request_kind": "approval_request"
}
```

### approval_status

- `pending`
- `approved`
- `denied`
- `canceled`

### approval_resolution

- `approved`
- `denied`
- `canceled`

### approval_category

- `destructive_change`
- `external_side_effect`
- `network_access`
- `privileged_execution`

### rule

- `approval` projects the native request flow to the WebUI resource façade
- `approval_id` is the stable ID of the runtime approval projection
- `created_at` can be based on the time when the runtime receives the native request
- Approval resource restoration depends on runtime-managed projection/state because native history alone does not preserve approval payload or resolution metadata
- `canceled` is an internal/public expression that includes App-owned stop semantics, and is a native protocol
- `native_request_kind` is for internal tracking and is usually not exposed to public
- `approval_category` should be fixed in MVP, and when expanding in the future, only consider adding backward compatible enums

## 7.5 Event

```json
{
  "event_id": "evt_001",
  "session_id": "thread_abc123",
  "event_type": "message.assistant.delta",
  "sequence": 42,
  "occurred_at": "2026-03-27T05:20:10Z",
  "payload": {
    "message_id": "msg_003",
    "delta": "Updated the config"
  },
  "native_event_name": "item/agent_message/delta"
}
```

### event_type Example

- `session.status_changed`
- `message.user`
- `message.assistant.delta`
- `message.assistant.completed`
- `approval.requested`
- `approval.resolved`
- `log.appended`
- `error.raised`

### rule

- `event` is not a raw mirror of the native event, but is stable for BFF/UI event
- `native_event_name` may be kept as a field for internal debugging/tracing
- `sequence` is a stable sequential number for session stream and the canonical ordering contract**
- `sequence` is not required for global approval stream

---

## 8. State transition

## 8.1 Session state transition

- `created -> running`
- `running -> waiting_input`
- `running -> waiting_approval`
- `running -> completed`
- `running -> failed`
- `running -> stopped`
- `waiting_input -> running`
- `waiting_input -> stopped`
- `waiting_approval -> running`
- `waiting_approval -> waiting_input`
- `waiting_approval -> stopped`

### supplement

- `waiting_approval -> running` after approve / allow reply
- `waiting_approval -> waiting_input` after deny reply
- `waiting_approval -> stopped` when stopping
- `waiting_input -> stopped` allows
- `completed` / `failed` / `stopped` Terminal state on WebUI
- It is not possible to resume from the terminal state
- In principle, when the assistant side 1 turn is completed and the next input is accepted `waiting_input`
- `completed` is a transition only when the runtime determines that the session is the end of the WebUI
- `failed` is an execution failure where the runtime should terminate the continuation of the same session** Transition only when it is determined that
- If the same session can be continued due to a temporary failure in turn units, it may be returned to `waiting_input` while recording `error.raised`.
- `stopped` is used only as a termination based on the intention of stopping by the user or the system.

## 8.2 Approval state transition

- `pending -> approved`
- `pending -> denied`
- `pending -> canceled`

### supplement

- `approved` returns the session to `running`
- `denied` returns the session to `waiting_input`
- `canceled` transitions the session to `stopped` Resolution result derived from stop
- There is at most one concurrent pending approval per session, and `active_approval_id` refers to that single request.

## 9. Atomicity rules

The following operations are handled atomically on the runtime side.
However, MVP does not assume distributed transactions, but specifies **success boundaries, compensation in case of partial failure, and retry policy**.

### 9.1 Common Principles

- Design with the assumption that native operations and app-owned persistence cannot be combined into one ACID transaction
- Define a "boundary for publishing success" for each composite operation
- If projection / event append fails after crossing the publishing success boundary, converge by retrying or rebuilding
- Uncompensable partial failure is **recovery_pending**
- Canonical event append and projection update order is as follows: **event append comes first, projection can be reconstructed from event**.

### 9.2 session create

1. Verify that workspace exists
2. Create native thread
3. Persist `workspace_id <-> session_id(thread_id)` correspondence
4. Save session overlay record as `created`
5. Append canonical event as needed
6. Update workspace summary / read model

Success boundary:
- Step 4 Set completion as success boundary

In case of partial failure:
- If native thread 3 or 4 fails after successful creation, it must be detectable as an orphan thread
- If an unsupported thread is detected at restart, retry the mapping or notify the operation log.

> Supplementary note:
> `session create` does not refuse due to active session constraint.
> The final guaranteed point of the active session constraint is the `waiting_input -> running` transition associated with `start` and message transmission.

### 9.3 session start

`session start` should be an App-owned façade action instead of a native 1:1 primitive.

At a minimum, guarantee the following:

1. Verify that the session is `created`
2. Verify that there is no other active session in the same workspace
3. Transition the app-owned session state to `running`
4. Execute native operation for bootstrap if necessary
5. Append `session.status_changed` canonical event
6. workspace summary / read model update

Success boundary:
- Step 3 Set completion as success boundary

When retransmitting:
- If the same start has already succeeded, return the latest state. Allow idempotent success.

> Note:
> If the native App Server does not have a stable primitive of "start without input",
> `session start` can be treated as a façade action for App side state transition and UI initialization.

### 9.4 message accept

1. Verify that the session is `waiting_input`
2. Final check that there is no other active session in the same workspace
 However, allow the target session itself as an active candidate
3. Check for duplication of `client_message_id`
4. Start a new turn for the native thread
5. Set the user message item to native Send to
6. Update App-owned session state to `running`
7. Preserve `current_turn_id` as needed
8. Append `message.user` / `session.status_changed` canonical event update
9. projection / summary

Success boundary:
- Step 7 Completion is the success boundary
- Assistant side generation receives native event and continues asynchronously

When retransmitting:
- `client_message_id` is required
- If the request body is the same with the same `session_id` and `client_message_id` combination, allow idempotent success that returns the existing user message result
- `409 if the request body is different, such as `content` with the same key Set to message_idempotency_conflict`

In case of partial failure:
- If app-owned update fails after successful native transmission, make session discoverable with `recovery_pending` equivalent, and recover message projection and session state at next re-integration.
- Even if canonical event append fails, it should be possible to reconstruct from native history.

### 9.5 approval resolve

1. Verify that the approval is `pending`
2. Return a reply equivalent to `allow` or `deny` to the native request
3. Set `resolved_at`
4. Update the `active_approval_id` of the session to `null`
5. Update the session state according to the resolution
6. `approval.resolved` canonical event append
7. `session.status_changed` canonical event append
8. Update projection / summary

Success boundary:
- Step 5 Set completion as success boundary

When retransmitting:
- If the same resolution has already been confirmed, return the latest status. Allow idempotent success
- If another resolution has already been confirmed or `canceled`, set `409 approval_not_pending`.

In case of partial failure:
- If 3 to 8 fail after native reply is successful, approval will be listed as `recovery_pending` for realignment
- Request a unique update for each approval stable ID to prevent double transition from pending to resolved
- `approval.resolved` requires runtime correlation between native request/reply facts and app-owned approval state; native resolution signal alone is insufficient as the canonical resource update trigger

### 9.6 session stop

1. Verify that the session is in a stoppable state
2. If the state is `running`, send cancel / interrupt to the native turn / execution
3. If the state is `waiting_approval`, update the active approval to `canceled` and perform any required cancel / deny-equivalent handling on the native request side
4. If the state is `waiting_input`, update the app-owned session overlay to `stopped`
5. Update the session to `stopped`
6. Update `active_approval_id` to `null`
7. Append the `approval.resolved` canonical event when needed
8. Append the `session.status_changed` canonical event
9. projection / summary update

Success boundary:
- Step 6 Set completion as success boundary

When retransmitting:
- If it is already `stopped`, return the latest stopped state. Allow idempotent success.

In case of partial failure:
- If app-owned stop reflection fails after success of native cancel, match stopped/approval resolved at restart and converge to `stopped`

## 10. Persistence policy

## 10.1 Basic policy

The thread / turn / item history held natively by App Server is the original, and only **App-specific information and the minimum necessary projection** are persisted on the WebUI / runtime side.

### 10.2 App-owned persistence target

App-owned session overlays may have at least the following responsibilities:

- `open`: Normal operation
- `stopping`: Executing stop compound processing
- `closed`: Stopped
- `recovery_pending`: Need to realign native fact and projection / overlay


At a minimum, make the following permanent.

- workspace registry
- `workspace_id <-> directory_name`
- `workspace_id <-> session_id(thread_id)` response
- App-owned session overlay metadata
- stable message ID mapping / message projection identity
- pending / resolved approval projection and approval payload snapshot
- stable approval ID mapping
- stable event ID mapping
- `active_approval_id`
- summary / cursor / sequence read model required for management
- idempotency key state required for retransmission-safe operations
- stop / approval resolve Composite operation auxiliary state
- Correspondence table in case of approval / event where native stable ID does not exist

### 10.3 In principle, the original copy is entrusted to the app-server

The following is based on the App Server thread history as much as possible.

- full message history
- full item history
- native event history
- turn execution history

### 10.4 What can be kept as cache/projection

The following may be kept denormalized for reconnection, fast initial display, and cursor operation.

- message projection
- approval projection
- public / internal events projection
- workspace / session summary
- unread / pending counts
- sequence counter for session stream

### 10.5 Relationship with restoration requirements

MVP guarantees the following:

- List/history/latest status reference after browser reconnection
- Resubscription after SSE disconnection and consistency by REST reacquisition

The following are not covered by the warranty.

- runtime Continue execution after restart
- container Continue execution after restart
- `running` Return from interruption of intermediate processing

However, even after restarting the runtime, to the extent that the App Server retains thread history, the goal is to be able to reconstruct the history and final state together with the saved workspace correspondence information.

---

## 11. Internal API list

## 11.1 Workspace

### `GET /api/v1/workspaces`

Returns a workspace summary list.

#### query

- `limit` Optional. Default 100
- `cursor` Optional
- `sort` Optional. Default `-updated_at`

#### allowed sort values

- `updated_at`
- `-updated_at`

#### paging / sort rules

- If `sort=updated_at`, the order is `updated_at asc, workspace_id asc`
- If `sort=-updated_at`, the order is `updated_at desc, workspace_id desc`
- cursor paging assumes the above stable order corresponding to the specified sort

#### response

```json
{
  "items": [
    {
      "workspace_id": "ws_alpha",
      "workspace_name": "alpha",
      "directory_name": "alpha",
      "created_at": "2026-03-27T05:12:34Z",
      "updated_at": "2026-03-27T05:22:00Z",
      "active_session_id": "thread_001",
      "active_session_summary": {
        "session_id": "thread_001",
        "status": "running",
        "last_message_at": "2026-03-27T05:21:40Z"
      },
      "pending_approval_count": 1
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

---

### `POST /api/v1/workspaces`

Create a workspace.

#### request

```json
{
  "workspace_name": "alpha"
}
```

#### response `201 Created`

```json
{
  "workspace_id": "ws_alpha",
  "workspace_name": "alpha",
  "directory_name": "alpha",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:12:34Z",
  "active_session_id": null,
  "active_session_summary": null,
  "pending_approval_count": 0
}
```

#### errors

- `404 workspace_root_not_found`
- `409 workspace_name_conflict`
- `409 workspace_name_normalized_conflict`
- `422 workspace_name_invalid`
- `422 workspace_name_reserved`

---

### `GET /api/v1/workspaces/{workspace_id}`

Return workspace summary.

#### response

```json
{
  "workspace_id": "ws_alpha",
  "workspace_name": "alpha",
  "directory_name": "alpha",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:22:00Z",
  "active_session_id": "thread_001",
  "active_session_summary": {
    "session_id": "thread_001",
    "status": "running",
    "last_message_at": "2026-03-27T05:21:40Z"
  },
  "pending_approval_count": 1
}
```

#### errors

- `404 workspace_not_found`

---

## 11.2 Session type

### `GET /api/v1/workspaces/{workspace_id}/sessions`

Returns a list of sessions under workspace.

#### query

- `limit` Optional. Default 20
- `cursor` Optional
- `sort` Optional. Default `-updated_at`

#### allowed sort values

- `updated_at`
- `-updated_at`

#### paging / sort rules

- If `sort=updated_at`, the order is `updated_at asc, session_id asc`
- If `sort=-updated_at`, the order is `updated_at desc, session_id desc`
- cursor paging assumes the above stable order corresponding to the specified sort

#### response

```json
{
  "items": [
    {
      "session_id": "thread_001",
      "workspace_id": "ws_alpha",
      "title": "Fix build error",
      "status": "waiting_input",
      "created_at": "2026-03-27T05:12:34Z",
      "updated_at": "2026-03-27T05:22:00Z",
      "started_at": "2026-03-27T05:13:00Z",
      "last_message_at": "2026-03-27T05:21:40Z",
      "active_approval_id": null,
      "current_turn_id": null,
      "app_session_overlay_state": "open"
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

---

### `POST /api/v1/workspaces/{workspace_id}/sessions`

Create a session.

#### semantics

- Create a native thread
- Save the App-owned session overlay as `created`
- The `session_id` returned is the native thread ID
- `create` itself is allowed even if an active session exists in the same workspace

#### request

```json
{
  "title": "Fix build error"
}
```

#### response `201 Created`

```json
{
  "session_id": "thread_001",
  "workspace_id": "ws_alpha",
  "title": "Fix build error",
  "status": "created",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:12:34Z",
  "started_at": null,
  "last_message_at": null,
  "active_approval_id": null,
  "current_turn_id": null,
  "app_session_overlay_state": "open"
}
```

#### errors

- `404 workspace_not_found`
- `422 session_title_invalid`

---

### `GET /api/v1/sessions/{session_id}`

Return session details.

#### response

```json
{
  "session_id": "thread_001",
  "workspace_id": "ws_alpha",
  "title": "Fix build error",
  "status": "waiting_input",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:22:00Z",
  "started_at": "2026-03-27T05:13:00Z",
  "last_message_at": "2026-03-27T05:21:40Z",
  "active_approval_id": null,
  "current_turn_id": null,
  "app_session_overlay_state": "open"
}
```

#### errors

- `404 session_not_found`

---

### `POST /api/v1/sessions/{session_id}/start`

Start a session.

#### semantics

- native 1:1 not primitive
- App-owned Initialize public state and establish active constraints façade action
- If bootstrapping is required on the native side, runtime can handle it internally

#### request

```json
{}
```

#### response

```json
{
  "session_id": "thread_001",
  "workspace_id": "ws_alpha",
  "title": "Fix build error",
  "status": "running",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:13:00Z",
  "started_at": "2026-03-27T05:13:00Z",
  "last_message_at": null,
  "active_approval_id": null,
  "current_turn_id": "turn_001",
  "app_session_overlay_state": "open"
}
```

#### errors

- `404 session_not_found`
- `409 session_invalid_state`
- `409 session_conflict_active_exists`

---

### `POST /api/v1/sessions/{session_id}/stop`

Stop session.

#### behavior

- If stopped with `running`, cancel/interrupt the active native turn / execution
- If stopped with `waiting_input`, set App-owned session overlay to `stopped`
- If stopped with `waiting_approval`, the related approval will transition to `canceled`
- In the session after stopping `active_approval_id` is `null`
- `canceled_approval` is non-`null` only if there is an active pending approval in the session targeted for stop
- If there is no active pending approval for stop, `canceled_approval` is `null`

#### request

```json
{}
```

#### response

```json
{
  "session": {
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "title": "Fix build error",
    "status": "stopped",
    "created_at": "2026-03-27T05:12:34Z",
    "updated_at": "2026-03-27T05:24:00Z",
    "started_at": "2026-03-27T05:13:00Z",
    "last_message_at": "2026-03-27T05:23:00Z",
    "active_approval_id": null,
    "current_turn_id": null,
    "app_session_overlay_state": "closed"
  },
  "canceled_approval": {
    "approval_id": "apr_001",
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "status": "canceled",
    "resolution": "canceled",
    "approval_category": "external_side_effect",
    "summary": "Run git push",
    "reason": "Codex requests permission to push changes to remote.",
    "operation_summary": "git push origin main",
    "created_at": "2026-03-27T05:18:00Z",
    "resolved_at": "2026-03-27T05:24:00Z",
    "native_request_kind": "approval_request"
  }
}
```

#### errors

- `404 session_not_found`
- `409 session_invalid_state`

---

## 11.3 Message system

### `GET /api/v1/sessions/{session_id}/messages`

Return message projection history.

#### semantics

-
- The runtime that returns the result of projecting message type items from App Server item history may be constructed each time from native history or may use projection cache.
- Message restoration is history-led, while stable `message_id` assignment remains a runtime concern.

#### query

- `limit` Optional. Default 100
- `cursor` Optional
- `sort` Optional. Default `created_at`

#### allowed sort values

- `created_at`
- `-created_at`

#### paging / sort rules

- If `sort=created_at`, the order is `created_at asc, message_id asc`
- If `sort=-created_at`, the order is `created_at desc, message_id desc`
- cursor paging assumes the above stable order corresponding to the specified sort

#### response

```json
{
  "items": [
    {
      "message_id": "msg_user_001",
      "session_id": "thread_001",
      "role": "user",
      "content": "Please fix the build error.",
      "created_at": "2026-03-27T05:14:00Z",
      "source_item_type": "user_message"
    },
    {
      "message_id": "msg_assistant_001",
      "session_id": "thread_001",
      "role": "assistant",
      "content": "I inspected the logs and updated the config.",
      "created_at": "2026-03-27T05:21:40Z",
      "source_item_type": "agent_message"
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

#### errors

- `404 session_not_found`

---

### `POST /api/v1/sessions/{session_id}/messages`

Accept user message.

#### semantics

- Start a new turn for the native thread and send the user message item
- The returned `message_id` is the stable internal/public message ID of the projected resource.
- Assistant generation and stream distribution continue asynchronously
- If there is another active session in the same workspace and the target session's `waiting_input -> running` transition cannot be allowed, a `409 session_conflict_active_exists`
- `client_message_id` is a required idempotent key
- If the request body is the same with the same `session_id` and `client_message_id`, allow idempotent success that returns an existing result
- If the request body is different, such as `content` with the same key Set to `409 message_idempotency_conflict`

#### request

```json
{
  "client_message_id": "msgclient_20260331_0001",
  "content": "Please explain the diff."
}
```

#### response `202 Accepted`

```json
{
  "message_id": "msg_user_002",
  "session_id": "thread_001",
  "role": "user",
  "content": "Please explain the diff.",
  "created_at": "2026-03-27T05:23:00Z",
  "source_item_type": "user_message"
}
```

#### errors

- `404 session_not_found`
- `409 session_invalid_state`
- `409 session_conflict_active_exists`
- `409 message_idempotency_conflict`
- `422 message_content_invalid`

You may return `details.current_status` if necessary.
`409 session_conflict_active_exists`, you may return `details.active_session_id` as needed.

example:

```json
{
  "error": {
    "code": "session_conflict_active_exists",
    "message": "another active session already exists in this workspace",
    "details": {
      "workspace_id": "ws_alpha",
      "active_session_id": "thread_999"
    }
  }
}
```

---

## 11.4 Event / Stream system

### `GET /api/v1/sessions/{session_id}/events`

Returns activity/event projection of session.

#### semantics

- Returns a stable event projection of native thread / turn / item / request notifications formatted for BFF
- This is not an API that returns a complete mirror of raw native event.

#### query

- `limit` Optional. Default 100
- `cursor` Optional
- `sort` Optional. Default `occurred_at`

#### allowed sort values

- `occurred_at`
- `-occurred_at`

#### paging / sort rules

- If `sort=occurred_at`, the order is `occurred_at asc, sequence asc, event_id asc`
- If `sort=-occurred_at`, the order is `occurred_at desc, sequence desc, event_id desc`
- cursor paging assumes the above stable order corresponding to the specified sort
- session event resource `occurred_at` must be monotonically non-decreasing with the same order as `sequence` within the same session

#### response

```json
{
  "items": [
    {
      "event_id": "evt_001",
      "session_id": "thread_001",
      "event_type": "session.status_changed",
      "sequence": 1,
      "occurred_at": "2026-03-27T05:13:00Z",
      "payload": {
        "from_status": "created",
        "to_status": "running"
      },
      "native_event_name": "turn/started"
    },
    {
      "event_id": "evt_002",
      "session_id": "thread_001",
      "event_type": "approval.requested",
      "sequence": 8,
      "occurred_at": "2026-03-27T05:18:00Z",
      "payload": {
        "approval_id": "apr_001",
        "summary": "Run git push"
      },
      "native_event_name": "request/started"
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

#### errors

- `404 session_not_found`

---

### `GET /api/v1/sessions/{session_id}/stream`

session-only SSE stream.

#### SSE envelope

```json
{
  "event_id": "evt_001",
  "session_id": "thread_001",
  "event_type": "message.assistant.delta",
  "sequence": 12,
  "occurred_at": "2026-03-27T05:20:10Z",
  "payload": {
    "message_id": "msg_assistant_003",
    "delta": "Updated the config"
  },
  "native_event_name": "item/agent_message/delta"
}
```

#### remarks

- `sequence` is required
- runtime numbers for internal session stream
- `sequence` is the primary ordering contract; `occurred_at` is supplementary metadata
- keepalive allows comment line or keepalive event
- does not provide replay by `Last-Event-ID`
- raw native event name can be kept in `native_event_name`, but client can use `event_type` be the original

---

## 11.5 Approval series

### `GET /api/v1/approvals`

Returns the approval projection list.

#### semantics

- List of native request flow projected to WebUI resource
- Original copy for global approval screen and badge update
- Native history alone is insufficient, so this resource is backed by runtime-managed approval projection/state

#### query

- `status` Optional. Default `pending`
- `workspace_id` Optional
- `limit` Optional. Default 50
- `cursor` Optional
- `sort` Optional. Default `-created_at`

#### allowed sort values

- `created_at`
- `-created_at`

#### paging / sort rules

- If `sort=created_at`, the order is `created_at asc, approval_id asc`
- If `sort=-created_at`, the order is `created_at desc, approval_id desc`
- cursor paging assumes the above stable order corresponding to the specified sort

#### response

```json
{
  "items": [
    {
      "approval_id": "apr_001",
      "session_id": "thread_001",
      "workspace_id": "ws_alpha",
      "status": "pending",
      "resolution": null,
      "approval_category": "external_side_effect",
      "summary": "Run git push",
      "reason": "Codex requests permission to push changes to remote.",
      "operation_summary": "git push origin main",
      "created_at": "2026-03-27T05:18:00Z",
      "resolved_at": null,
      "native_request_kind": "approval_request"
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

---

### `GET /api/v1/approvals/{approval_id}`

Return approval details.

#### response

```json
{
  "approval_id": "apr_001",
  "session_id": "thread_001",
  "workspace_id": "ws_alpha",
  "status": "pending",
  "resolution": null,
  "approval_category": "external_side_effect",
  "summary": "Run git push",
  "reason": "Codex requests permission to push changes to remote.",
  "operation_summary": "git push origin main",
  "context": {
    "command": "git push origin main"
  },
  "created_at": "2026-03-27T05:18:00Z",
  "resolved_at": null,
  "native_request_kind": "approval_request"
}
```

#### errors

- `404 approval_not_found`

---

### `POST /api/v1/approvals/{approval_id}/resolve`

An internal-only action that resolves approval.

#### semantics

- Returns a client response to a native request façade action
- `approved` is equivalent to native allow
- `denied` is equivalent to native deny
- If the same resolution has already been determined, allow idempotent success that returns the latest status

#### request

```json
{
  "resolution": "approved"
}
```

or

```json
{
  "resolution": "denied"
}
```

#### response

```json
{
  "approval": {
    "approval_id": "apr_001",
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "status": "approved",
    "resolution": "approved",
    "approval_category": "external_side_effect",
    "summary": "Run git push",
    "reason": "Codex requests permission to push changes to remote.",
    "operation_summary": "git push origin main",
    "created_at": "2026-03-27T05:18:00Z",
    "resolved_at": "2026-03-27T05:19:00Z",
    "native_request_kind": "approval_request"
  },
  "session": {
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "title": "Fix build error",
    "status": "running",
    "created_at": "2026-03-27T05:12:34Z",
    "updated_at": "2026-03-27T05:19:00Z",
    "started_at": "2026-03-27T05:13:00Z",
    "last_message_at": "2026-03-27T05:18:00Z",
    "active_approval_id": null,
    "current_turn_id": "turn_009",
    "app_session_overlay_state": "open"
  }
}
```

#### errors

- `404 approval_not_found`
- `409 approval_not_pending`
- `422 approval_resolution_invalid`

---

### `GET /api/v1/approvals/summary`

Returns the global summary for Home aggregation.

#### response

```json
{
  "pending_approval_count": 2,
  "updated_at": "2026-03-27T05:22:00Z"
}
```

---

### `GET /api/v1/approvals/stream`

approval global SSE stream。

#### SSE envelope

```json
{
  "event_id": "evt_apr_001",
  "session_id": "thread_001",
  "event_type": "approval.requested",
  "occurred_at": "2026-03-27T05:18:00Z",
  "payload": {
    "approval_id": "apr_001",
    "workspace_id": "ws_alpha",
    "summary": "Run git push",
    "approval_category": "external_side_effect"
  },
  "native_event_name": "request/started"
}
```

#### remarks

- `sequence` is not required in the global approval stream
- The original sequence is corrected by REST reacquisition instead of the transport arrival order.

---

## 12. Correspondence between internal schema and public schema

## 12.1 Basic policy

- Internal schema and public schema do not assume exact match
- `frontend-bff` is in charge of field mapping and masking of unnecessary fields
- Action endpoint should have internal / public shape as much as possible
- Read model allows differences due to UI convenience
- For ID, keep `session_id` aligned with native thread identity and keep `message_id` / `approval_id` / `event_id` aligned as runtime-managed contract IDs across internal/public

## 12.2 Workspace support

| internal | public | Notes |
|---|---|---|
Use as is |
| `created_at` | `created_at` | Use as is |
| `updated_at` | `updated_at` | Align as aggregation time |
| `active_session_summary` | `active_session_summary` | Can be used as is |
| `pending_approval_count` | `pending_approval_count` | Used as is |
| `directory_name` | None | Not exposed to public |
| `active_session_id` | None | Internally used by BFF as needed |

## 12.3 Session support

| internal | public | Notes |
|---|---|---|
| `session_id` | `session_id` | Use native thread ID as is |
| `workspace_id` | `workspace_id` | Use as is |
| `title` | `title` | Use as is |
| `status` | `status` | Use as is |
| `created_at` | `created_at` | |
| `updated_at` | `updated_at` | Use as is |
| `started_at` | `started_at` | Use as is |
| `last_message_at` | `last_message_at` | Use as is |
| `active_approval_id` | |
| `current_turn_id` | None | Not exposed to public |
| `app_session_overlay_state` | None | Not exposed to public |
| None | `can_send_message` | BFF derived from `status` |
| None | `can_start` | BFF active with `status` Derived from constraints |
| None | `can_stop` | BFF derived from `status` |

## 12.4 Message response

| internal | public | Notes |
|---|---|---|
| `message_id` | `message_id` | Use runtime-managed stable message ID as is |
| `session_id` | `session_id` | Use thread ID as is |
| `role` | `role` | Use as is |
| `content` | `content` | Use as is |
| `created_at` | `created_at` | Use as is |
| `source_item_type` | None | Normally not exposed to public |

## 12.5 Approval support

| internal | public | Notes |
|---|---|---|
| `approval_id` | `approval_id` | Use runtime-managed stable approval ID |
| `session_id` | `session_id` | Use as is |
| `workspace_id` | `workspace_id` | Use as is |
| `status` | `status` | Use as is |
| `resolution` | `resolution` | Use as is |
| `approval_category` | `approval_category` | Use as is |
| `summary` | `title` | Name conversion |
| `reason` | `description` | Name conversion |
| `created_at` | `requested_at` | Name conversion |
| `resolved_at` | `resolved_at` | Use as is |
| `operation_summary` | `operation_summary` | Details Can be exposed in API. Can be omitted in summary/list |
| `context` | `context` | Can only be exposed in the detailed API |
| `native_request_kind` | None | Normally not exposed to public |

## 12.6 Event response

| internal | public | Notes |
|---|---|---|
Use as is |
| `event_type` | `event_type` | Use as is |
| `event_id` | `event_id` | Use runtime-managed stable event ID as is |
| `sequence` | `sequence` | Use runtime-managed canonical ordering as is in session stream |
| `occurred_at` | `occurred_at` | Use as is |
| `payload` | `payload` | Use as is |
| `native_event_name` | None | Normally not exposed to public |

## 12.7 Home support

public:

- `GET /api/v1/home`

internal:

- `GET /api/v1/workspaces`
- `GET /api/v1/approvals/summary`

BFF combines these and returns the following:

```json
{
  "workspaces": [],
  "pending_approval_count": 0,
  "updated_at": "2026-03-27T05:22:00Z"
}
```

## 12.8 Approval action support

public:

- `POST /api/v1/approvals/{approval_id}/approve`
- `POST /api/v1/approvals/{approval_id}/deny`

internal:

- `POST /api/v1/approvals/{approval_id}/resolve`

BFF converts to `approve -> {"resolution":"approved"}`,
`deny -> {"resolution":"denied"}`.

## 12.9 Stop response response

public returns `session` and `canceled_approval`.
internal also maintains the same shape and reduces the conversion burden on BFF.

`canceled_approval` is non-`null` only when the active pending approval is resolved to `canceled` by stop.
approval For stop without cancellation, `canceled_approval` is `null`.

---

## 13. Error specifications

## 13.1 Common envelope

```json
{
  "error": {
    "code": "session_conflict_active_exists",
    "message": "another active session already exists in this workspace",
    "details": {
      "workspace_id": "ws_alpha",
      "active_session_id": "thread_999"
    }
  }
}
```

## 13.2 HTTP Status

- `400 Bad Request`
- `404 Not Found`
- `409 Conflict`
- `422 Unprocessable Entity`
- `500 Internal Server Error`
- `503 Service Unavailable`

## 13.3 Main error.code

### workspace

- `workspace_not_found`
- `workspace_root_not_found`
- `workspace_name_invalid`
- `workspace_name_reserved`
- `workspace_name_conflict`
- `workspace_name_normalized_conflict`

### session

- `session_not_found`
- `session_invalid_state`
- `session_conflict_active_exists`
- `session_title_invalid`
- `message_content_invalid`
- `message_idempotency_conflict`
- `session_runtime_error`

### approval

- `approval_not_found`
- `approval_not_pending`
- `approval_resolution_invalid`

---

## 14. Implementation notes

- The final guarantee of the active session constraint should be placed on the `codex-runtime` side.
- A design that allows exclusive control on a workspace basis is desirable.
- The App Server thread history should be the original as much as possible.
- Message / approval / event should be constructed by projecting from the native primitive.
- `message.assistant.delta` can be treated as a transient event for streams.
- `message.assistant.completed` is a confirmed event of message projection
- BFF does not renumber events
- BFF does not break the domain shape as much as possible except for Home aggregation
- Internal fields unnecessary for public API are masked with BFF
- `session start` is not a native strict primitive but an App-owned façade action
- `sequence` is runtime-managed canonical ordering for session stream
- Runtime assigns stable keys for message / approval / event projection because native IDs are insufficient as contract IDs.

---

## 15. Undecided matters

- To what extent can raw native events be used without projection?
- `completed` / `failed` / `stopped` should be replaced by thread façade How to explicitly mark
- Retention period and rebuild policy for projection cache
- Whether to include `system` role item in future public / internal message projection
- Default `limit` final value of pagination

---

## 16. Minimum summary

The main points of this internal API specification are as follows.

- Runtime is App-specific state and projection system of record
- The original copy of conversation native history is left to App Server thread / turn / item
- `workspace` is App-specific resource
- `session` is façade of App Server thread
- `message` is message-based subset of item projection
- `approval` is the façade of the native request flow
- Complex operations of session / approval / message / stop are handled atomically by the runtime
- BFF is explicitly responsible for the correspondence between internal schema and public schema
- Reuse native thread identity where possible, but keep message / approval / event contract IDs on the runtime side
- `session create`
- `sequence` is treated as a stable sequential number only for session streams, and is not required for global approval streams.


---

## 17. Additional rules fixed in this version (v0.8)

- `completed` is used only when the runtime/app-server side determines that the session has ended.
- 1 turn completion is in principle `waiting_input`
- Maximum of 1 concurrent pending approval per session
- Conversation facts on the native side are the App Server original, public status, overlay, stable approval ID, and sequence are the app-owned original.
- Composite operations specify success bounds and partial failure compensation and converge with realignment
- `POST /sessions/{session_id}/messages` assumes duplication suppression by `client_message_id`
- `start` / `stop` / `resolve` allows idempotent success on retransmission
