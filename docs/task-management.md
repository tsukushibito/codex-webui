# Task Management Rules

## 1. Purpose
- Define how work is tracked in this repository.
- Keep issue tracking stable while allowing implementation work to move quickly.

## 2. Operational Assumptions
- GitHub Issues and GitHub Projects are available for this repository.
- This repository is currently documentation-first.
- The repository is primarily used by a single maintainer, but task records should remain understandable to other collaborators.
- Temporary execution artifacts may be stored in the repository under `tasks/`.

## 3. Source of Truth
- Use GitHub Issues and GitHub Projects as the system of record for repository work.
- Treat Issues as problem and deliverable tracking, not as a transcript of every implementation step.
- Treat the Project as the authoritative place for workflow state, priority, and ordering.

## 4. What Belongs in Issues
- Create one Issue per deliverable-sized unit of work.
- Store the goal, rationale, acceptance criteria, and important constraints in the Issue.
- Use an Issue when the work should be prioritized, scheduled, reviewed independently, or referenced later.
- Keep related review fixes inside the same Issue when they are still part of the original acceptance criteria.

## 4.1 Issue Definition Guidance
- Write Issue bodies so the implementation boundary is explicit, not implied.
- State whether the Issue covers only a backend or contract change, or also includes bundled or first-party consumer work.
- Add an `Out of scope` section when splitting backend and consumer work across separate Issues.
- For API, event, schema, protocol, or other consumed interface changes, list the affected consumers or workflows explicitly.
- For API, event, schema, protocol, or other behavior changes, include an `Edge cases and error handling` section.
- In that section, make invalid-input behavior explicit, including missing-versus-invalid distinctions when they matter to callers.
- Call out file or path constraints explicitly when relevant, such as directory handling, symlinks, binary rejection, and size limits.
- Make the validation boundary explicit in the acceptance criteria.
- If end-to-end consumer validation is deferred, link the follow-up Issue in the body instead of leaving the consumer work implicit.

## 5. What Stays Out of Issues
- Do not create a separate Issue for every temporary implementation step.
- Do not use Issues for scratch notes, short-lived TODO lists, or local sequencing details.
- Do not split review follow-up into a new Issue unless the scope becomes independent from the original deliverable.

## 6. Local Task Management
- Use `tasks/` for temporary local work artifacts when implementation needs active step-by-step tracking.
- Store active work under a dated task directory name such as `tasks/2026-03-05-issue-4-session-sse/`.
- Prefer including a date and a short task identifier, and include an Issue number when one exists.
- Move completed task directories into `tasks/archived/`.
- Do not treat files under `tasks/` or `tasks/archived/` as formal repository documentation.
- Keep durable decisions in GitHub Issues or formal documents under `docs/`.
- Follow `docs/work-product-rules.md` for rules on which implementation artifacts should be preserved.

## 7. Recommended Workflow
1. Define the deliverable in a GitHub Issue.
2. Add the Issue to the GitHub Project.
3. Set Priority, Status, and Area in the Project.
4. Create a task directory under `tasks/` if the implementation needs temporary requirements, design, or plan artifacts.
5. Fold durable conclusions back into the Issue or formal documentation before closing the work.
6. Move the completed task directory into `tasks/archived/`.

## 8. When to Create a New Issue
- Create a new Issue when new work has its own acceptance criteria.
- Create a new Issue when the work can be scheduled or prioritized separately.
- Create a new Issue when the original Issue has grown beyond a single deliverable.
- Create a new Issue when the follow-up may be intentionally deferred.

## 9. AGENTS.md and Skills
- Keep the detailed task-management policy in `docs/`.
- Add only short repository-level guardrails to `AGENTS.md` when agent behavior must consistently follow them.
- For this repository, it is reasonable for `AGENTS.md` to point agents toward this document, but the full policy does not need to be duplicated there.
- Keep issue-tracking policy in documents, and define repeatable execution workflows in Skills when the workflow becomes stable enough to standardize.
