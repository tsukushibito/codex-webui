# CodexWebUI MVP Requirements Definition v0.9

## 1. Purpose

This document defines the requirements for CodexWebUI v0.9, reorganized around the **public contract of Codex App Server**.

The primary goal of v0.9 is to provide a natural UX, close to Codex CLI / TUI, in PC and smartphone web browsers.  
To achieve that, WebUI must not introduce a thick, independent conversation state machine. Instead, it must treat the **native conversation model exposed by Codex App Server as the primary domain**, and keep WebUI-specific concepts limited to workspace handling and the minimum browser-facing facade concepts required.

This document is not a detailed API specification.  
However, to prevent the UX from drifting away from the actual App Server model, terminology, responsibilities, state assumptions, and operational boundaries are defined only within the range that remains consistent with the App Server public contract.

---

## 2. Core Direction of v0.9

### 2.1 App Server native-first
WebUI must treat Codex App Server public concepts as the primary domain language.

The main concepts are:

- `thread`
- `thread.status`
- `turn`
- `turn.status`
- `item`
- server-initiated request flow

### 2.2 Thin facade
The WebUI backend exists on top of App Server, but it must be a **thin facade**, not a layer that reimplements the conversation engine.

Its responsibilities are limited to:

- providing browser-facing transport
- workspace management
- mapping between workspace and thread
- generating small helper read models suitable for browser / mobile use
- storing the minimum app-owned metadata required for idempotency and partial-failure convergence
- storing or deriving the minimum ordering metadata required for thread-scoped stable ordering and reconnect convergence

### 2.3 CLI parity
CLI parity does not mean copying the CLI screen layout.  
It means that **the in-progress state that is observable and actionable in CLI must also be naturally observable, interruptible, and resumable in WebUI**.

### 2.4 Do not introduce too many WebUI-only concepts
Display-oriented helper concepts are allowed.  
However, they must not become an independent state machine that conflicts with the App Server source-of-truth state.

### 2.5 Treat approval as request flow
Approval must not be treated as an independent resource.  
It must be treated as **a server request and response flow associated with thread / turn / item**.

### 2.6 A thread starts with the first user input
In WebUI, a new thread is assumed to be created **when the first user input is accepted**.  
WebUI must not foreground its own `thread create / start` as a primary concept.

---

## 3. Scope

### 3.1 In scope
- a Codex WebUI intended for personal use
- support for both PC and smartphone
- conversation, execution, approval, and confirmation flows backed by Codex App Server
- workspace operations limited to directories under `/workspaces`
- browser access through Dev Tunnel

### 3.2 Out of scope
- turning the product into a general-purpose IDE
- multi-user support
- advanced authorization control
- terminal emulator reproduction
- a general-purpose file manager
- exposing the entire App Server protocol as a mirror
- a WebUI-owned approval resource
- a WebUI-owned conversation lifecycle engine
- information architecture that assumes a dedicated approval global screen

### 3.3 System and operational boundaries
- the only externally exposed entry point must be `frontend-bff` or an equivalent facade backend
- `codex-runtime` must not be exposed externally
- authentication is delegated to Dev Tunnel, and WebUI-specific authentication / authorization is out of scope for MVP
- the product assumes a single user and does not handle consistency or access control for concurrent multi-user actions
- the security boundary is Dev Tunnel and host-side operations; fine-grained in-app authorization is not an MVP requirement
- although this document is UX-focused, the public boundary, authentication responsibility, and single-user assumption are treated as fixed conditions

---

## 4. App Server Dependency Contract

### 4.1 Basic principle
`thread.status`, active flags, `turn.status`, and request flow referenced in this document are treated as **public contracts of the App Server that WebUI depends on**.  
They are not states defined independently by WebUI.

### 4.2 Handling of target versions
This document alone does not pin a concrete App Server implementation version.  
However, for the App Server public contracts declared as dependencies in this document, **the target version and the exact set of allowed dependency contracts must be fixed in a separate `App Server Contract Matrix v0.9` before implementation starts**.  
Runtime adapter, public API, and internal API implementation must not begin while that matrix is still undefined.

### 4.3 Contract dependency and degrade policy
If a depended-on public contract is unavailable in the target App Server version, renamed, or found not to be a stable public contract, WebUI must behave according to the following rules:

