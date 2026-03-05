# Planning Review

Review the implementation plan before starting execution.

## Review Checklist

- Is the implementation sequence coherent?
- Does each planned step have a validation method?
- Is the TDD decision recorded?
- Are risks, unknowns, and deferred items listed?
- Is the task breakdown small enough to track progress?
- Are prerequisites complete?
- Does the plan include explicit security-boundary validation?
- Does the plan include at least one negative test for unsafe or invalid inputs?
- Does the plan include protocol compatibility checks for server-initiated requests/events?
- Does the plan verify both Issue acceptance criteria and repository design expectations?
- Is the merge path and Issue closeout method explicit?

## Passing Conditions

Do not move forward until all of these are true:
- The implementation sequence is coherent and avoids unnecessary rework.
- Each planned step has a validation method, such as tests, manual checks, or observable behavior.
- The TDD decision is recorded with a short rationale.
- Risks, unknowns, and deferred items are listed.
- The task breakdown is small enough to execute without losing track of progress.
- No missing prerequisite remains that would stop implementation after work begins.
- The plan includes explicit security-boundary validation.
- The plan includes at least one negative test for unsafe or invalid inputs.
- The plan includes protocol compatibility checks for server-initiated requests/events.
- The plan verifies both Issue acceptance criteria and repository design expectations.
- The merge path and Issue closeout method are explicit.
