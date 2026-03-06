# Planning Review

Review the implementation plan before starting execution.

## Review Checklist

- Is the implementation sequence coherent?
- Does each planned step have a validation method?
- If the task changes a consumed interface, does the plan include at least one end-to-end consumer validation path or an explicit follow-up Issue?
- If the task changes an interface or behavior contract, does the plan validate important edge cases and failure semantics, not only the happy path?
- Is the TDD decision recorded?
- Are risks, unknowns, and deferred items listed?
- Is the task breakdown small enough to track progress?
- Are prerequisites complete?
- Is the merge path and Issue closeout method explicit?

## Passing Conditions

Do not move forward until all of these are true:
- The implementation sequence is coherent and avoids unnecessary rework.
- Each planned step has a validation method, such as tests, manual checks, or observable behavior.
- For consumed interface changes, the plan includes end-to-end validation through at least one shipped consumer path, or it records an explicit follow-up Issue and rationale.
- For interface or behavior-contract changes, the plan includes validation for boundary conditions and caller-visible failure modes.
- The TDD decision is recorded with a short rationale.
- Risks, unknowns, and deferred items are listed.
- The task breakdown is small enough to execute without losing track of progress.
- No missing prerequisite remains that would stop implementation after work begins.
- The merge path and Issue closeout method are explicit.