- WebUI must not replace the App Server source of truth
- display and navigation may degrade within the range supported by available native facts
- state that cannot be derived must not be backfilled as a WebUI-owned canonical state
- any fallback derivation rules must be stated explicitly in the API specifications

### 4.4 What this document fixes
This document fixes that **WebUI is centered on native facts**, and that **missing dependency contracts must not be compensated for by introducing more WebUI-owned state machines**.  
Concrete field names, response shapes, and transport-level representations may be left to later API specifications as long as they satisfy these requirements.

---

## 5. Assumptions

- Codex App Server provides thread / turn / item / request flow as public contracts
- thread runtime status is managed by the App Server
- turn lifecycle is managed by the App Server
- approval is represented by the App Server as pending request flow
- WebUI does not replace the App Server source of truth
- the WebUI backend handles only operational concepts not present in App Server and browser-facing reshaping
- App Server may allow multiple active threads, and WebUI must not restrict that unnecessarily
- the only external entry point is the WebUI behind Dev Tunnel; runtime and App Server are not exposed directly
- MVP assumes a single user and does not handle concurrent editing / approval coordination across multiple users

---

## 6. Terminology Layers

This document divides terminology into the following three layers:

1. **App Server native**
2. **App-owned minimal**
3. **Frontend display**

---

## 7. App Server Native Concepts

### 7.1 Thread
A durable conversation container in Codex App Server.  
Thread is also the canonical conversation unit in WebUI.

### 7.2 Thread status
Thread runtime status is based on the state held by the App Server.  
WebUI uses it as the primary user-facing state.

As the **minimum public contract set** that v0.9 depends on, thread status is assumed to include at least:

- `notLoaded`
- `idle`
- `systemError`
- `active`

`active` may include active flags as additional information.

Availability of this contract in the target App Server version is assumed. If it is unavailable or unstable, the degrade policy in 4.3 applies.

### 7.3 Active flags
When the App Server returns a thread as `active`, active flags may express the current waiting reason or execution condition.

As the **minimum public contract set** that v0.9 depends on, active flags are assumed to include at least:

- `waitingOnApproval`
- `waitingOnUserInput`

Availability of this contract in the target App Server version is assumed. If it is unavailable or unstable, the degrade policy in 4.3 applies.

### 7.4 Turn
An execution unit corresponding to a single user input or equivalent start trigger.  
It starts, progresses, completes, interrupts, or fails inside a thread.

### 7.5 Turn status
Turn lifecycle status is based on the state held by the App Server.

As the **minimum public contract set** that v0.9 depends on, turn status is assumed to include at least:

- `inProgress`
- `completed`
- `interrupted`
- `failed`

Availability of this contract in the target App Server version is assumed. If it is unavailable or unstable, the degrade policy in 4.3 applies.

### 7.6 Item
A user-facing event that occurs inside a thread / turn.  
It may include message, command execution, file change, tool call, progress, plan, review, and similar facts.

### 7.7 Request flow
A server-initiated request sent from the App Server to the client, together with its response flow.  
Approval is treated as one kind of request flow.

### 7.8 Approval
Approval is not an independent resource. It is treated as a **pending request flow**.  
WebUI interprets approval state from App Server request flow together with `thread.status.activeFlags`.

---

## 8. App-Owned Minimal Concepts

The app-owned concepts that the WebUI backend may keep are limited to the following:

### 8.1 Workspace
The only primary operational concept introduced by WebUI.  
It represents a working directory unit under `/workspaces`.

### 8.2 Workspace-thread mapping
A mapping that indicates in which workspace context a thread is handled.  
Because this is not App Server native, the WebUI backend may store it.

### 8.3 Minimal thread summary
The minimum summary required for thread list, resume navigation, and badge display.  
It may include at least:

- thread identifiers
- workspace identifiers
- last updated timestamp
- latest snapshot of thread status / turn status
- presence of pending request
- presence of recent error / failure
- materials used to derive current activity

### 8.4 Request badge metadata
Lightweight metadata for showing waiting-for-approval badges and similar indicators in thread lists, without turning approval into an independent resource.  
Independent persistence of full request history is not allowed.

