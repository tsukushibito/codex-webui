# Codex WebUI Public API Specification v0.8

## 1. Purpose of the document

This specification defines the contract for the **Public API** in Codex WebUI MVP.
The targets are the following three systems provided by `frontend-bff` from the same origin.

- REST API
- SSE stream
- Public data format for browsers

This specification serves as the standard for UI implementation and internal API design.
Prioritize that **Home/Chat/Approval 3 screens are completed on a smartphone** over internal circumstances.

In this version, we will clarify whether each resource of the public API is a native primitive itself or a façade / projection for WebUI, assuming Codex App Server's **Thread / Turn / Item / request flow**.

---

## 2. Scope and assumptions

### 2.1 Scope of application

This specification applies to the public API under `/api/v1`.

### 2.2 Assumptions

- The public boundary is only `frontend-bff`
- `codex-runtime` is not exposed externally
- Single user assumption
- Authentication and authorization are delegated to Dev Tunnels side, app-specific authentication is not provided by MVP
- Initial display is REST, differential update is SSE
- Consistency after SSE reconnection is REST
- The target workspace is limited to `/workspaces`
- Codex App Server handles it on the assumption that it has **thread / turn / item** as a native primitive of the conversation.

### 2.3 Non-targeted

- Fixed internal API specifications
- Event retransmission with complete replay
- Permission control for multi-person sharing
- workspace rename / delete
- session delete / archive
- Exposure of the entire native protocol of App Server

---

## 3. Design policy

### 3.1 version

The base path of the public API is as follows.

```text
/api/v1
```

### 3.2 Data format

- Content-Type is based on JSON
- SSE uses `text/event-stream`
- JSON field name and query parameter name are `snake_case`
- Date and time are UTC RFC 3339 strings, ending with `Z`
- ID exposed to API is opaque string

### 3.3 Resource policy in public APIs

Public API resources are divided into three types.

1. **App-specific resource**
 - Example: `workspace`
 - Have the original on the WebUI/runtime side

2. **native-oriented resource**
 - Example: `session`
 - Strongly supports native primitives of App Server

3. **façade / projection resource**
 - Examples: `message`, `approval`, `home`
 - Reading model that formats native primitives and internal events for UI

### 3.4 App Server alignment principles

This specification uses the following as a general rule.

- `workspace` is an App-side resource
- `session` is treated as a **public façade of the App Server thread**
- `message` is treated as a **resource that projects message type items among App Server items**
- `approval` is **a resource that projects server-initiated request / approval flow of App Server**
- SSE's `event_type` is a façade event for the UI and does not guarantee 1:1 correspondence with the native event name.

### 3.5 Normal response policy

A common `data` envelope is not provided as the outermost shell of a normal response.

- To get a single item, directly return the resource object
- To get a list, use `items` / `next_cursor` / `has_more`
- Aggregate endpoint for screen initialization directly returns a named field according to the purpose

This policy makes it possible to honestly express the aggregate response for Home and the restoration response for Chat.

---

## 4. ID Policy

### 4.1 Workspace

- `workspace_id` is an opaque ID managed by the App
- `workspace_id` is not an App Server native ID

### 4.2 Session

- `session_id` adopts **App Server thread ID**
- `session_id` of public API should, in principle, be an identifier that directly refers to the native thread

### 4.3 Message

- `message_id` is an app-owned stable ID for the public message resource
- Native item IDs may be used for internal correlation, but are not the public contract ID
- Not all items are messages
- `message` in public API is a subset of item

### 4.4 Approval

- `approval_id` is a runtime-managed stable ID for the public approval resource
- Native request IDs may be used for debug correlation, but are not the public contract ID

### 4.5 Event

- `event_id` should be able to uniquely identify the public SSE event
- In MVP, `event_id` is an app-owned/public event identifier
- Native event identity may be retained only for internal correlation/debug

---

## 5. Correspondence between screens and public API

### 5.1 Home

The Home screen handles the following:

- Workspace list
- Active session summary for each workspace
- Number of pending approvals
- Workspace creation

### 5.2 Chat

The Chat screen handles the following:

- session list
- session creation
- session start
- session details
- message history
- activity/event history
- message send
- session stop
- SSE stream for session

### 5.3 Approval

The Approval screen handles the following:

- pending approval list
- approval details
- approve / deny
- SSE stream for approval

---

## 6. Domain model

### 6.1 Workspace

