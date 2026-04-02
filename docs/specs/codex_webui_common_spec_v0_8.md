# Codex WebUI common specification v0.8

## 1. Purpose

This document defines the **common specifications** for Codex WebUI MVP.  
What is fixed here is limited to cross-cutting rules that span public API/internal API/SSE and are difficult to change later.

At this stage, as a general rule, the following should not be too fixed.

- Final response format of public API 
- Individual resource shape of internal API 
- Default sort
- `event:` name on SSE transport 
- Specific ID generation method (UUID / ULID, etc.)

---

## 2. Scope of application

This specification applies to:

- Public API
- Internal API
- SSE events
- Common data representation between client and server

---

## 3. Basic policy

- API version is `/api/v1` 
- Data format is JSON 
- Real-time update uses SSE 
- Initial display is REST, differential update is SSE 
- Consistency after SSE reconnection is performed by REST reacquisition 
- Full replay is not covered by MVP 
- Change API be idempotent as necessary 
- In the common specification, do not excessively unify aggregate expressions for UI convenience and internal domain expressions 
- The public configuration of MVP assumes that the UI / API / SSE from `frontend-bff` is provided from the same origin.

---

## 4. Naming convention

### 4.1 JSON field names

- Unify JSON field names with `snake_case`

example:

```json
{
  "session_id": "ses_xxx",
  "workspace_name": "example_workspace",
  "created_at": "2026-03-27T05:12:34Z"
}
```

### 4.2 enum values

- Use `snake_case` for enum values

example:

- `waiting_input`
- `waiting_approval`
- `external_side_effect`

### 4.3 event type

- `event_type` should be in `domain.action` format

example:

- `session.status_changed`
- `message.user`
- `message.assistant.delta`
- `message.assistant.completed`
- `approval.requested`
- `approval.resolved`
- `error.raised`

### 4.4 query parameter

- Also name the query parameter as `snake_case`

### 4.5 Boolean field name

- For field names of Boolean values, use names that can be read naturally as predicates
- Typical examples are `is_` / `has_` / `can_` 
- Past participle forms such as `deleted` are also allowed if they are natural as words expressing states.

---

## 5. Date and time expression

- Date and time are expressed as UTC RFC 3339 string 
- Use `Z` at the end.

example:

- `2026-03-27T05:12:34Z`

supplement:

- Local time conversion during display is done on the client side
- Milliseconds are not required in MVP

---

## 6. ID Policy

### 6.1 Basic policy

- IDs exposed to the API should be **opaque string**
- Clients must not assume the structure or seriality of IDs.

### 6.2 Do not fix at this stage

The following are undefined in the common specifications.

- Use UUID or ULID? 
- Require prefix? 
- Separate internal ID and external ID?

### 6.3 Notes

- `session_id` / `approval_id` / `event_id` can be assumed to be opaque IDs 
- `workspace` has a strong relationship with `name`, so the public adoption method for `workspace_id` should be determined by individual API design.

---

## 7. null / empty value / omission rule

- Returns `[]` when the array is empty 
- Allows `null` for cursor when there is no next page 
- Allows optional objects to be omitted if unset 
- Always returns required fields 
- Allows `null` only for items that allow nullability

example:

```json
{
  "items": [],
  "next_cursor": null,
  "has_more": false
}
```

---

## 8. Handling normal responses

### 8.1 Handling as a common specification

The outermost shell of a normal response is **not fixed at this stage**.

reason:

- Public APIs can take an aggregated form for the UI 
- Internal APIs can take a more domain-like form 
- Standardizing on `{"data": ...}` at this stage may unnecessarily constrain future public API designs

### 8.2 Things to prepare at this stage

For normal responses, the following are the only common principles:

- Field naming rules 
- Date and time format 
- enum notation 
- ID is opaque string
- `items` / `next_cursor` / `has_more` can be used in list type

---

## 8.3 Idempotency of modification APIs

In MVP, consider mobile lines and retransmission, and idempotency may be defined as necessary for modification APIs.

### Common principles

- Endpoints where retransmission of the same operation may occur in actual operation are recommended to be designed to allow idempotent success 
- The specific method of idempotency is defined in the specifications for each resource 
- Typically, one of the following is used 
 - A key in the request body such as `client_message_id` 
 - `Idempotency-Key` header
- The behavior during retransmission should be specified in the individual specifications as one of the following 
 - Return the same result 
 - Return the latest status 
 - Return `409 Conflict` only if it can no longer be treated as the same operation