### 8.5 Browser transport state
Connection helper information for REST initial load, SSE delivery, and reconnect-time convergence recovery.  
It must not duplicate the canonical conversation state.

### 8.6 Idempotency / recovery metadata
The minimum records required for first-user-input thread creation, resend handling, and partial-failure convergence.  
It may include at least:

- request-level idempotency keys or equivalent
- accepted request to thread mapping
- helper state required to detect recovery pending

### 8.7 Ordering / reconnect metadata
The minimum metadata required for thread-scoped timeline stable ordering, deduplication, and convergence through REST reacquisition.  
It may include at least:

- thread-scoped stable ordering keys or equivalent
- helper information required to determine reacquisition boundaries
- helper information required for projection convergence recovery

### 8.8 Principles for what may be retained
The backend may retain:

- workspace registry
- workspace-thread mapping
- thread list summaries
- lightweight projections for request badge display
- client request idempotency records
- transport / reconnect helper information
- thread-scoped ordering / dedupe helper information

A canonical-feed-like helper projection may be retained as part of the thread-scoped ordering foundation.  
However, it must not become a substitute source of truth for full thread history, and if it conflicts with native facts, App Server history must take precedence.  
Timeline helper projections must be treated as rebuildable cache.

The backend must not retain:

- an independent copy of full thread history
- approval as an independent canonical resource
- a WebUI-owned conversation state machine
- conversation lifecycle state that conflicts with App Server native state

---

## 9. Frontend Display Concepts

### 9.1 Thread view
The primary screen where a user observes, intervenes in, and continues a single thread.  
It is not just a chat screen. It is the **main monitoring / intervention / continuation screen for an in-progress thread**.

Thread view must contain at least:

- current activity
- timeline
- pending request / approval navigation
- composer or equivalent UI for the next input

### 9.2 Timeline
A user-facing chronological representation in which frontend reconstitutes App Server native thread / turn / item / request flow.  
Timeline is a display concept, not canonical state.

**The main body of thread view must be the timeline.**  
In MVP, the priority is to avoid splitting chat bubbles and activity into separate primary surfaces, so that assistant message, tool actions, file changes, approval, and errors can all be understood in the same thread context.

### 9.3 Current activity
A pinned summary that briefly shows what is happening in the thread right now.  
It is not independent state and is derived from App Server native state together with recent items.

### 9.4 Composer availability
UI availability around the composer, such as whether normal input is currently accepted, whether approval response is pending, and whether interrupt should be shown, may be derived by frontend or facade from native facts.  
However, these availability signals are helper derivations and must not be promoted to canonical WebUI state.

### 9.5 Resume cue
A UI cue indicating which thread the user should return to on reconnect or revisit.  
It is not independent domain state and is derived from thread status, active flags, last updated time, and workspace context.

### 9.6 Blocked cue
A display label used to highlight threads that require user intervention.  
It is not a replacement for an approval resource and is derived from native facts such as:

- `thread.status = active` and `waitingOnApproval`
- `thread.status = systemError`
- latest turn is `failed`
- an item exists that requires review or confirmation

### 9.7 Thread badge
A display used in thread lists to briefly identify waiting approval, errors, recent failures, and similar conditions.  
The priority is that users can return directly to the necessary thread from the list, without assuming a dedicated approval screen.

---

## 10. System Structure

### 10.1 Components
- `frontend`
- `frontend-bff` or an equivalent facade backend
- `codex-runtime`
- `Codex App Server`

### 10.2 Responsibility split

#### Codex App Server
- manages thread / turn / item / request flow
- manages thread status
- manages turn status
- manages approval request flow
- delivers streamed events
- manages thread persistence / resume / rollback / archive and similar operations

#### WebUI facade backend
- browser-facing API / SSE
- workspace management
- workspace-thread mapping
- relays native events from App Server
- provides minimum read models for frontend
- stores metadata for thread lists / badges / resume flows
- ensures client request idempotency
- detects and assists convergence of partial failures
- stores or derives thread-scoped ordering metadata
- provides the minimum public boundary as the Dev Tunnel-facing entry point

#### Frontend
- constructs thread view
- constructs timeline
- displays current activity
- displays resume / blocked / badge cues
- provides mobile-responsive UI

