# docs/notes

This directory stores maintained repo-local LLM Wiki pages that are useful, reusable, and worth preserving, but are not yet the authoritative requirements, API specifications, or validation plans for the project.

## Placement Policy

- use this directory for maintained design-thinking notes
- use this directory for maintained research memos
- use this directory for cross-source synthesis pages that are likely to be reused
- promote or split content into `requirements/`, `specs/`, or `validation/` when it becomes normative

## Relationship to Other Areas

- `docs/requirements/`: authoritative statements of what to build
- `docs/specs/`: authoritative statements of how to build it
- `docs/validation/`: authoritative validation plans and confirmed behavior/decision records tied to quality or correctness
- `tasks/`: active execution packages only
- `artifacts/`: evidence, logs, and judgment notes

## Naming Rules

- prefer `codex_webui_<topic>_<note_type>_v0_1.md`
- use explicit note types such as `design_note`, `research_memo`, or `synthesis_note`
- keep one note focused on one reusable topic

## Boundaries

- do not store active work instructions here
- do not store raw evidence or logs here
- do not let `notes/` become a hidden source of truth for finalized contracts
