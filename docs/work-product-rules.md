# Work Product Rules

## 1. Purpose
- Define which implementation artifacts should be preserved in this repository.
- Keep long-lived documentation useful without preserving short-lived work products that will quickly go stale.

## 2. Operational Assumptions
- GitHub Issues and GitHub Projects are used for repository-level task and priority tracking.
- This repository preserves stable requirements and stable architectural decisions in `docs/`.
- Short-lived implementation aids may exist during work, but they are not part of the repository's lasting documentation set.

## 3. Requirements Documents
- Preserve requirements and specifications in `docs/`.
- Use requirements documents to define the target behavior, scope, constraints, and acceptance criteria for a feature or change.
- Update preserved requirements documents when durable scope or behavior changes.

## 4. Design Documents
- Preserve only high-level design in `docs/`.
- High-level design includes architecture, system boundaries, service responsibilities, security boundaries, integration contracts, persistence models, and other decisions that remain useful across multiple changes.
- Do not preserve issue-local detailed design as formal repository documentation when it is likely to change during implementation or refactoring.
- If a detailed design decision becomes durable and broadly relevant, promote the decision itself into a high-level design document.

## 5. Task Lists and Execution Notes
- Do not preserve task checklist documents as formal repository documentation.
- Treat implementation task lists, sequencing notes, and temporary review-response notes as short-lived execution aids.
- Once the work is complete, the authoritative record should be the GitHub Issue, GitHub Project state, the merged code, tests, and any durable documentation updates.

## 6. Placement Rules
- Store preserved requirements and high-level design documents under `docs/`.
- Keep repository-level task and status tracking in GitHub Issues and GitHub Projects.
- Do not create persistent formal documents for temporary detailed design or task checklists.

## 7. Promotion Rule
- Promote a work artifact into `docs/` only when it has durable reference value after implementation.
- Durable reference value typically means at least one of:
  - it defines externally visible behavior
  - it records an architectural or operational decision
  - it will be reused by future work
  - it affects multiple issues or implementation units

## 8. Relationship to Skills
- Use repository documents to define preservation policy.
- Use Skills to define how implementation work should proceed under that policy.
- A Skill may require requirements review, design review, planning, implementation, and testing, but it should not preserve every intermediate artifact as formal documentation.