### 10.3 Public boundary
- only `frontend-bff` or an equivalent facade backend may be exposed externally
- `codex-runtime` and App Server are for internal communication only
- MVP does not add app-specific authentication; authentication is delegated to Dev Tunnel

---

## 11. Facade Responsibilities

v0.9 requires a facade.  
However, its responsibilities are limited to the following:

### 11.1 Transport facade
- browser-facing REST initial load
- browser-facing SSE delivery
- reconnect-time reacquisition path
- thin reshaping so that frontend does not have to carry the App Server protocol directly

### 11.2 Workspace facade
- workspace list / create / select
- management limited to `/workspaces`
- workspace-thread mapping

### 11.3 Read-model facade
- minimum summaries for thread lists
- lightweight aggregation for current activity
- lightweight aggregation for badge display
- condensed information for mobile
- summaries that allow users to understand multiple active threads without rendering all details at once

### 11.4 Idempotency / recovery facade
- idempotent handling of thread creation via the first user input
- convergence across resend, reconnect, and partial-failure conditions
- stabilization of public state under the assumption that SSE disconnect recovery uses REST reacquisition

### 11.5 Ordering facade
- provides thread-scoped stable timeline ordering
- provides identifiers or ordering keys required for deduplication
- provides a state that can converge through REST reacquisition when gaps or inconsistencies are detected

### 11.6 What the facade must not own
- canonical approval state management
- canonical turn lifecycle management
- independent redefinition of thread lifecycle
- duplicated storage of full history
- a WebUI-owned conversation state machine
- independent restrictions on the number of active threads allowed by App Server
- app-specific authentication or multi-user authorization

---

## 12. Workspace Requirements

### 12.1 Definition
A workspace is a working directory unit under `/workspaces`.

### 12.2 MVP operations
- list
- create
- get
- select