### Do not fix at this stage

- Require idempotency for all POST endpoints 
- Retention period for idempotent keys 
- Where in BFF / runtime / persistence layer to perform idempotency determination


---

## 9. Error response

The error response envelope will be standardized.

```json
{
  "error": {
    "code": "session_conflict_active_exists",
    "message": "another active session already exists in this workspace",
    "details": {
      "workspace_id": "ws_xxx",
      "active_session_id": "ses_xxx"
    }
  }
}
```

### 9.1 Field definition

- `code`: Fixed string for machine judgment 
- `message`: Concise explanation for humans 
- `details`: Any supplementary information

### 9.2 Error code naming

- Use `snake_case`
- Use names that identify the domain and cause 
- It is recommended that error codes related to state collisions are not segmented too much.


example:

- `workspace_name_invalid`
- `workspace_name_conflict`
- `session_conflict_active_exists`
- `approval_not_pending`
- `session_invalid_state`

Supplement: 
- Details of the state conflict can be returned in `error.details.current_status`, etc.
- For example, the necessity of subdivisions such as `session_not_waiting_input` / `session_waiting_approval` is determined by individual specifications.


---

## 10. HTTP status operation

### 10.1 Basic policy

- HTTP status is used for transport/protocol level classification 
- Detailed business decisions are made using `error.code` 
- For status change operations that are difficult to fit into CRUD, action endpoint using POST is allowed 
- The specific endpoint shape of action endpoint is defined in the public API/internal API design 
- The retransmission behavior of action endpoint is specified in individual specifications

### 10.2 Recommended operation

- `400 Bad Request`
 - Invalid request format 
 - Invalid parameter format 
- `404 Not Found`
 - Target resource does not exist 
- `409 Conflict`
 - Cannot operate due to conflict with current state 
- `422 Unprocessable Entity`
 - The value can be read, but it is invalid according to business rules.
- `500 Internal Server Error`
 - Unexpected internal failure 
- `503 Service Unavailable`
 - runtime Not connected or temporarily unavailable

### 10.3 Separating 409 and 422

Example of `409`:

- There is an active session in the same workspace and a new start is not possible 
- Normal message cannot be sent because it is in `waiting_approval`

Example of `422`:

- workspace name contains prohibited characters 
- workspace name contains empty characters 
- specified value of sort is not allowed

---

## 11. Common enums

### 11.1 session_status

- `created`
- `running`
- `waiting_input`
- `waiting_approval`
- `completed`
- `failed`
- `stopped`

### 11.2 approval_status

- `pending`
- `approved`
- `denied`
- `canceled`

### 11.3 approval_category

- `destructive_change`
- `external_side_effect`
- `network_access`
- `privileged_execution`

---

## 12. Handling state transitions

### 12.1 To be fixed as a common specification

- The API will be able to return the current state as `status`
- Invalid state transitions will be expressed as `409 Conflict` 
- The state transition table itself will be defined in the specifications for each resource.

### 12.2 Do not fix at this stage

- Require UI support fields like `available_actions`
- Detailed transition conditions for each resource

---

## 13. List API common rules

### 13.1 Fix at this stage

The following is adopted as a common query parameter name for list API.

- `limit`
- `cursor`
- `sort`

For list responses, adopt the following as necessary.

- `items`
- `next_cursor`
- `has_more`

### 13.2 sort notation

- Descending order can be expressed using a leading `-`

example:

- `created_at`
- `-created_at`
- `updated_at`
- `-updated_at`
- `occurred_at`
- `-occurred_at`

### 13.3 sort key principle

- Time series sorting of a resource is performed on the representative time field of that resource 
- `message` type usually uses `created_at` 
- `event` type usually uses `occurred_at` 
- Which sort keys are allowed is defined in the specifications for each resource

### 13.4 Stability principles for cursor paging

Lists that employ cursor-based paging must have **stable order**.

Common principle: 
- If only the primary sort key can have the same value, 
- The cursor that has the second or subsequent keys for tie-break contains information that can reproduce that stable order.
- The default sort and tie-break rules are specified in the specifications for each resource.

Examples: 
- `updated_at desc, workspace_id desc`
- `occurred_at asc, sequence asc, event_id asc`


### 13.5 Do not fix at this stage

- Default sort
- Whether to completely prohibit offset paging for each resource
- Exactly the same shape for all list APIs

remarks:

- For MVP, cursor-based paging is the first choice
- However, for lists with a small number of items, priority may be given to simplifying implementation.

---

## 14. SSE common specifications

