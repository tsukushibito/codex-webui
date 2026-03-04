# TDD Decision

Treat TDD as an explicit decision point, not as a default slogan.

## Prefer TDD When

- The task defines behavior with clear inputs and outputs.
- State transitions or edge cases are important.
- Public interfaces or API contracts need to be fixed early.
- Regression risk is high.
- The work can be split into small, testable increments.

## TDD Is Optional When

- The task has both behavioral core logic and setup work.
- Some parts are testable first, but others need scaffolding before tests are practical.
- A mixed approach would reduce risk better than a blanket rule.

## Skip or Defer TDD When

- The work is exploratory or spike-like.
- The task is primarily environment setup or integration bootstrapping.
- The task is mainly visual or presentational and the behavior is hard to express as useful tests at the start.
- The system lacks the necessary test harness and adding it first would dominate the task for little value.

## Required Output

Record one of these decisions in the plan:
- `TDD: yes` with a short rationale and the first behaviors to test
- `TDD: partial` with a short rationale and which parts will use it
- `TDD: no` with a short rationale