### 12.3 Naming constraints
- lowercase letters, digits, `-`, `_`
- length from 1 to 64
- empty string not allowed
- first character must be a lowercase letter or digit
- trailing `-` and `_` not allowed
- `.` and `..` not allowed
- `/`, `\`, and spaces not allowed
- duplicates after lowercase normalization not allowed

### 12.4 Exclusion conditions during enumeration
- symlinks are excluded
- hidden directories beginning with `.` are excluded
- directories without sufficient read permission are excluded
- even if excluded targets exist, the whole list request must not fail; runtime logs may record them as needed

### 12.5 Initialization at creation time
- MVP assumes empty-directory creation only
- Git initialization and template expansion are out of scope

### 12.6 Out of scope
- rename
- delete
- move
- arbitrary path import

---

## 13. Thread Requirements

### 13.1 Canonical unit
The unit that users open and continue is thread.

### 13.2 Primary state
The primary user-facing thread state is based on App Server `thread.status`.  
WebUI must not define `waiting_input / waiting_approval / stopped` as its own canonical states.

### 13.3 New thread start
A new thread is created when the user sends the first user input in a workspace context.  
Creating an empty thread first is not a primary UX assumption.

### 13.4 Active thread
When a thread is `active`, its current meaning is interpreted from active flags and the latest turn state.

Typical examples:

- `active + waitingOnApproval`
- `active + waitingOnUserInput`
- `active` with turn `inProgress`

### 13.5 Number of active threads
WebUI may handle multiple active threads within the range allowed by the App Server.  
Limiting active thread count to 1, either per workspace or globally, is not a requirement.

### 13.6 UI principles for multiple active threads
- on mobile, it is sufficient to foreground one thread view at a time
- active threads that are not currently opened only need to be understandable via badge, blocked cue, current activity summary, and updated time
- future support for multi-pane display on PC is allowed, but not required for MVP
- even if multiple active threads exist, the UI must not auto-switch foreground thread; resume cues indicate return priority instead

### 13.7 Idle thread
`idle` is treated as a loaded thread with no currently active turn.

### 13.8 notLoaded thread
`notLoaded` is treated as a persisted thread that is not currently loaded in runtime.  
It may still be shown as viewable and resumable.

When a user opens a `notLoaded` thread, the backend may establish thread view by performing App Server load / resume as needed.  
Open and load are not separated at the UX level; to the user, this is treated as a normal thread open.  
Even if an additional mutation is required for open / load, it must be absorbed inside the facade backend and must not expose the internal helper concept to the user.

### 13.9 systemError thread
`systemError` is treated as a thread-level abnormal condition and must be made prominent with high priority.

---

## 14. Turn Requirements

### 14.1 Observability
For turns, the following must be observable at minimum:

- start
- in progress
- completed
- interrupted
- failed

### 14.2 Interrupt
An in-progress turn must be interruptible.  
Interrupt is treated as an operation that ends the current turn as `interrupted`, not as termination of the thread itself.

### 14.3 Continuation
Even if a turn ends as `completed / interrupted / failed`, the thread itself should remain as a conversation container that can continue.

---

## 15. Approval Requirements

### 15.1 Definition
Approval is a user response to a server request from the App Server.  
It must not be treated as an independent resource.

### 15.2 UX principles
- approval is handled inside thread context
- the backend does not keep dedicated persistent approval state
- pending approval is determined from App Server active flags and request flow
- after approval is resolved, the user can naturally return to thread view

### 15.3 Primary path
The primary path for resolving approval is inside thread view.

### 15.4 Global path
A dedicated global approval list screen is not an MVP requirement.  
Pending approvals across multiple workspaces / threads only need to be distinguishable through **thread-list badges and blocked cues**.

### 15.5 Minimum confirmation information
Before approve / deny, the user must be able to reach at least the following structured information:

- risk classification or equivalent danger information
- a short summary of what operation is being requested
- an explanation of why approval is required
- a concrete summary of what will happen
- request time or equivalent time information
- reference to the target thread
- reference to the target turn or item, or equivalent target identification information

The target thread is mandatory. The target turn or item must also be confirmable when it is obtainable from the App Server.  
Concrete field names and response shapes may be fixed in API specifications.

### 15.6 Conditions for list-driven navigation
Even when approval handling starts from a list or banner, the user must still be able to reach the minimum confirmation information defined in 15.5 before approve / deny is executed.

### 15.7 Persistence policy
Approval must not be persisted as an independent canonical resource.  
Required history is assumed to remain readable as part of thread / turn / item / request flow history.

Request flow is not an independent canonical resource, but for reconnect, revisit, and response retry, helper navigation must remain available from thread context to the minimum confirmation information for pending requests and for just-resolved requests.  
When the request is absent, the API must provide a representation that makes that absence unambiguous.

---

## 16. Timeline Requirements

### 16.1 Definition
Timeline is a display model that organizes App Server native events into an order that is understandable to the user.

### 16.2 Relationship to thread view
The main body of thread view must be the timeline, and users must be able to understand the major events of the thread from it.  
MVP must not assume two separate primary surfaces, one for chat bubbles and one for activity.

### 16.3 Composition unit
Timeline is grouped by turn.

### 16.4 Must-have visible event types
In MVP timeline, users must be able to understand at least the following as user-facing chronology:

- user message
- assistant message
- approval request
- approval resolution
- error
- status change

### 16.5 Should-have visible event types
The following should be included in the timeline when they are obtainable as App Server native facts or stable read models:

- progress or progress summary
- command execution
- file change
- tool call
- plan
- review
- safe summary information equivalent to a thinking summary

### 16.6 Display rules
- each turn should start with user input or an equivalent start trigger
- streaming messages may be merged into the same item
- approval / error / file change should be visually prominent
- lower-priority logs may be collapsed
- WebUI must not hold independent timeline state that conflicts with App Server native facts
- unavailable Should-level items must not be inferred by WebUI speculation

### 16.7 Ordering guarantees
- timeline must have thread-scoped stable ordering
- frontend should be able to deduplicate using a thread-scoped stable key
- missing items, inconsistency, and reconnect cases must converge through REST reacquisition
- concrete ordering field names and transport representation may be fixed in API specifications, but the requirement is that a **thread-scoped stable ordering foundation** must exist

---

## 17. Current Activity Requirements

### 17.1 Definition
A short summary of current state shown at the top of thread view.

### 17.2 Derivation sources
Current activity is derived from:

- `thread.status`
- active flags
- status of the latest turn
- in-progress item
- pending request flow
- recent error

### 17.3 Display examples
- Running
- Waiting for approval
- Waiting for input
- Error present
- Latest turn failed

### 17.4 Principle
Current activity is not independent state; it is a read-only summary of native facts.

---

## 18. Thread List / Resume Requirements

### 18.1 What the list must make visible
- the thread touched most recently
- currently active threads
- threads waiting for approval
- threads containing error
- resume candidates by workspace

### 18.2 List display
In thread lists, the following must be distinguishable in a lightweight form at minimum:

- waiting for approval
- system error
- recent failure
- recent update
- current activity summary for active threads that are not currently opened

### 18.3 Resume priority
On reconnect or revisit, the minimum resume priority must be:

1. thread with `waitingOnApproval`
2. thread with `systemError`
3. thread whose latest turn is `failed`
4. currently active thread
5. last viewed thread
6. most recently updated thread

### 18.4 Application of resume priority
Resume priority is not a rule for always auto-navigating to thread view on revisit.  
It is used to emphasize return candidates and determine display order or navigation priority in workspace lists, thread lists, and resume cues.

### 18.5 Scope of application
- default resume priority may be evaluated globally
- when a screen is explicitly filtered to a workspace, the same priority rule may be applied within that workspace
- on mobile, it is sufficient to surface one or a few high-priority threads

### 18.6 Background thread promotion notification
If an active thread that is not currently foregrounded changes into a high-priority condition such as `waitingOnApproval`, `systemError`, or latest turn `failed`, the frontend must notify the user through an in-app banner, toast, badge emphasis, or equivalent lightweight signal.  
Even without a dedicated global approval screen, navigation back to a high-priority thread must remain possible within one or two actions.

### 18.7 Blocked cue
Blocked is a display-oriented resume cue, not an independent state.

---

## 19. Mobile Requirements

### 19.1 Basic principle
On smartphone, the priority is not “more features” but “resume without confusion”.

### 19.2 Required operations
- workspace selection
- thread selection
- thread view display
- new thread start via first user input
- message sending
- streaming confirmation
- approval response
- error confirmation
- return after reconnect

### 19.3 Layout principles
- single-column layout
- thread view is the main screen
- timeline must remain usable in condensed display
- approval / diff / error details may use full-screen sheets
- it must be possible to return to the original thread in one action

### 19.4 Acceptance criteria
For MVP, at least the following must hold:

- major operations can be completed without horizontal scrolling at **360 CSS px equivalent width**
- workspace selection, thread selection, message sending, streaming confirmation, approval response, and return to the original thread all complete in a smartphone browser
- after reaching the minimum confirmation information, approval can be approved / denied within **two taps**
- after reconnect or reload, the user can reach the top-priority resume candidate or the last viewed thread within **two actions**
- landscape-only or desktop-mode assumptions are not allowed

### 19.5 Out of scope
- optimization for detailed viewing of large diffs
- file-tree operations
- simultaneous multi-pane display
- terminal operations
- long-form text editing optimization

---

## 20. Backend Constraints

### 20.1 Browser recovery
After SSE disconnection, REST reacquisition is authoritative.  
However, the canonical conversation state remains on the App Server side.

### 20.2 Thread-scoped ordering
The backend must be able to provide thread-scoped stable timeline ordering.  
The concrete method may be fixed in API specifications, but at minimum it must satisfy the following:

- the event sequence inside the same thread can be reacquired in stable order
- frontend can deduplicate
- SSE and REST results can be reconciled to converge
- if missing events or ordering inconsistencies are detected, REST reacquisition can restore the state authoritatively

### 20.3 Idempotency
Mutating operations must account for communication resend, double submission, and resend immediately after reload.  
In particular, **thread creation by the first user input** must prevent duplicate creation using request-level idempotency keys or equivalent means.

The backend may retain the mapping between an accepted first input and the generated thread as minimal app-owned metadata.  
When the same idempotency key is resent, it should return the existing thread and existing result rather than creating a new thread.

### 20.4 Partial failure recovery
It must be assumed that app-owned metadata updates or read-model updates can fail after the native operation has already succeeded.  
The backend must satisfy at least the following:

- inconsistencies can be detected
- public state can converge through retry or reacquisition
- full history is not duplicated as an independent source of truth

### 20.5 Boundary conditions
- only the browser-facing facade may be exposed externally
- runtime and App Server must not be exposed directly to the browser
- MVP assumes a single user and does not handle conflict resolution for multi-user usage
- authentication assumes Dev Tunnel, and additional in-app authentication is not part of the mandatory requirements

---

## 21. MVP Completion Conditions

v0.9 MVP is considered established when the following are satisfied:

1. usable from a web browser on both PC and smartphone
2. the only public entry point is the facade backend
3. workspace can be listed / created / selected
4. a new thread can start from the first user input in workspace context
5. conversation can continue inside thread view
6. timeline can be displayed as the main body of thread view
7. App Server thread status / turn status can be observed naturally
8. streaming response can be displayed
9. approval request can be handled in thread context with minimum confirmation information shown first
10. waiting-for-approval threads and active threads not currently opened can be distinguished in thread lists
11. it is easy to return to the correct thread after reconnect
12. timeline can converge through thread-scoped stable ordering and REST reacquisition
13. mobile acceptance criteria are satisfied
14. WebUI does not introduce an independent approval resource or independent conversation lifecycle
15. WebUI does not impose its own restriction on the number of active threads allowed by App Server

---

## 22. Must / Should / Later

### 22.1 Must
- thread view centered on App Server native state
- workspace list / create / select
- workspace-thread mapping
- new thread start by first user input
- timeline
- current activity
- streaming response
- handling approval inside thread
- displaying minimum approval confirmation information
- thread-list badges / blocked cues
- lightweight notification for high-priority state changes in background active threads
- resume cues
- a thread list that can summarize multiple active threads
- mobile support
- mobile acceptance criteria
- browser UX based on REST + SSE
- minimum app-owned metadata for idempotency and reconnect convergence
- thread-scoped ordering foundation
- Dev Tunnel-based public boundary

### 22.2 Should
- stronger thread list UX
- diff summary
- changed-files summary
- minimum per-thread summaries
- emphasis for recent failures and errors
- optimized reconnect return path

### 22.3 Later
- stronger archive UI
- thread delete
- workspace rename / delete
- file browser
- terminal UI
- advanced diff viewer
- multi-user
- advanced audit log
- dedicated approval inbox UI

---

## 23. Non-goals

The following are not goals in v0.9:

- reimplementing App Server internal state management in the WebUI backend
- designing approval as an independent resource
- defining a WebUI-owned conversation lifecycle
- storing App Server full history separately
- introducing more backend-owned state than CLI requires
- narrowing active thread count through WebUI-owned constraints
- building a UX that assumes a dedicated global approval screen
- prematurely designing multi-user authorization for v0.9

---

## 24. Decisions Fixed in This Version

- thread is the canonical conversation unit
- turn is the canonical execution unit
- the canonical current state is based on App Server `thread.status` / `turn.status`
- approval is treated as request flow
- the facade is necessary, but must remain thin
- workspace remains the primary WebUI-owned operational concept
- a new thread is created by the first user input
- WebUI does not independently restrict the number of active threads allowed by App Server
- multiple active threads are allowed, but MVP does not require simultaneous detailed rendering
- timeline / current activity / blocked / badge are display concepts
- the main body of thread view is the timeline
- a dedicated global approval list is not an MVP requirement
- structured minimum confirmation information before approve / deny is mandatory
- composer-related UI availability may be derived from native facts, but must not be promoted to canonical state
- WebUI does not create an independent approval resource
- WebUI does not create an independent conversation state machine
- the system is centered on App Server state, and facade / frontend only fill what is missing
- the facade backend may retain only the minimum app-owned metadata required for workspace operation, thread list display, badge display, reconnect convergence, idempotency, partial-failure convergence, and ordering
- a canonical-feed-like helper projection may be retained, but it must not become a substitute source of truth for App Server full history
- the system must have a thread-scoped stable ordering foundation, and REST reacquisition is authoritative after reconnect
- request helpers are assumed to remain reachable from thread context for pending requests and just-resolved requests
- the facade backend is the only public entry point, and authentication is delegated to Dev Tunnel
- the single-user assumption is a fixed condition in v0.9
- `App Server Contract Matrix v0.9` is a prerequisite artifact before implementation starts
