# Task Management Rules

## 1. Purpose
- Define how work is tracked in this repository.
- Keep issue tracking stable while allowing implementation work to move quickly.

## 2. Operational Assumptions
- GitHub Issues and GitHub Projects are available for this repository.
- This repository is currently documentation-first and may include local working notes during implementation.
- The repository is primarily used by a single maintainer, but task records should remain understandable to other collaborators.

## 3. Source of Truth
- Use GitHub Issues and GitHub Projects as the system of record for repository work.
- Treat Issues as problem and deliverable tracking, not as a transcript of every implementation step.
- Treat the Project as the authoritative place for workflow state, priority, and ordering.

## 4. What Belongs in Issues
- Create one Issue per deliverable-sized unit of work.
- Store the goal, rationale, acceptance criteria, and important constraints in the Issue.
- Use an Issue when the work should be prioritized, scheduled, reviewed independently, or referenced later.
- Keep related review fixes inside the same Issue when they are still part of the original acceptance criteria.

## 5. What Stays Out of Issues
- Do not create a separate Issue for every temporary implementation step.
- Do not use Issues for scratch notes, short-lived TODO lists, or local sequencing details.
- Do not split review follow-up into a new Issue unless the scope becomes independent from the original deliverable.

## 6. Local Task Management
- Use local files for active work management during implementation.
- Keep incomplete or temporary working notes under `docs/draft/`.
- Local notes may include:
  - investigation notes
  - temporary checklists
  - implementation order
  - review response notes
  - unresolved questions to fold back into an Issue or formal document later
- If a local note contains an important long-term decision, copy that decision back into the relevant Issue or a formal document under `docs/`.

## 7. Recommended Workflow
1. Define the deliverable in a GitHub Issue.
2. Add the Issue to the GitHub Project.
3. Set Priority, Status, and Area in the Project.
4. Use a local note only if the implementation needs temporary task breakdown or investigation tracking.
5. Fold durable conclusions back into the Issue or formal documentation before closing the work.

## 8. When to Create a New Issue
- Create a new Issue when new work has its own acceptance criteria.
- Create a new Issue when the work can be scheduled or prioritized separately.
- Create a new Issue when the original Issue has grown beyond a single deliverable.
- Create a new Issue when the follow-up may be intentionally deferred.

## 9. AGENTS.md and Skills
- Keep the detailed task-management policy in `docs/`.
- Add only short repository-level guardrails to `AGENTS.md` when agent behavior must consistently follow them.
- For this repository, it is reasonable for `AGENTS.md` to point agents toward this document, but the full policy does not need to be duplicated there.
- Do not create a Skill for this policy unless the same workflow must be reused across multiple repositories or teams.
- A Skill is appropriate for reusable cross-repository workflows; this document is currently repository-local policy.