```json
{
  "workspace_id": "ws_xxx",
  "workspace_name": "example_workspace",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:12:34Z",
  "active_session_summary": {
    "session_id": "thread_abc123",
    "status": "running",
    "last_message_at": "2026-03-27T05:20:00Z"
  },
  "pending_approval_count": 1
}
```

#### supplement

- `workspace` is an App-specific resource
- `updated_at` is treated as aggregation time that includes state changes of subordinate sessions / approvals in addition to workspace itself
- `active_session_summary` is **only when there is an active session** Non-`null`

### 6.2 Session

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
  "can_send_message": true,
  "can_start": false,
  "can_stop": true
}
```

#### supplement

- `session` is the public façade of the App Server thread.
- `session_id` is the native thread ID
- `can_send_message` / `can_start` / `can_stop` are UI auxiliary fields,
- `status` is the public façade of WebUI, which BFF derives from the public state, and the native A summary of thread / turn lifecycle for UI.

### 6.3 Message

```json
{
  "message_id": "msg_001",
  "session_id": "thread_abc123",
  "role": "assistant",
  "content": "I updated the config file.",
  "created_at": "2026-03-27T05:21:40Z"
}
```

#### supplement

- `message` is a projection that extracts only those items that should be displayed as chat bubbles.
- `message_id` is a public stable key assigned by runtime/BFF for the projected message resource.
- Public message restoration is history-led, while native item identity is only correlation material.
- Items such as tool execution, diff, approval request, etc. are, in principle, `events` or `approval` rather than `message` resources. Whether to include the `system` role in
- public `/messages` will be expanded in the future, and MVP assumes `user` / `assistant`.

### 6.4 ApprovalSummary

```json
{
  "approval_id": "apr_001",
  "session_id": "thread_abc123",
  "workspace_id": "ws_xxx",
  "status": "pending",
  "resolution": null,
  "approval_category": "external_side_effect",
  "title": "Run git push",
  "description": "Codex requests permission to push changes to remote.",
  "requested_at": "2026-03-27T05:18:00Z",
  "resolved_at": null
}
```

#### supplement

- `approval` is the public façade for native approval / input request flow. Then, fix it and consider only adding backward compatible enums when expanding in the future.
- `approval_id` is a public stable key managed by runtime.
- Approval restoration uses runtime-managed approval state because native history alone does not preserve approval payload or resolution metadata.

### 6.5 ApprovalDetail

```json
{
  "approval_id": "apr_001",
  "session_id": "thread_abc123",
  "workspace_id": "ws_xxx",
  "status": "pending",
  "resolution": null,
  "approval_category": "external_side_effect",
  "title": "Run git push",
  "description": "Codex requests permission to push changes to remote.",
  "operation_summary": "git push origin main",
  "requested_at": "2026-03-27T05:18:00Z",
  "resolved_at": null,
  "context": {
    "command": "git push origin main"
  }
}
```

#### supplement

- Returns `ApprovalSummary` for list and `ApprovalDetail` for details
- `operation_summary` and `context` are exposed in details API

### 6.6 Session Status Enum

- `created`
- `running`
- `waiting_input`
- `waiting_approval`
- `completed`
- `failed`
- `stopped`

#### supplement

- This is the state for the UI of the public API, and does not directly expose the state of the native thread / turn / item.
- `created` is the public state immediately after the session resource is created.
- `running` is the public progress state including the execution of the native turn.
- `waiting_input` is the waiting state for interaction in which you can normally send messages.
- `waiting_approval` is a public state that includes waiting for a client response to a native request.
- `failed` is a runtime-determined failure state and is not assumed to be a native terminal session status. If the user can retry in the same session, `waiting_input` returns `error.raised`.
- `completed` is also a runtime/WebUI decision and is not assumed to be a native terminal session status.
- `stopped` is a terminal state based on the user's or system's intention to stop.

### 6.7 Approval Status Enum

- `pending`
- `approved`
- `denied`
- `canceled`

### 6.8 Approval Resolution Enum

- `approved`
- `denied`
- `canceled`

`status` represents the current status of the approval resource.
`resolution` represents the resolution result of the resolved approval, and is `null` during `pending`.

---

## 7. Correspondence between native primitive and public resource

| Public concept | Native compatible | Type | Notes |
|---|---|---|---|
| `workspace` | None | App-specific | Original copy on the App / runtime side |
| `session` | `thread` | façade | Subset of `item` | projection | chat bubble display only |
| `approval` | server-initiated request flow | façade | convert native request into UI resource |
| session stream | thread / turn / item notification group | façade stream | may be formatted for UI |
| approval stream | request / resolution notification group | façade stream |

---

## 8. State constraints

### 8.1 active session constraint

Only one session can be considered active at the same time in the same workspace.

Active in MVP is as follows.

- `running`
- `waiting_approval`

The following is not active.

- `created`
- `waiting_input`
- `completed`
- `failed`
- `stopped`

### 8.2 message sending constraints

`POST /sessions/{session_id}/messages` is generally accepted only for `waiting_input` sessions.

Main rejection conditions:

- `created`
- `running`
- `waiting_approval`
- `completed`
- `failed`
- `stopped`

### 8.3 approval constraints

Approve / deny can only be executed for `pending` approval.
If it has already been resolved, the latest status may be returned if it is **resending the same operation**, or `409 Conflict` if it is a different operation.

In addition, MVP imposes the following constraints:

- At most one concurrent pending approval per session
- `active_approval_id` refers to that single pending approval
- Before executing an approval, the client must be able to see at least `approval_category`, `title`, `description`, `operation_summary`, `requested_at`, or equivalent
- If the list alone is insufficient confirmation information, the client first retrieves `GET /approvals/{approval_id}`
- Public approval state is restored from runtime-managed projection/state rather than native history alone

### 8.4 session state transition

The basic transition of session in MVP is as follows.

- `created -> running`
- `running -> waiting_input`
- `running -> waiting_approval`
- `running -> completed`
- `running -> failed`
- `running -> stopped`
- `waiting_input -> running`
- `waiting_input -> stopped`
- `waiting_approval -> running`
 On approval. approval becomes `approved`
- `waiting_approval -> waiting_input`
 When rejected. approval becomes `denied`
- `waiting_approval -> stopped`
 when stopped. approval becomes `canceled`

The following are terminal states.

- `completed`
- `failed`
- `stopped`

`waiting_input` is a state where the assistant response is once completed and the next user input can be accepted**.
`completed` is a state in which the runtime determines that the session is **terminal state on WebUI** and will no longer accept `POST /sessions/{session_id}/messages`.

Note:
- As a general rule, the completion of a single turn should be returned to `waiting_input`
- You can transition to `completed` only when the runtime / app-server side can determine that "this session has completed"
- A session that has become `completed` can be referenced as a starting point for creating a new session, but it has the same `session_id`
- `failed` is used only when runtime determines that the execution has failed and the continuation of the same session should be terminated. is used only as a termination point based on the user's or system's intention to stop.

### 8.5 `can_*` Derivation Rule

- `can_send_message = true` condition: `status == waiting_input`
- `can_start = true` condition: `status == created` and there is no other active session in the same workspace
- `can_stop = true` condition: `status in {running, waiting_input, waiting_approval}`

## 9. REST API list

### 9.1 Home series

#### 9.1.1 GET `/api/v1/home`

Returns the aggregated data required for the initial display of the Home screen.

##### response

```json
{
  "workspaces": [
    {
      "workspace_id": "ws_alpha",
      "workspace_name": "alpha",
      "created_at": "2026-03-27T05:12:34Z",
      "updated_at": "2026-03-27T05:22:00Z",
      "active_session_summary": {
        "session_id": "thread_001",
        "status": "running",
        "last_message_at": "2026-03-27T05:21:40Z"
      },
      "pending_approval_count": 1
    }
  ],
  "pending_approval_count": 2,
  "updated_at": "2026-03-27T05:22:00Z"
}
```

##### notes

- Home Allowed as aggregation endpoint for initial rendering
- Paging is not provided in MVP because the number of items is small.

---

#### 9.1.2 GET `/api/v1/workspaces`

Returns a list of workspaces.

##### query

- `sort` Optional. Default is `-updated_at`
- `limit` Optional. Default 100
- `cursor` Optional

##### allowed sort values

- `updated_at`
- `-updated_at`

##### paging / sort rules

- If `sort=updated_at`, the order is `updated_at asc, workspace_id asc`
- If `sort=-updated_at`, the order is `updated_at desc, workspace_id desc`
- cursor paging assumes the above stable order corresponding to the specified sort

##### response

```json
{
  "items": [
    {
      "workspace_id": "ws_alpha",
      "workspace_name": "alpha",
      "created_at": "2026-03-27T05:12:34Z",
      "updated_at": "2026-03-27T05:22:00Z",
      "active_session_summary": null,
      "pending_approval_count": 0
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

---

#### 9.1.3 POST `/api/v1/workspaces`

Create a new workspace.

##### request body

```json
{
  "workspace_name": "alpha"
}
```

##### validation

- No empty characters
- Length is between 1 and 64
- Allowed characters are lowercase letters, numbers, `-`, `_`
- The first character is lowercase letters or numbers
- `.` and `..` are prohibited
- `/`, `\`, spaces are not allowed
- Trailing `-`, `_` is not allowed
- Duplicate determination is performed using the value after lowercase letter normalization
- Use `workspace_name` as is for the actual directory name
- Duplicate names are not allowed

##### response `201 Created`

```json
{
  "workspace_id": "ws_alpha",
  "workspace_name": "alpha",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:12:34Z",
  "active_session_summary": null,
  "pending_approval_count": 0
}
```

##### errors

- `422 workspace_name_invalid`
- `422 workspace_name_reserved`
- `409 workspace_name_conflict`
- `409 workspace_name_normalized_conflict`

---

#### 9.1.4 GET `/api/v1/workspaces/{workspace_id}`

Return workspace details.

##### response

```json
{
  "workspace_id": "ws_alpha",
  "workspace_name": "alpha",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:22:00Z",
  "active_session_summary": {
    "session_id": "thread_001",
    "status": "running",
    "last_message_at": "2026-03-27T05:21:40Z"
  },
  "pending_approval_count": 1
}
```

##### errors

- `404 workspace_not_found`

---

### 9.2 Chat / Session

#### 9.2.1 GET `/api/v1/workspaces/{workspace_id}/sessions`

Returns a list of sessions under the specified workspace.

##### query

- `limit` Optional. Default 20
- `cursor` Optional
- `sort` Optional. Default `-updated_at`

##### allowed sort values

- `updated_at`
- `-updated_at`

##### paging / sort rules

- If `sort=updated_at`, the order is `updated_at asc, session_id asc`
- If `sort=-updated_at`, the order is `updated_at desc, session_id desc`
- cursor paging assumes the above stable order corresponding to the specified sort

##### response

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
      "can_send_message": true,
      "can_start": false,
      "can_stop": true
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

##### errors

- `404 workspace_not_found`

---

#### 9.2.2 POST `/api/v1/workspaces/{workspace_id}/sessions`

Create a session. The state immediately after creation is `created`.

##### semantics

- Create a new session resource
- Allocate the corresponding native thread
- The returned `session_id` should be the native thread ID
- Normally messages cannot be sent at this point
- `create` itself is allowed even if there is an active session in the same workspace

##### request body

```json
{
  "title": "Fix build error"
}
```

##### response `201 Created`

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
  "can_send_message": false,
  "can_start": true,
  "can_stop": false
}
```

Note:
- If there is another active session in the same workspace, `can_start` can be `false` even in this response.

##### errors

- `404 workspace_not_found`
- `422 session_title_invalid`

---

#### 9.2.3 POST `/api/v1/sessions/{session_id}/start`

`created` Start a session.

##### semantics

- This endpoint is a **public façade action**
- Does not guarantee 1:1 correspondence with a single operation of App Server native protocol
- May include active session selection in WebUI, necessary bootstrap, and initial execution start
- May return `running` immediately after return
- After that, `waiting_input` upon completion of initial processing
- Allows idempotent success that returns the latest session state if the same start has already succeeded.

##### request body

Allows empty objects.

```json
{}
```

##### response

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
  "can_send_message": false,
  "can_start": false,
  "can_stop": true
}
```

##### errors

- `404 session_not_found`
- `409 session_invalid_state`
- `409 session_conflict_active_exists`

---

#### 9.2.4 GET `/api/v1/sessions/{session_id}`

Return session details.

##### response

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
  "can_send_message": true,
  "can_start": false,
  "can_stop": true
}
```

##### errors

- `404 session_not_found`

---

#### 9.2.5 GET `/api/v1/sessions/{session_id}/messages`

Return message history. Used to restore Chat text.

##### semantics

- The public API's `messages` returns only items that should be displayed as chat bubbles, not all native items.

##### query

- `limit` Optional. Default 100
- `cursor` Optional
- `sort` Optional. Default `created_at`

##### allowed sort values

- `created_at`
- `-created_at`

##### paging / sort rules

- If `sort=created_at`, the order is `created_at asc, message_id asc`
- If `sort=-created_at`, the order is `created_at desc, message_id desc`
- cursor paging assumes the above stable order corresponding to the specified sort

##### response

```json
{
  "items": [
    {
      "message_id": "msg_user_001",
      "session_id": "thread_001",
      "role": "user",
      "content": "Please fix the build error.",
      "created_at": "2026-03-27T05:14:00Z"
    },
    {
      "message_id": "msg_assistant_001",
      "session_id": "thread_001",
      "role": "assistant",
      "content": "I inspected the logs and updated the config.",
      "created_at": "2026-03-27T05:21:40Z"
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

##### errors

- `404 session_not_found`

---

#### 9.2.6 GET `/api/v1/sessions/{session_id}/events`

Return activity/event history that includes anything other than message. Its main uses are session restoration and activity log display.

##### semantics

- This endpoint returns activity projection for UI
- The payload does not guarantee that native thread / turn / item notifications will be exposed as is.

##### query

- `limit` Optional. Default 100
- `cursor` Optional
- `sort` Optional. Default `occurred_at`

##### allowed sort values

- `occurred_at`
- `-occurred_at`

##### paging / sort rules

- If `sort=occurred_at`, the order is `occurred_at asc, sequence asc, event_id asc`
- If `sort=-occurred_at`, the order is `occurred_at desc, sequence desc, event_id desc`
- cursor paging assumes the above stable order corresponding to the specified sort
- session event resource holds the same session unit `sequence` as stream
- `occurred_at` of session event resource must be monotonically non-decreasing in the same order as `sequence` within the same session

##### response

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
      }
    },
    {
      "event_id": "evt_002",
      "session_id": "thread_001",
      "event_type": "approval.requested",
      "sequence": 8,
      "occurred_at": "2026-03-27T05:18:00Z",
      "payload": {
        "approval_id": "apr_001",
        "title": "Run git push"
      }
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

##### notes

- `messages` and `events` are separated
- This is to separate the responsibilities of Chat bubble drawing and activity log.

##### errors

- `404 session_not_found`

---

#### 9.2.7 POST `/api/v1/sessions/{session_id}/messages`

Send user messages.

##### semantics

- Displayed as one user message sent in the public API
- Native corresponds to a new user input item. Can be accompanied by start of turn execution.
- `202 Accepted` means that acceptance and persistence of the message and recording necessary to start turn have been completed.
- There is another active session in the same workspace, and the target session's `waiting_input -> running` If the transition cannot be allowed, set `409 session_conflict_active_exists`
- `client_message_id` is required and is an idempotent key for the client to retry the same transmission
- If the request body is the same with the same `session_id` and `client_message_id`, runtime / BFF allows idempotent success that returns existing results
- If the same `session_id` and `client_message_id` have different request bodies such as `content`, `409 Conflict` will be returned.
- The returned `message_id` is the stable public message ID, not the native item ID.

##### request body

```json
{
  "client_message_id": "msgclient_20260331_0001",
  "content": "Please explain the diff."
}
```

##### response `202 Accepted`

```json
{
  "message_id": "msg_user_002",
  "session_id": "thread_001",
  "role": "user",
  "content": "Please explain the diff.",
  "created_at": "2026-03-27T05:23:00Z"
}
```

##### errors

- `404 session_not_found`
- `409 session_invalid_state`
- `409 session_conflict_active_exists`
- `409 message_idempotency_conflict`
- `422 message_content_invalid`

##### error details

In case of `409 session_invalid_state`, the current state may be included in `details.current_status`.
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

#### 9.2.8 POST `/api/v1/sessions/{session_id}/stop`

Stop the `running` / `waiting_input` / `waiting_approval` session.

##### behavior

- If you stop with `running`, the session becomes `stopped`
- If you stop with `waiting_input`, the session becomes `stopped`
- If you stop with `waiting_approval`, the session becomes `stopped`
- If you stop with `waiting_approval`, the related active approval is Transition to `canceled` and `resolved_at` is set
- `active_approval_id` is `null` in the session after stop
- `canceled_approval` is non-`null` only if there is active pending approval in the session to be stopped
- stop where active pending approval does not exist Then, `canceled_approval` is `null`
- Retransmission of the same stop to a session that has already been stopped allows an idempotent success that returns the latest stopped status

##### request body

```json
{}
```

##### response

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
    "can_send_message": false,
    "can_start": false,
    "can_stop": false
  },
  "canceled_approval": {
    "approval_id": "apr_001",
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "status": "canceled",
    "resolution": "canceled",
    "approval_category": "external_side_effect",
    "title": "Run git push",
    "description": "Codex requests permission to push changes to remote.",
    "requested_at": "2026-03-27T05:18:00Z",
    "resolved_at": "2026-03-27T05:24:00Z"
  }
}
```

##### response example without canceled approval

```json
{
  "session": {
    "session_id": "thread_002",
    "workspace_id": "ws_alpha",
    "title": "Review docs",
    "status": "stopped",
    "created_at": "2026-03-27T06:00:00Z",
    "updated_at": "2026-03-27T06:05:00Z",
    "started_at": "2026-03-27T06:00:10Z",
    "last_message_at": "2026-03-27T06:04:30Z",
    "active_approval_id": null,
    "can_send_message": false,
    "can_start": false,
    "can_stop": false
  },
  "canceled_approval": null
}
```

##### errors

- `404 session_not_found`
- `409 session_invalid_state`

---

### 9.3 Approval series

#### 9.3.1 GET `/api/v1/approvals`

Returns the approval list. By default, only pending is returned, and each item is `ApprovalSummary`.

##### query

- `status` Optional. Default `pending`
- `workspace_id` Optional
- `limit` Optional. Default 50
- `cursor` Optional
- `sort` Optional. Default `-requested_at`

##### allowed sort values

- `requested_at`
- `-requested_at`

##### paging / sort rules

- If `sort=requested_at`, the order is `requested_at asc, approval_id asc`
- If `sort=-requested_at`, the order is `requested_at desc, approval_id desc`
- cursor paging assumes the above stable order corresponding to the specified sort
- List item If the information necessary for safety confirmation is insufficient, the client executes approve / deny after obtaining the details.

##### response

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
      "title": "Run git push",
      "description": "Codex requests permission to push changes to remote.",
      "requested_at": "2026-03-27T05:18:00Z",
      "resolved_at": null
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

##### notes

- The Approval screen is based on the global list
- If you want to narrow down to workspace units, specify `workspace_id` in query
- This resource is a public projection of native request / approval flow
- The public list is sourced from runtime-managed approval projection/state because native history alone is insufficient

---

#### 9.3.2 GET `/api/v1/approvals/{approval_id}`

Return approval details. The returned shape is `ApprovalDetail`.

##### response

```json
{
  "approval_id": "apr_001",
  "session_id": "thread_001",
  "workspace_id": "ws_alpha",
  "status": "pending",
  "resolution": null,
  "approval_category": "external_side_effect",
  "title": "Run git push",
  "description": "Codex requests permission to push changes to remote.",
  "operation_summary": "git push origin main",
  "requested_at": "2026-03-27T05:18:00Z",
  "resolved_at": null,
  "context": {
    "command": "git push origin main"
  }
}
```

##### errors

- `404 approval_not_found`

---

#### 9.3.3 POST `/api/v1/approvals/{approval_id}/approve`

approve

##### semantics

- Treat it as a façade action that sends an allow / approve response to the native request
- If successful, return the latest status of approval and session
- If the same approve is already `approved`, allow idempotent success that returns the latest status
- If it is already `denied` or `canceled`, use `409 approval_not_pending` as a separate operation

##### request body

```json
{}
```

##### response

```json
{
  "approval": {
    "approval_id": "apr_001",
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "status": "approved",
    "resolution": "approved",
    "approval_category": "external_side_effect",
    "title": "Run git push",
    "description": "Codex requests permission to push changes to remote.",
    "requested_at": "2026-03-27T05:18:00Z",
    "resolved_at": "2026-03-27T05:19:00Z"
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
    "can_send_message": false,
    "can_start": false,
    "can_stop": true
  }
}
```

##### errors

- `404 approval_not_found`
- `409 approval_not_pending`

---

#### 9.3.4 POST `/api/v1/approvals/{approval_id}/deny`

Reject approval.

##### semantics

- Treat it as a façade action that sends a deny response to the native request
- If successful, return the latest status of approval and session
- If the same deny is already `denied`, allow idempotent success that returns the latest status
- If it is already `approved` or `canceled`, use `409 approval_not_pending` as a separate operation

##### request body

```json
{}
```

##### response

```json
{
  "approval": {
    "approval_id": "apr_001",
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "status": "denied",
    "resolution": "denied",
    "approval_category": "external_side_effect",
    "title": "Run git push",
    "description": "Codex requests permission to push changes to remote.",
    "requested_at": "2026-03-27T05:18:00Z",
    "resolved_at": "2026-03-27T05:19:00Z"
  },
  "session": {
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "title": "Fix build error",
    "status": "waiting_input",
    "created_at": "2026-03-27T05:12:34Z",
    "updated_at": "2026-03-27T05:19:00Z",
    "started_at": "2026-03-27T05:13:00Z",
    "last_message_at": "2026-03-27T05:18:00Z",
    "active_approval_id": null,
    "can_send_message": true,
    "can_start": false,
    "can_stop": true
  }
}
```

##### errors

- `404 approval_not_found`
- `409 approval_not_pending`

---

## 10. SSE Specifications

### 10.1 Basic policy

- Initial display is obtained by REST
- Differential updates are received by SSE
- After SSE reconnection, re-obtain REST to ensure consistency as necessary
- Complete replay is not provided by MVP
- `Last-Event-ID` is not assumed

### 10.2 Stream Endpoint

#### 10.2.1 GET `/api/v1/sessions/{session_id}/stream`

Session-only stream for Chat screen.

Usage:

- assistant output difference
- assistant completion notification
- session state change
- approval occurrence/resolution
- session related error

#### 10.2.2 GET `/api/v1/approvals/stream`

Stream for Approval screen and global approval badge updates.

Usage:

- approval.requested
- approval.resolved

---

### 10.3 SSE envelope

Place the following JSON in `data:` on transport.

#### 10.3.1 session stream envelope

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
  }
}
```

#### envelope field

- `event_id`: Unique identifier for the public event managed by runtime/BFF
- `session_id`: The associated session.
- `event_type`: Façade event type for UI
- `sequence`: Monotonically increasing canonical number per session in `GET /sessions/{session_id}/stream`
- `occurred_at`: Occurrence time
- `payload`: Event-specific payload

#### Scope of sequence

- `sequence` is the session unit number that is common to session stream and `GET /sessions/{session_id}/events`.
- `sequence` is the primary ordering contract for session-scoped events, and `occurred_at` is supplementary metadata.

#### 10.3.2 global approval stream envelope

```json
{
  "event_id": "evt_apr_001",
  "session_id": "thread_001",
  "event_type": "approval.requested",
  "occurred_at": "2026-03-27T05:18:00Z",
  "payload": {
    "approval_id": "apr_001",
    "workspace_id": "ws_alpha",
    "title": "Run git push",
    "approval_category": "external_side_effect"
  }
}
```

#### Handling global streams

- `GET /api/v1/approvals/stream` does not require `sequence`
- The order of the global approval stream is based on the transport arrival order, and if re-alignment is necessary, it will be corrected by REST re-acquisition.

#### remarks

- Public SSE events do not guarantee 1:1 exposure of native thread / turn / item notifications
- BFF may be reconfigured into event units that are easier to handle on the UI

---

### 10.4 SSE event_type list

#### session type

- `session.status_changed`

All session status changes, including start and stop, are expressed as `session.status_changed`.
`from_status` / `to_status` are included in the payload.

#### message type

- `message.user`
- `message.assistant.delta`
- `message.assistant.completed`

#### approval type

- `approval.requested`
- `approval.resolved`

`approval.resolved` is emitted after runtime correlates native resolution facts with the tracked approval resource. Native resolution signal alone is not the public contract.

#### error type

- `error.raised`

#### keepalive

- Use comment line on transport
- UI does not display keepalive as user activity

---

### 10.5 Representative payload

#### `message.assistant.delta`

```json
{
  "message_id": "msg_assistant_003",
  "delta": "Updated the config"
}
```

#### `message.assistant.completed`

```json
{
  "message_id": "msg_assistant_003",
  "content": "Updated the config and reran the build.",
  "created_at": "2026-03-27T05:20:30Z"
}
```

#### `session.status_changed`

```json
{
  "from_status": "running",
  "to_status": "waiting_input"
}
```

#### `approval.requested`

```json
{
  "approval_id": "apr_001",
  "title": "Run git push",
  "approval_category": "external_side_effect"
}
```

#### `approval.resolved`

```json
{
  "approval_id": "apr_001",
  "resolution": "approved",
  "resolved_at": "2026-03-27T05:19:00Z"
}
```

This payload is based on the runtime-tracked approval resource, not on native history alone.

#### `error.raised`

```json
{
  "code": "session_runtime_error",
  "message": "codex runtime exited unexpectedly"
}
```

`error.raised` is an execution/error projection and is distinct from terminal session `failed`.

---

## 11. Error response

### 11.1 Common envelope

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

### 11.2 Main HTTP Status

- `400 Bad Request`: Invalid syntax level
- `404 Not Found`: Target resource does not exist
- `409 Conflict`: State conflict/invalid state transition
- `422 Unprocessable Entity`: Value rule violation
- `500 Internal Server Error`: Unexpected error
- `503 Service Unavailable`: backend dependency temporarily unavailable

### 11.3 Major error.code

#### workspace

- `workspace_not_found`
- `workspace_name_invalid`
- `workspace_name_reserved`
- `workspace_name_conflict`
- `workspace_name_normalized_conflict`

#### session

- `session_not_found`
- `session_invalid_state`
- `session_conflict_active_exists`
- `session_title_invalid`
- `message_content_invalid`
- `message_idempotency_conflict`
- `session_runtime_error`

#### approval

- `approval_not_found`
- `approval_not_pending`

---

## 12. Operational rules for UI implementation

### 12.1 Home

- Use `GET /home` for the first display.
- `workspace.updated_at` is treated as the time when the status of the subordinate session or approval last changed, in addition to creating and updating the workspace itself.
- After creating the workspace, the returned resource can be reflected in the list as is.
- To update the approval badge, use `GET /approvals?status=pending` to re-obtain or Use `/approvals/stream`

### 12.2 Chat

- For the first display, you can obtain the following in parallel
 - `GET /sessions/{session_id}`
 - `GET /sessions/{session_id}/messages`
 - `GET /sessions/{session_id}/events`
- Then connect `GET /sessions/{session_id}/stream`
- stream After disconnection, session / messages / Re-fetch events to ensure consistency
- Interim output of assistant is displayed by concatenating `message.assistant.delta`
- When completed, `message.assistant.completed` is positive
- `messages` is implemented on the assumption that not all items are included.

### 12.3 Approval

- Approval screen is drawn based on `GET /approvals`
- After approve / deny, `approval` and `session` in the response can be reflected locally as is.
- If `canceled_approval` is returned by stop, both the Approval list and Chat can be locally updated.
- stop allows `canceled_approval` to be reflected locally. If it is `null`, local updates on the approval side may not be necessary
- If you are concerned about the consistency of the entire screen, re-obtain `GET /approvals?status=pending`

---

## 13. Design not adopted

### 13.1 Don't make `workspace_name` the path primary key

reason:

- rename It is easy to break the contract when introducing
- I want to separate the responsibility of display name and identifier.

### 13.2 Do not unify normal responses to `data` envelope

reason:

- Home aggregate response becomes redundant
- Direct return of single object is simpler in MVP UI implementation

### 13.3 Do not combine messages and events into one API

reason:

- Chat bubble and activity log have different responsibilities
- If all items are set as messages, the UI becomes complicated.

### 13.4 Do not expose native protocols as is

reason:

- App Server's native primitives are Thread / Turn / Item / request flow, and the granularity is too low to handle them as they are in the UI.

---

## 14. Points to note when recalculating future internal APIs

- Redefine the internal session resource as a thread façade assuming `session_id = thread_id`
- Make it clear that `message` is an item subset in both internal and public
- Keep the internal/public correspondence table consistent with `message_id` / `approval_id` / `event_id` as app-owned contract IDs
- session start / message send / approval resolve / stop
- Treat session stream `sequence` as runtime-managed canonical numbering
- Have a correspondence table between public SSE façade events and internal native events.

---

## 15. Undecided matters

At this time, the following are not fixed as public API specifications.

- `event:` on the SSE transport Fixed name scheme
- Final schema
- error `details` List of reserved words for `workspace_name_reserved`

---

## 16. Appendix: Typical screen initialization flow

### 16.1 Home

1. `GET /api/v1/home`
2. Connect `/api/v1/approvals/stream` if necessary

### 16.2 Chat

1. `GET /api/v1/sessions/{session_id}`
2. `GET /api/v1/sessions/{session_id}/messages`
3. `GET /api/v1/sessions/{session_id}/events`
4. `GET /api/v1/sessions/{session_id}/stream`

### 16.3 Approval

1. `GET /api/v1/approvals?status=pending`
2. If necessary `GET /api/v1/approvals/{approval_id}`
3. `GET /api/v1/approvals/stream`


---

## 17. Additional rules fixed in this version (v0.8)

- `completed` is used only when runtime determines that the WebUI is terminating
- `waiting_input` is a state in which dialogue can be continued, and a simple turn completion is basically returned here
- Maximum of 1 pending approval per session
- Approval Include in the API contract that the minimum confirmation information can be reached before execution
- `POST /sessions/{session_id}/messages` requires idempotency by `client_message_id`
- `start` / `stop` / `approve` / `deny` allows idempotent success on retransmission
- Include `sequence` in `GET /sessions/{session_id}/events` to create a session stream
- List endpoint should be consistent with stable sorting and cursor assumptions
