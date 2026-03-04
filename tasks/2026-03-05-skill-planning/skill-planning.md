# Skill Planning Notes

## Purpose
- Capture the current recommendation for repository-local Skills.
- Keep this as a temporary planning note, not as a formal policy document.

## Current Recommendation

### Create Now

#### `task-execution`
- Primary repository-local workflow Skill for implementation work.
- Use when working on a feature, bug fix, or other coding task that needs structured execution.
- This Skill should cover:
  - change-size assessment
  - requirements clarification
  - requirements self-review and revision loop
  - design decision and design self-review loop
  - implementation planning and planning self-review loop
  - TDD suitability decision
  - implementation
  - self-evaluation
  - test execution and reporting of unverified items
  - promotion of durable decisions back into Issues or `docs/`

### Do Not Create Yet

#### `issue-management`
- Keep issue and project tracking policy in documents for now.
- The repository has a clear policy direction, but the execution workflow is not yet stable enough to justify a dedicated Skill.
- Revisit after the team has repeated the same issue-handling flow enough times to identify a fixed sequence.

#### Separate `small-change`, `medium-change`, `large-change` Skills
- Do not split by size yet.
- Keep one execution Skill and let it branch internally by change size.
- This avoids duplicated guidance and reduces triggering ambiguity.

## Proposed Shape of `task-execution`

### Core Flow
1. Assess change size.
2. Clarify requirements.
3. Review requirements and revise if needed.
4. Decide whether design work is required.
5. Produce design as needed.
6. Review design and revise if needed.
7. Produce an implementation plan.
8. Decide whether TDD should be used.
9. Review the implementation plan and revise if needed.
10. Implement.
11. Self-evaluate against requirements, design, and plan.
12. Run tests and report unverified items.
13. Promote durable decisions into Issues or `docs/`.

### Expected Resources Inside the Skill
- `references/change-size.md`
  - Criteria for small, medium, and large changes.
- `references/requirements-review.md`
  - Review checklist for scope, acceptance criteria, constraints, and unresolved points.
- `references/design-review.md`
  - Review checklist for structure, boundaries, dependencies, and risk.
- `references/planning-review.md`
  - Review checklist for sequencing, verification strategy, rollback, and risk handling.
- `references/tdd-decision.md`
  - Rules for when TDD should be preferred, optional, or skipped.

### Optional Later Resources
- `assets/requirements-template.md`
- `assets/design-template.md`
- `assets/plan-template.md`
- `scripts/check_work_product.sh` or similar lightweight validation helpers if repeated checks appear

## Relationship to Repository Rules
- `docs/task-management.md` remains the source of truth for issue and project tracking policy.
- `docs/work-product-rules.md` remains the source of truth for what should be preserved in `docs/`.
- The Skill should execute work under those policies rather than redefining them.

## Open Decisions Before Building the Skill
- Whether the Skill should always emit explicit requirement/design/plan summaries in chat, or only for medium and large changes.
- Whether templates should be added immediately or after observing a few real runs.

## Next Step
- Create one repository-local Skill named `task-execution`.
- Start with `references/` only.
- Add templates or scripts only after repeated usage shows they are needed.
