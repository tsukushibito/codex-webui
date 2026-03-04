# Change Size

Use this guide to decide how much workflow depth the task needs.

## Small Change

Use the small-change path when most of these are true:
- The change is local to one file or a tightly related few files.
- The requested behavior is already clear.
- There is little architectural impact.
- Validation is straightforward.
- The task can be completed without a file-based plan unless extra tracking clearly helps.

Recommended depth:
- Clarify requirements briefly.
- Skip design notes unless structure is unclear.
- Keep the plan lightweight.
- Use task artifacts only when they make the work meaningfully clearer.

## Medium Change

Use the medium-change path when one or more of these are true:
- The change spans multiple files or layers.
- Requirements are clear enough to start but still need explicit boundaries.
- Design choices affect interfaces, state, or responsibility splits.
- Validation needs more than one check.
- A temporary task directory would improve planning or review quality.

Recommended depth:
- Create task artifacts under `tasks/`.
- Write and review requirements.
- Write design notes if the task changes structure or behavior boundaries.
- Write and review an implementation plan.
- Make an explicit TDD decision.

## Large Change

Use the large-change path when one or more of these are true:
- The change affects architecture, major flows, or multiple subsystems.
- The task introduces significant new behavior, integration, or risk.
- The work likely needs staged execution over multiple commits or sessions.
- Missing planning would likely cause rework or blind spots.

Recommended depth:
- Create task artifacts under `tasks/`.
- Write and review requirements.
- Write and review design.
- Write and review an implementation plan with explicit validation steps.
- Make an explicit TDD decision and identify which parts should use it.
- Keep durable architectural decisions synchronized with `docs/` or Issues.
