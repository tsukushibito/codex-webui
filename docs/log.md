# Codex WebUI LLM Wiki Log

Last updated: 2026-04-09

## Purpose

This file is the chronological maintenance log for the repo-local LLM Wiki.

Use it to record when wiki-relevant material is added, revised, linted, or restructured so later sessions can understand recent changes without rediscovering them from scratch.

## Entry format

Start each entry with a level-2 heading in this format:

`## [YYYY-MM-DD] <kind> | <topic>`

Use `<kind>` values such as:

- `ingest`
- `query`
- `lint`
- `restructure`

After the heading, keep the body concise:

- source material or reason for the change
- maintained files that were added or updated
- short note on what changed or remains deferred

## Entries

## [2026-04-09] restructure | repo-local LLM Wiki scope and entrypoints

Source:

- issue `#115`
- issue `#116`
- `docs/codex_webui_llm_wiki_adoption_note_v0_1.md`

Updated:

- `docs/codex_webui_llm_wiki_adoption_note_v0_1.md`
- `docs/notes/README.md`
- `docs/index.md`
- `docs/log.md`

Notes:

- formalized the repo-local wiki boundary inside `docs/`
- introduced initial `index.md` and `log.md` entrypoints
- deferred agent workflow rules to issue `#117`

## [2026-04-09] restructure | repo-local LLM Wiki maintenance workflow

Source:

- issue `#117`
- `AGENTS.md`
- `docs/README.md`

Updated:

- `AGENTS.md`
- `docs/README.md`
- `docs/index.md`
- `docs/log.md`

Notes:

- formalized minimum `ingest`, `query`, and `lint` expectations for repo agents
- made `index.md` and `log.md` part of the expected wiki update flow
- kept the workflow lightweight and documentation-first, without adding search tooling

## [2026-04-09] restructure | repo-local LLM Wiki maintenance skill

Source:

- user request to package the `ingest`, `query`, and `lint` workflow as a repo skill
- `AGENTS.md`
- `docs/README.md`

Updated:

- `.agents/skills/codex-webui-llm-wiki-maintenance/SKILL.md`
- `.agents/skills/codex-webui-llm-wiki-maintenance/agents/openai.yaml`
- `AGENTS.md`
- `docs/log.md`

Notes:

- added a repo-local skill for repeated wiki maintenance work
- kept `docs/README.md` and `AGENTS.md` as the source of truth for the workflow rules
- did not add separate scripts or a second tracking structure for wiki operations
