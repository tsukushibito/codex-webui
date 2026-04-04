# docs

This directory is the area for source-of-truth documents such as requirements, specifications, and validation plans.

## Placement Policy

- `requirements/`: stores documents that define what to build
- `specs/`: stores specifications that define how to build it
- `validation/`: stores source-of-truth validation plans, review points, and design decisions
- directly under `docs/`: only documents whose final category is not yet fixed, or guidance documents that cut across categories

## Current Structure

- `requirements/codex_webui_mvp_requirements_v0_8.md`
- `specs/codex_webui_common_spec_v0_8.md`
- `specs/codex_webui_public_api_v0_8.md`
- `specs/codex_webui_internal_api_v0_8.md`
- `specs/codex_webui_technical_stack_decision_v0_1.md`
- `validation/app_server_behavior_validation_plan_checklist.md`
- `codex_webui_mvp_roadmap_v0_1.md`
- `codex_webui_dev_container_onboarding.md`

## Responsibility Boundaries with Related Directories

- `tasks/`: stores work instructions such as execution steps, phase breakdowns, and update responsibilities
- `artifacts/`: stores execution outputs such as observation logs, evidence, and judgment notes
- `docs/`: stores the maintained source-of-truth documents updated based on those execution outputs

## Naming Rules

- Prioritize consistency with existing documents, and keep the current filenames for now
- When adding a new file, place it based on the category of its content rather than the document type alone
- If a single file ends up spanning multiple responsibility categories, consider splitting it as needed
