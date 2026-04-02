# Codex WebUI MVP implementation roadmap v0.1

Last updated: 2026-04-01

## 1. Purpose

This document is a roadmap for organizing the execution order until the completion of the Codex WebUI MVP, based on the existing documents below.

- MVP requirements definition v0.8
- Common specifications v0.8
- Public API specifications v0.8
- Internal API specifications v0.8
- app-server behavior confirmation plan/handover memo

The aim of this roadmap is to first solidify interfaces that require large rework costs, and then converge runtime, BFF, UI, and tests in an orderly manner.

---

## 2. Organizing the current situation

### 2.1 Things that are already solidified

At present, the following has been organized as a general outline.

- Conditions for MVP
- Public boundary is only `frontend-bff`
- `codex-runtime` has internal responsibilities
- Conceptual separation of `workspace / session / message / approval / event`
- Conceptual separation of `session create` and `session start`
- active session constraint
- approval Constraints
- Restoration policy with REST + SSE
- Internal/public responsibility boundaries

### 2.2 Important rules already fixed

- `session_status` is `created / running / waiting_input / waiting_approval / completed / failed / stopped`
- active session is `running` or `waiting_approval`
- Normal message can be sent only when `waiting_input`
- `completed` is not just one turn completion but only when determining the end of WebUI
- If stopped during `waiting_approval`, approval has `canceled`
- Session stream has `sequence`, and after reconnection, it converges with REST reacquisition
- `session_id` reuses native thread ID, while `message_id` / `approval_id` / `event_id` are app-owned stable IDs
- Messages are restored primarily from history, while approvals are restored from runtime-managed projection/state
- Both public API / internal API assume JSON, `snake_case`, UTC RFC 3339, opaque ID

### 2.3 What to do next

The observation phase is complete. The next thing to do is to reflect the confirmed app-server behavior into the maintained specifications, eliminate contradictions between requirements/common/public/internal docs, and then move on to implementation.

---

## 3. List of unconfirmed matters

### 3.1 app-server Items that need to be observed

1. ID stability of thread / turn / item / request / event
2. Type and order of native signal / event
3. Implementation meaning of `session create` / `session start`
4. `running -> waiting_input` decision basis
5. Approval pending / resolved redetectability
6. `completed / failed / stopped` native
7. stream Even if the first load is not connected, can it be restored by simply re-acquiring the history?
8. approval Native acquisition source of minimum confirmation information

### 3.2 Matters that should be incorporated into specifications after observation

1. Final adoption table of `session_id / message_id / approval_id / turn_id / event_id / sequence`
2. Native signal → internal/public event correspondence table
3. `session.status` judgment rule
4. How to fix `session start` as façade action
5. Minimal schema for app-owned persistence
6. Atomicity / recovery finalization procedure
7. workspace unit exclusion rule
8. BFF field mapping / read model synthesis policy
9. UI restoration rule
10. contract test perspective

### 3.3 Items that may still be affected at the time of implementation but can be postponed

- `workspace_id` / ID Specific format
- Retention period of projection cache
- Handling of `system` role item
- Default limit of pagination Final value
- Details of `event:` name of SSE transport

---

## 4. Overall phase

This roadmap divides the process until MVP completion into the following six phases.

1. Phase 0: Experimental infrastructure/observation preparation
2. Phase 1: App-server behavior confirmation
3. Phase 2: Specification fixation
4. Phase 3: Runtime implementation
5. Phase 4: BFF / UI implementation
6. Phase 5: Testing / Convergence / MVP judgment

As for dependencies, the results of Phase 1 are the inputs of Phase 2, and the results of Phase 2 are the inputs of Phases 3 and 4.

---

## 5. Phase 0: Experimental infrastructure/observation preparation

### 5.1 Purpose

Create a minimum verification environment that allows you to observe the actual behavior of app-server.

### 5.2 Implementation details

- Prepare a verification runtime that can stably start `codex app-server`
- Prepare a logger that can save native event / history / request / resolution
- Allow observation logs for each session to be saved separately
- Prepare a simple client that can verify both with and without stream connection
- Prepare a prompt set that intentionally generates approval
- stop / deny Script a /stream disconnect/first restore test scenario

