---
name: task-execution
description: Structured implementation workflow for repository work that needs consistent execution quality. Use when Codex is asked to implement a feature, bug fix, refactor, or other code change that should follow a repeatable process for change-size assessment, requirements review, design review, implementation planning, TDD suitability review, implementation, self-evaluation, and test reporting.
---

# Task Execution

## Overview

Follow a single repository-local execution workflow for coding tasks. Keep issue tracking in GitHub, keep durable requirements and high-level design in `docs/`, and use `tasks/` only for temporary task artifacts when the work benefits from file-based planning.

## Workflow

1. Assess change size using [references/change-size.md](references/change-size.md).
2. Decide whether temporary task artifacts are needed.
3. Clarify requirements and review them using [references/requirements-review.md](references/requirements-review.md).
4. Decide whether design work is needed.
5. Produce design notes when needed and review them using [references/design-review.md](references/design-review.md).
6. Produce an implementation plan and review it using [references/planning-review.md](references/planning-review.md).
7. Decide whether TDD should be used with [references/tdd-decision.md](references/tdd-decision.md).
8. Implement.
9. Self-evaluate against the reviewed requirements, design, and plan.
10. Run tests or other validation and report any unverified items.
11. Finalize delivery with a merge path and Issue closeout method.
12. Promote durable decisions back into GitHub Issues or `docs/`.
13. Record any repeated friction, missing guidance, or repeated manual wording as a candidate improvement for this skill.
14. Move completed task artifacts into `tasks/archived/`.

## Task Artifacts

- Use `tasks/` only when the task needs temporary requirements notes, design notes, or a file-based checklist.
- For medium and large changes, prefer a task directory named like `tasks/2026-03-05-issue-4-session-sse/`.
- For small changes, skip file artifacts unless they clearly improve execution quality.
- Do not treat `tasks/` as formal documentation. Preserve durable behavior in `docs/` or GitHub Issues instead.

## Review Discipline

- Do not move from requirements, design, or planning to the next stage until the corresponding passing conditions are satisfied.
- Revise and re-review if a stage still has contradictions, missing prerequisites, or unclear validation.
- Keep the review output concise, but explicit enough that the next stage does not depend on guesswork.

## TDD Decision

- Treat TDD as a decision point, not as a blanket rule.
- Prefer TDD when behavior, interfaces, or state transitions should be fixed before implementation.
- Skip or defer TDD when the task is exploratory, environment-bringing-up, or heavily visual, but record the reason.

## Skill Feedback Loop

- At the end of the task, note whether the skill caused confusion, missed a decision point, or forced repeated manual explanation.
- Prefer updating the skill only when the same issue recurs or when the gap clearly affects execution quality.
- Put workflow changes in `SKILL.md`.
- Put detailed review criteria or decision rules in `references/`.

## Delivery and Issue Closeout

- Prefer PR-based delivery, including self-review cases.
- Use `Closes #<issue-number>` in the PR description when applicable so Issue closeout is automated on merge.
- If direct push to `main` is used, record that choice and close the Issue manually.

## References

- Use [references/change-size.md](references/change-size.md) to choose the workflow depth.
- Use [references/requirements-review.md](references/requirements-review.md) for requirements review and passing conditions.
- Use [references/design-review.md](references/design-review.md) for design review and passing conditions.
- Use [references/planning-review.md](references/planning-review.md) for plan review and passing conditions.
- Use [references/tdd-decision.md](references/tdd-decision.md) to decide whether TDD should be applied.
