# apps

Implementation directories for runtime-facing services live here.

## Current structure

- `codex-runtime/`: internal runtime foundation for Phase 3 MVP work
- `frontend-bff/`: public BFF facade for Phase 4 MVP work

## Responsibility boundary

- Keep source-of-truth requirements and API contracts in `docs/`
- Keep active execution slices in `tasks/`
- Keep service-specific setup and commands in each app's local `README.md`
- Before scaffolding a new app directory, confirm the maintained stack choice in `docs/specs/codex_webui_technical_stack_decision_v0_1.md`