### 5.3 Products

- Runtime stub or CLI harness for observation
- Raw log storage format
- Case list and execution procedure manual
- Observation result record template

### 5.4 Completion conditions

- There is a reproducible observation environment
- The same case can be run multiple times and the differences can be compared
- The lowest case including approval / stop / stream disconnection can be executed automatically or semi-automatically

---

## 6. Phase 1: app-server behavior confirmation

### 6.1 Purpose

Eliminate uncertainty due to app-server dependence through observation.

### 6.2 Observation target

#### Phase 1-A: Basic case

- Normally 1 turn completed
- assistant No text turn
- Multiple turns continued

Things to check:

- Presence of thread ID and stability
- Presence of turn ID and stability
- Presence of message item ID and stability
- Arrival order of delta / completed
- Is it possible to generate multiple message-based items?
- Is there a turn that ends with only tool/log/request?
- Is time attached to item / event / history?

#### Phase 1-B: create / start semantics

Things to check:

- Is it possible to create something equivalent to idle just by creating a native thread?
- Is there a stable operation like `start without input`?
- If not, can `session start` be a pure App-owned transition?
- Is bootstrap necessary or unnecessary?

#### Phase 1-C: approval

- approval occurred → approve
- approval occurred → deny
- approval currently occurring → stop

Things to check:

- Presence of request ID and stability
- Can pending/resolved be re-detected from the history?
- Source of minimum confirmation information
- Can `resolved_at` be obtained?
- Approval How does the session proceed after resolution?

#### Phase 1-D: stop / abnormal / termination

Things to check:

- How is stop reflected on native?
- Is it possible to have the basis for `stopped` only in native?
- Is it possible to distinguish between temporary failure and terminal failure?
- Can `completed` be placed in native alone, or is runtime judgment required?

#### Phase 1-E: Reacquisition/Reconstruction

- stream disconnected → history reacquisition
- stream unconnected first load → restore only by reacquiring history

Things to check:

- Can messages be reconstructed from history?
- Can approvals be reconstructed from history?
- Can we distinguish between pending / resolved?
- Can the latest state be re-estimated?
- Should `sequence` be made app-owned?

### 6.3 Deliverables to be produced in this phase

1. ID stability list
2. Native signal / event list
3. native → public/internal event correspondence candidate table
4. status judgment candidate table
5. approval minimum confirmation information mapping table
6. app-owned provisional table of required items
7. list of unresolved matters

### 6.4 Completion conditions

- All the confirmation targets listed in the handoff document have been answered.
- "Observed facts" and "inferences" are recorded separately.
- Even if unresolved matters remain, tentative decisions can be made using MVP.

---

## 7. Phase 2: Specification fixed

### 7.1 Purpose

Reflect observation results in requirements, common, public API, and internal API to avoid confusion in subsequent implementations.

### 7.2 Fixed target

#### 7.2.1 ID / key

- `session_id`
- `message_id`
- `approval_id`
- `turn_id`
- `event_id`
- `sequence`

#### 7.2.2 Status determination

- `running -> waiting_input`
- `running -> waiting_approval`
- `running -> completed`
- `running -> failed`
- `running -> stopped`

#### 7.2.3 action semantics

- `session create`
- `session start`
- `message accept`
- `approval resolve`
- `session stop`

#### 7.2.4 event contract

- public / internal `event_type`
- Payload minimum shape
- Relationship between `occurred_at` and `sequence`
- stream / REST event consistency rules

#### 7.2.5 persistence / recovery

- workspace registry
- `workspace_id <-> session_id`
- session overlay
- approval projection
- sequence management
- idempotency key
- handling of recovery_pending

### 7.3 Document reflection target

- Requirement definition: Reflect any prerequisite differences found through observation
- Common specifications: Adjust cross-cutting rules for event / sequence / transport
- Public API: Determine response / error / action semantics
- Internal API: Determine overlay / projection / atomicity / recovery

### 7.4 Completion conditions

- There are no contradictions between requirements, common, public, and internal
- Undecided matters are limited to "details that do not affect implementation"
- runtime / BFF / UI implementers can start with only specifications

