# Codex WebUI MVP requirements definition v0.8

## 1. Purpose

Using `codex app-server + our own front end + Microsoft Dev Tunnels`, we will create a **personal WebUI** that allows you to interact with Codex from your PC and smartphone browser.

This system is not intended as a production public service, but as a personal remote development access environment.
The usage image is not to turn the entire IDE into a browser, but to be able to safely start, continue, approve, and confirm a Codex session from a remote location.

---

## 2. Conditions for establishing MVP

The conditions for considering MVP to be established are as follows.

1. Can be accessed with a web browser from both a PC and a smartphone
2. The only public entrance is `frontend-bff` via Dev Tunnel
3. Authentication assumes **Dev Tunnels authentication only**
4. User can select or create a workspace
5. User can create and start a session, and use Codex You can interact with
6 in chat format. You can stream the Codex response
7. When an approval request occurs, you can approve / deny after displaying the minimum information necessary to confirm the content.
8. You can check the session history and latest status after reconnecting or reloading the browser.
9. You can complete major operations on your smartphone.
10. Temporary SSE After disconnection, the list, history, and latest status will be consistent again by reacquiring REST.

---

## 3. Assumptions/Constraints

* Purpose is for personal remote development access, not a production publishing service
* Execution environment is **Windows + WSL + Docker**
* Publishing route is **Microsoft Dev Tunnels**
* Only **`frontend-bff` is exposed externally**
* `codex-runtime` is for internal Docker network only
* `codex app-server` requires a `stdio` connection within `codex-runtime`
* **Single user premise**
* **Usage from a smartphone browser is mandatory**
* Workspace management target is **limited to ``/workspaces`**
* Not a general-purpose file manager
* IDE-like multifunctional UI is MVP Excluded
* No unique application-side authentication is provided, **Access control depends on Dev Tunnels authentication**
* Therefore, **Security boundary is on the Dev Tunnels side, and additional authentication/authorization within the app is not provided by MVP**
* Modification operations are based on a **design that takes into consideration communication retransmission, double tapping, and retransmission immediately after reloading**
* WebUI Minimum information that should be stably maintained as app-owned, such as public status, approval status, list display order, and event sequence, is maintained on the runtime side.

---

## 4. System boundaries and responsibilities

### 4-1. `frontend-bff`

Responsibilities are as follows.

* UI distribution for browsers
* API provision for browsers
* SSE distribution
* Authorization UI contact
* Dev Tunnel public entrance
* Assembling read model / façade for UI

It is the only component exposed externally.

### 4-2. `codex-runtime`

Responsibilities are as follows.

* Startup and management of `codex app-server`
* Session management
* Workspace management
* Control of operations subject to approval
* Access to bind mounted development directory
* Event supply to `frontend-bff`
* Final guarantee of active session constraints
* Minimum required for persistence of session / approval / event App-owned information management
* Maintaining consistency between native state and app-owned state, and recovery processing in case of partial failure

---

# 5. MVP feature list

## 5-1. Must

### Access/Authentication

* WebUI can be accessed via Dev Tunnel
* Only `frontend-bff` is exposed externally
* Authentication is delegated to Dev Tunnels
* WebUI cannot be reached in unauthenticated state

### Workspace

* Workspace list acquisition
* Workspace selection
* Workspace new creation
* Management target is only under `/workspaces`
* Directory operation by specifying an arbitrary path is not possible

### Session

* Session list acquisition
* session creation
* session start
* session details display
* user message transmission
* Codex response stream display
* session status display
* session stop
* 1 workspace can have multiple sessions
* The number of sessions that can be active at the same time in the same workspace is 1
* Active state refers to **`running` or `waiting_approval`**
* Session in terminal state cannot be restarted.

### Approval

* Detecting approval requests
* Displaying approval details
* approve / deny
* Redisplaying pending approval
* Reflecting approval results in session
* Reflecting approval cancellation by stop
* **Up to one pending approval per session at the same time**
* Approve / deny Must be able to display the minimum information to confirm the target operation before execution

### Persistence/Restoration

* Persist session metadata
* Message history can be restored
* Approval history can be restored from runtime-maintained approval projection/state
* Session list, history, and latest state can be restored after browser reconnection/reloading
* Consistency can be restored by REST reacquisition after SSE reconnection
* Public state consistency can be reconfigured from the app-owned minimum state maintained on the runtime side

### Event / Display

* Event subscription by SSE
* Reflection of message / status / approval / error on UI
* Display of activity log for users
* Error display
* Initial display is REST acquisition, after that, updates are received by SSE
* Automatically reconnect when SSE is disconnected
* After reconnecting, reacquire the latest status and ensure consistency
* Send keepalive
* The session waiting for approval can be identified on the list.
* When an approval request is received, it should be noticed with an in-app banner or toast.
* The number of pending approvals or the waiting approval line can be reached from the main screen.
* The session unit event must have a `sequence` for order control.

### UI / Smartphone

* You can select workspace on your smartphone
* You can select, create, and start sessions on your smartphone
* You can send messages on your smartphone
* You can check responses on your smartphone
* You can process approvals on your smartphone
* You can check session status and history on your smartphone

## 5-2. Should

* Changed file list display
* Simple diff display
* Change summary display
* Session title automatic generation
* Latest session priority line
* Auxiliary panel optimization on PC

## 5-3. Later

* workspace rename
* workspace delete
* session delete
* session archive
* Optional path import
* File browser
* Terminal UI
* Advanced diff viewer
* Multi-user support
* Advanced authorization policy editing
* persistent tunnel management UI
* Full-fledged audit log

---

# 6. Domain organization

## 6-1. Workspace

### Definition

The directory unit that Codex works with.

### Management scope

* Target only directories directly under `/workspaces`

### MVP operations

* list
* create
* get
* select

### Naming rules

MVP assumes the following:

* The workspace name should be both a display name and a directory name.
* The allowed characters are **lowercase letters, numbers, `-`, and `_`**
* The length must be **1 to 64**
* No empty characters
* The first character must be a lowercase letter or number.
* The last character is `-`, `_`
* `.` and `..` are prohibited
* `/`, `\\`, and spaces are not allowed
* Do not allow duplicates after lowercase normalization
* Error if a directory with the same name exists at the time of creation
* Only directories directly under `/workspaces` are enumerated

### Exclusion conditions when enumerating

* Symlinks are excluded from enumeration
* Hidden directories starting with `.` are excluded from enumeration
* Directories for which read permission is insufficient are excluded from enumeration
* Even if an exclusion target exists, the entire list API does not fail and is recorded in the runtime log as necessary.

### Initialization at creation time

* MVP assumes only empty directory creation
* Git initialization and template deployment are not covered.

### Not applicable

* rename
* delete
* move
* Optional path specification

---

## 6-2. Session

### Definition

Interaction/execution unit with Codex associated with workspace.

### Responsibilities

* Sending and receiving conversations
* State transition management
* Approval waiting management
* Event source

### MVP status

* `created`
* `running`
* `waiting_input`
* `waiting_approval`
* `completed`
* `failed`
* `stopped`

### Meaning of status

* `created`: Session metadata exists, but execution has not started yet.
* `running`: Codex is processing or progressing through the current turn, based on native facts and runtime projection.
* `waiting_input`: The assistant's previous turn has completed and continues to accept **the next regular user input.**
* `waiting_approval`: A native approval request is pending and runtime keeps the session in approval wait until approve / deny / stop.
* `completed`: A state in which the runtime has **confirmed the session as the terminal on the WebUI.
* `failed`: A state in which the runtime has determined that the session has failed to continue. This is not assumed to be a native terminal session status.
* `stopped`: A state in which the user or system has **terminated the session based on the intention to stop**.

### Boundary between `waiting_input` and `completed`

* Even if the assistant response is completed, use `waiting_input`** to accept further normal input.
* `completed` is not just one turn completed, but only transitions when the session is to be treated as the end of WebUI.
* A session that has transitioned to `completed` usually does not accept message sending.
* A session that has transitioned to a terminal state cannot be restarted.
* If you want to continue, create a new session.
* If there is a temporary failure in turn units and the user can retry in the same session, you can return to `waiting_input` while notifying `error.raised`.

### create / start definition

* `session create` is an operation that generates session metadata and creates the initial state `created`.
* `session start` is an App-owned façade action that starts the `created` session for WebUI and transitions the state to `running`.
* ``Create a new session'' may be shown as one operation on the UI, but `create` and `start` may be separated internally.

### Multiple sessions

* Allow multiple sessions in 1 workspace
* Multiple `created` or `waiting_input` sessions may exist
* However, only one session can be active at the same time in the same workspace
* Active refers to `running` or `waiting_approval`
* If there are active sessions in the same workspace, separate sessions **`start` is rejected as an error**
* If another active session exists in the same workspace, **`waiting_input` → `running`** of the target session is also rejected as an error
* Even if an active session exists in the same workspace, **`create` of another session itself is allowed**
* The behavior of automatically changing the existing active session to `stopped` and switching is MVP
* The session of `waiting_input` is not active, so it does not prevent the `start` of another session.
* The UI gives priority to the latest session.

### State transition rules

* `created` → `running` : `start` At execution
* `running` → `waiting_input` : After the response of the current turn is completed, there is no waiting for additional approval and it is determined that the session can be continued
* `running` → `waiting_approval` : When an approval request occurs
* `waiting_input` → `running` : When sending a user message
* `waiting_approval` → `running` : When approving
* `waiting_approval` → `waiting_input` : When denying
* `waiting_approval` → `stopped` : When stopping
* `running` → `completed` : When runtime has confirmed the end of the session
* `running` → `failed`: When execution fails
* `running` / `waiting_input` / `waiting_approval` → `stopped`: When stopped by the user or the system

### supplement

* When `deny`, the transition destination is **always `waiting_input`**
* Normal message sending is not accepted during `waiting_approval`
* Normal user message sending is accepted only during `waiting_input`
* `waiting_approval` is maintained until either approve / deny / stop
* No automatic timeout for `waiting_approval`

---

## 6-3. Approval

### Definition

Request for approval for dangerous operations or operations with external side effects.

### Approval Category

MVP deals with the following risk categories.

* `destructive_change`
* `external_side_effect`
* `network_access`
* `privileged_execution`

Classification of specific shell commands and git operations is done on the runtime side.

### Simultaneous number constraints

* **At most one pending approval per session**
* Even if additional native requests may occur, MVP serializes them on the runtime side and exposes only one to the UI at a time.

### Minimum approval request information

* `approval_id`
* `session_id`
* `approval_category`
* `summary`
* `reason`
* `operation_summary`
* `created_at` or the equivalent item on the public API `requested_at`
* `status`

### Approve / deny Minimum confirmation information before execution

Before executing approve/deny, the user is required to be able to confirm at least the following:

* `approval_category`
* `summary`
* `reason`
* `operation_summary`
* `created_at` or its public API equivalent `requested_at`

Even if approval operations are allowed directly from the list screen, it is assumed that the above minimum information can be reached.

### status

* `pending`
* `approved`
* `denied`
* `canceled`

### supplement

* `canceled` is mainly treated as a resolution result when stop is performed for a session during `waiting_approval`.
* `status` represents the current status of the approval request.
* It is assumed that the resolution by stop can also be referred to as approval history.

---

## 6-4. Event

### Definition

A common expression for notifications that flow in chronological order on the UI.

### Common fields

MVP's **session unit event** has at least the following common fields.

* `event_id`
* `session_id`
* `event_type`
* `sequence`
* `occurred_at`

`sequence` is a monotonically increasing number for each session, and is used for deduplication and order control in the UI.

When using `occurred_at` in the session event list, `occurred_at` is monotonically non-decreasing in the same order as `sequence` within the same session. Ordering is decided by `sequence`, and `occurred_at` is supplementary metadata.

### event Example

* `session.status_changed`
* `message.user`
* `message.assistant.delta`
* `message.assistant.completed`
* `approval.requested`
* `approval.resolved`
* `log.appended`
* `error.raised`

### policy

* Initial display is REST
* Differential update is SSE
* Complete replay is not covered by MVP
* Consistency is achieved by REST reacquisition after reconnection
* `sequence` is **for consistency control of streams in session units** and is used for deduplication and order control
* Recovery after reconnection is `Last-Event-ID`
* global notification stream does not require `sequence`

---

# 7. Restore Requirements

Restore requirements are limited to the following.

## Included

* Reconnect browser
* Reload browser
* Resubscribe after SSE disconnection

## Not applicable

* `codex-runtime` Continuation of execution after reboot
* container Continuation of execution after reboot
* Guaranteed process continuation of session during `running`

### Original and consistency policy

* As a general rule, factual information such as message history may be given priority to the history on the app-server.
* Approval history cannot be restored from native history alone, so the public approval state is maintained from runtime-side projection/state.
* On the other hand, app-owned information such as **list, latest status, approval status, sequence, and stable ID support** necessary for WebUI is retained on the runtime side.
* After SSE reconnection, the UI is converged using the **public status reacquired using REST as the correct**.
* The runtime detects the difference between the native state and the app-owned state as necessary, and realigns the published state to the extent that it can be reconfigured.
* runtime / container It is desirable that the saved session history, approval history, and final published state can be referenced even if the running process does not continue after restarting.

### Basic policy in case of partial failure

* It is assumed that app-owned persistence or projection update may fail after a successful native operation.
* MVP requires that partial failures can be detected and the published state can be finally converged by retrying or reacquiring.
* It is assumed that even if an intermediate failure occurs, at least the inconsistency can be observed and recorded.

---

# 8. UI/UX Requirements

## 8-1. Basic policy

The UI is not a scaled-down version of a PC, but an information design that can be used on a smartphone.
MVP is based on a task-oriented UI centered on a single column.

## 8-2. Required screen

### Home

* workspace list
* workspace creation
* session list
* session creation/start
* number of pending approval lines

### Chat

* Message list
* session status display
* input field
* notification waiting for approval
* route to log/change summary

### Approval / Activity

* Approval details
* approve / deny
* Recent activity
* Error display

On a PC, it can be expanded with an auxiliary panel, but on a smartphone, it is basically one screen with one main purpose.

## 8-3. Smartphone acceptance criteria

MVP must meet at least the following:

* Width **equivalent to 360px** allows main operations to be performed without horizontal scrolling
* Main operations can be completed on 3 screens: Home / Chat / Approval
* Approve / deny can be executed within 2 taps from **minimum confirmation information**
* After reconnecting, you can reach the status immediately before the session without hesitation

## 8-4. Not applicable to smartphones

* Optimization of detailed viewing of large-scale diffs
* File tree operation
* Simultaneous display of multiple panes
* Terminal operation
* Long text editing optimization

---

# 9. Non-functional notes

* MVP assumes single-user operation
* Security is centered on Dev Tunnels authentication
* Fine-grained authorization and role separation within the app are not handled
* Workspace/session/approval is managed based on identifiers to avoid hindering future multi-user deployment
* Instead of exposing native primitives as they are on the UI, façade/projection for WebUI
* However, avoid unnecessary unique IDs and excessive history replication.
* It is desirable that change-based APIs be designed to be able to handle at least double transmission safely by using idempotent keys or equivalent means.
* It is desirable that list APIs and event APIs have stable order and tie-break so that the UI can perform stable paging and order control.

---

# 10. Judgments fixed in this edition

* Authentication is limited to Dev Tunnels, and there is no app-specific authentication
* Only one session can be active at the same time in the same workspace
* Active refers to `running` or `waiting_approval`, and **`start`** of another session is rejected with an error
* If another active session exists in the same workspace, the target session's **`waiting_input` → `running`** is also rejected with an error
* Even if an active session exists, **`create`** of another session is allowed
* `session create` and `session start` are conceptually separated
* `waiting_input` is a continuous state, and `completed` is a terminal state.
* `completed` is not just the completion of one turn, but only transitions when the runtime confirms that the session is the end.
* When `deny`, the transition destination is always `waiting_input`
* If stopped during `waiting_approval`, the approval is treated as `canceled`
* `completed` / `failed` / `stopped`
* There is no automatic timeout for `waiting_approval`
* There is a maximum of one pending approval per session at the same time
* session delete / archive is not subject to MVP
* Event for session stream has common fields `event_id` / `session_id` / `event_type` / Have `sequence` / `occurred_at`
* `sequence` is used for deduplication and order control in session units, and REST reacquisition is positive for consistency recovery after reconnection
* workspace name only allows **lowercase letters, numbers, `-`, `_`**, and length 1 to 64, set first character constraints, last character constraints, and reserved name constraints
* Exclude symlinks, hidden directories, and directories with insufficient privileges when enumerating workspace
* Restoration targets will only be restored until the browser is reconnected, and will not continue to run after restarting the runtime / container.
* The runtime should be able to detect the difference between the native state and the app-owned state and re-align the public state if necessary.
* It is assumed that partial failures can occur, and the design should be such that inconsistencies are detected and recorded, and can be resolved by retrying or reacquiring.
* Approval notifications are displayed on list badges and in-app banners. Handled by toast, OS level notifications are not subject to MVP
* The UI is based on a 3-screen configuration based on the assumption that it will be available on smartphones.