### 14.1 Basic policy

- SSE is used for difference notification 
- Consistency after reconnection is ensured by REST reacquisition 
- Complete replay is not handled by MVP

### 14.2 session-scoped SSE envelope

`data` of **session unit stream** has the following common fields.

```json
{
  "event_id": "evt_xxx",
  "session_id": "ses_xxx",
  "event_type": "message.assistant.delta",
  "sequence": 42,
  "occurred_at": "2026-03-27T05:12:34Z",
  "payload": {}
}
```

### 14.3 Field definition

- `event_id`: Event identifier 
- `session_id`: Affiliation session
- `event_type`: Domain event type 
- `sequence`: Monotonically increasing number for each session 
- `occurred_at`: Occurrence time 
- `payload`: Event-specific data

### 14.4 sequence rules

- `sequence` is monotonically increasing in **session unit stream** 
- Client can deduplicate with `(session_id, sequence)` 
- If missing number or inconsistency is detected, re-obtain REST 
- If event resource for session unit is defined separately, the same session `sequence` may be shared.
- For global stream, `sequence` is not required

### 14.5 Relationship with session event resource

As a common specification, session scoped SSE events and session event resources such as `GET /sessions/{session_id}/events` can be treated as **expressing the same event sequence using different transports**.

However, the following are not fixed at this stage.

- Make sure that the shapes of SSE payload and REST event resource match exactly.
- Make auxiliary fields for transport mandatory on the REST side as well.

On the other hand, when listing session event resources by `occurred_at`, `occurred_at` is monotonically non-decreasing in the same order as `sequence` within the same session.


### 14.6 Handling global streams

- `sequence` is not required for **global streams** such as updating the approval list.
- The order of the global stream is corrected by re-acquiring REST.
- The global stream may also have `event_id` / `event_type` / `occurred_at` / `payload`.
- `session_id` may be included if there is a related session.

### 14.7 transport event name

- SSE's `event:` name is not fixed in the common specification**
- If necessary, use `message` / `status` / `approval` / `error` / `keepalive` etc. in the public API design.

### 14.8 Last-Event-ID

- MVP does not assume `Last-Event-ID`
- After reconnecting, converge to the latest state by reacquiring REST

---

## 15. keepalive

- Keepalive itself may be adopted 
- However, payload specifications and transmission intervals are not fixed in the common specifications 
- Details are defined in the SSE operation specifications of the public API

---

## 16. Common specifications that are not fixed

At this stage, the following are undecided.

- Whether to use `data` envelope for normal response 
- Specific format of ID 
- Whether to use `workspace_id` as primary key of public API 
- Default for each resource sort
- Aggregate response of public API shape
- Resource details of internal API shape
- `event:` naming of SSE transport 
- UI auxiliary fields like `available_actions`

---

## 17. Items carried over to the next phase

The following are the matters to be decided in the next API design phase.

1. Normal response type of public API 
2. Resource unit of internal API schema
3. Relationship of `workspace_id` / `workspace_name` 
4. Default sort
5 for each resource. Paging exact specification of list API 
6. SSE transport event name 
7. Confirmation of common error code list 
8. State transition table for each resource

---

## 18. Minimum fixed version summary

The common axes fixed in this v0.8 are as follows.

- `snake_case` unified 
- UTC RFC 3339 date and time 
- enum is `snake_case`
- `event_type` is `domain.action`
- ID is opaque string
- uses common error envelope 
- `409` is state conflict, `422` violates the value rule 
- Fixed `session_status` / `approval_status` / `approval_category` 
- `approval_status` includes `canceled` 
- SSE envelope of session stream is `event_id / session_id / event_type / sequence / occurred_at / payload`
- `sequence` is monotonically increasing for each session
- `sequence` is not required for global stream 
- Initial display is REST, differential update is SSE, after reconnection REST reacquisition 
- `Last-Event-ID` is not used in MVP
- List type query parameter name is `limit / cursor / sort`
- `message` type usually uses `created_at`, and `event` type usually uses `occurred_at` as the time series key.

The above will be subject to finalization of common specifications.


---

## 19. Crossing rules added in this version (v0.8)

- Modification APIs can be made idempotent if necessary.
- Behavior during retransmission should be specified in the individual specifications.
- State conflict error codes should not be broken down too much, and should be supplemented with `details.current_status` if necessary.
- Lists that use cursor-based paging have stable order.
- Session scoped SSE's `sequence` may be shared with the session event resource
- global stream does not require `sequence`