---

## 8. Phase 3: runtime implementation

### 8.1 Purpose

Implement `codex-runtime`, which is the core of MVP.

### 8.2 Implementation Priority

#### 8.2.1 Top priority

1. App Server process management
2. workspace registry
3. `workspace_id <-> session_id` Correspondence management
4. session overlay
5. final guarantee of active session constraints
6. message complex state transition of accept / approval resolve / stop

#### 8.2.2 Runner-up

7. message / approval / event projection
8. canonical `sequence` numbering
9. summary read model
10. recovery / reconciliation

### 8.3 Implementation unit

#### A. workspace management

- `/workspaces` Enumeration
- Creation rule
- Exclusion condition

#### B. session management

- create
- start
- get / list
- stop
- session overlay update

#### C. messaging

- Idempotence by `client_message_id`
- Sending input to native thread
- user message projection
- assistant delta / completed processing

#### D. approval

- request detection
- detail projection
- approve / deny / cancel
- `active_approval_id` management

#### E. event / sequence

- canonical event append
- for session stream sequence
- approval for global stream projection

#### F. recovery

- partial failure detection
- Reconstruction from native history
 orphan / mismatch detection

### 8.4 Completion conditions

- All runtime operations that satisfy the internal API run
- The active session constraints are guaranteed to be final at runtime
- The basic system of approval / stop / idempotency / recovery works
- The event source for SSE can be supplied to BFF

---

## 9. Phase 4: BFF / UI implementation

### 9.1 Purpose

Convert runtime's internal contract to public API and smartphone-based UI.

### 9.2 BFF implementation

#### Priority order

1. public REST endpoint
2. internal → public mapping
3. Home aggregation
4. session stream relay
5. approvals stream relay
6. public error mapping
7. `can_*` Derivation

#### Particularly important conversions

- approval `summary/reason` → public `title/description`
- public approve / deny → internal resolve
- Home aggregation response
- stop response `canceled_approval` conversion

### 9.3 UI implementation

#### Screen priority order

1. Home
2. Chat
3. Approval

#### What you need for Chat

- session detailed display
- message list
- activity log
- delta temporary display
- completed final display
- status display
- stop
- REST reacquisition after SSE reconnection

#### What you need for Approval

- pending list
- detail
- approve / deny
- stop origin `canceled` reflection
- badge / banner / toast

#### Smartphone perspective

- Main operations can be completed with 360px width
- Main operations can be completed with 3 screens of Home / Chat / Approval
- Approval is within 2 taps after reaching the minimum confirmation information

### 9.4 Completion conditions

- Public API returns as specified
- UI is completed with 3 screens of Home / Chat / Approval
- Main operations can be performed on smartphone without horizontal scrolling
- Consistency is restored by REST reacquisition when SSE is disconnected

---

## 10. Phase 5: Testing / Convergence / MVP Determination

### 10.1 Purpose

Confirm that it works according to specifications and satisfies the conditions for establishing MVP.

### 10.2 Test perspective

#### Contract Test

- Consistency of message reject
- active session constraints
- approval approve / deny / cancel
- idempotent resend
- error.code / status code except for workspace CRUD, MVP target function
- session create / start / get / list / stop
- `waiting_input`

#### Restore test

- Browser reload
- SSE disconnect → reconnect → REST reacquire
- stream unconnected first load
- approval pending redisplay
- state / approval consistency after stop

#### E2E test

- workspace creation → session creation → start → dialogue → stop
- approval occurs → approve
- approval occurs → deny
- approval occurs → stop
- runtime reacquisition convergence after partial failure

#### UI acceptance testing

- PC browser
- Width equivalent to smartphone browser
- Approval conductor
- banner / toast
- Return to previous session

### 10.3 MVP Judgment Criteria

MVP is completed if the following are met.

- Satisfies Must in requirement definition
- App-server Specification differences based on observations have been reflected in the document
- No significant ambiguity remains in the responsibility boundary of runtime / BFF / UI
- Consistency is restored by reacquiring after SSE disconnection
- Satisfies smartphone acceptance criteria
- Minimum confirmation information for approval can be confirmed from UI

---

## 11. Dependencies

### 11.1 Strong dependence

- Phase 1 → Phase 2
 - Without observation, it is difficult to fix `start semantics`, `status judgment`, `approval re-detection`, and `ID recruitment table`

- Phase 2 → Phase 3
 - Overlay / projection / atomicity specifications must be fixed before runtime implementation

- Phase 3 → Phase 4
 - BFF / UI requires a lot of rework if internal contract and event contract are not solidified

- Phase 4 → Phase 5
 - E2E / UX verification after UI implementation

### 11.2 Things that can be parallelized

- The second half of Phase 0 and part of Phase 1
- Document reflection in Phase 2 and template implementation of non-dependent parts in Phase 3
- Workspace/session foundation of Phase 3 and UI framework of Phase 4

---

## 12. Priority

### 12.1 Top priority

1. app-server observation
2. Fixed meaning of `session start` / `waiting_input` / `completed`
3. Fixed source of approval rediscovery and minimum confirmation information
4. Runtime implementation of active session constraint
5. Atomicity of message / approval / stop and recovery
6. Consistency of session stream and REST reacquisition

### 12.2nd priority

7. Home aggregation
8. approval global stream
9. activity log
10. Final details of smartphone optimization

### 12.3 Postponement

- diff display
- changed file list
- session title automatic generation
- PC auxiliary panel enhancement

---

## 13. Risk

### 13.1 Technology risks

#### R1. Native ID is unstable

Impact:
- `approval_id` / `event_id` / `turn_id` ripples through design

Countermeasure:
- Design fallback for app-owned stable key first

#### R2. No stable native primitive corresponding to `session start`

Impact:
- public/internal action semantics are shaken

Countermeasure:
- Design with the premise that `start` is determined as an App-owned façade action

#### R3. `completed / failed / stopped` cannot be determined by native alone

Impact:
- runtime overlay is required

Countermeasure:
- Distinguish native from original and public state from app-owned overlay.

#### R4. Cannot re-detect approval from history

Impact:
- Reconnection restoration is broken.

Countermeasure: Move
- approval projection closer to the original version of runtime persistence.

#### R5. Native and projection shift due to partial failure

Impact:
- The latest state of the UI becomes unstable.

Countermeasure:
- Prepare `recovery_pending` and re-integration flow from the beginning

### 13.2 Product Risk

#### R6. Approval UX is slow on smartphones

Measures:
- Make the Approval screen independent
- Shorten the time to reach detail from the list
- Concentrate on the minimum confirmation information

#### R7. Activity and message responsibilities are mixed

Countermeasure:
- Keep `messages` and `events` separate

---

## 14. Postponed items

It is appropriate to do the following after MVP.

- workspace rename / delete
- session delete / archive
- arbitrary path import
- file browser
- terminal UI
- advanced diff viewer
- multi-user support
- advanced authorization policy editing
- persistent tunnel management UI
- full-scale audit log

Should items are also not included in the MVP judgment and are included separately after convergence.

---

## 15. Recommended Milestones

### M1. Observation completed

- app-server behavior confirmation results
- There is a tentative conclusion on the main issues of ID / status / approval

### M2. Specifications frozen

- 4 Documents are aligned
- runtime / BFF / UI boundaries are fixed

### M3. runtime minimum completion

- session / message / approval / stop / event works internally

### M4. UI minimum completion

- Home / Chat / Approval works on PC / smartphone equivalent

### M5. MVP convergence completed

- Satisfies
- Must requirements for E2E including restoration, reconnection, authorization, suspension, and exclusive constraints.

---

## 16. Minimum execution order summary

The safest way to proceed is as follows.

1. Create an observation environment for app-server
2. Observe the 8 main cases
3. Fix the ID / status / approval / event specifications
4. Implement overlay / projection / atomicity / recovery in runtime
5. Convert to public contract with BFF
6. UI to Home / Chat / Approval Implement in this order
7. Verify E2E with emphasis on reconnection / approval / stop / active session constraints
8. Determine MVP if Must requirements are met.
