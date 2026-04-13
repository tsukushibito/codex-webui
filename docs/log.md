# Codex WebUI LLM Wiki Log

Last updated: 2026-04-13

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

## [2026-04-13] lint | explicit escalation rule for recurring operational pitfalls

Source:

- user request to make post-failure knowledge capture mandatory instead of implicit
- `AGENTS.md`
- `docs/README.md`

Updated:

- `AGENTS.md`
- `docs/README.md`
- `docs/log.md`

Notes:

- made recurring tool, API, and workflow pitfalls an explicit promotion trigger instead of relying only on the broader reusable-synthesis wording
- clarified that repeated GitHub or tooling surprises should be moved into maintained docs or the relevant repo skill so later sessions do not rediscover them
## [2026-04-13] query | GitHub issue and Project operation pitfalls

Source:

- repeated retries during Issue and Project maintenance for the `ngrok` migration tracking tree
- `gh --version`
- `gh help issue`
- `gh api --help`
- `gh project item-list --help`

Updated:

- `docs/notes/codex_webui_github_projects_operations_synthesis_note_v0_1.md`
- `docs/index.md`
- `docs/log.md`

Notes:

- promoted recurring GitHub CLI and API failure patterns into a maintained note instead of leaving them in chat history
- documented the main causes of retries: incomplete high-level `gh` coverage, REST versus GraphQL behavior differences, typed JSON pitfalls, default Project item limits, and unsafe parallel sub-issue writes
- recorded the recommended verification split between issue hierarchy, Project membership, and Project field values

## [2026-04-09] query | v0.9 roadmap review follow-up and implementation-line tracking

Source:

- user review request for the v0.9 migration roadmap
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`

Updated:

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/log.md`

Notes:

- tightened the roadmap around maintained validation deliverables, resume-priority preservation, and background high-priority notification handling
- clarified that `#60` remains the closed v0.8 legacy parent while `#124` is the active v0.9 cutover parent
- recommended a single-Project lineage field or equivalent labels instead of creating competing tracking structures

## [2026-04-09] ingest | v0.9 implementation cutover roadmap and tracking reset

Source:

- user request to document the v0.9 implementation cutover plan
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`

Updated:

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/log.md`

Notes:

- replaced the old v0.8-oriented implementation roadmap with a v0.9 cutover roadmap for runtime, BFF, UI, and validation
- recorded the recommended GitHub issue breakdown directly in the maintained roadmap
- created GitHub issues `#124`, `#125`, `#126`, and `#127`, and repurposed open validation issues `#63` and `#93` to align Project execution tracking with the maintained roadmap

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

## [2026-04-09] lint | wiki maintenance guidance drift cleanup

Source:

- review of `AGENTS.md` and `.agents/skills/codex-webui-llm-wiki-maintenance/SKILL.md`
- `docs/codex_webui_llm_wiki_adoption_note_v0_1.md`
- Karpathy, "LLM Wiki"

Updated:

- `AGENTS.md`
- `docs/README.md`
- `docs/codex_webui_llm_wiki_adoption_note_v0_1.md`
- `docs/index.md`
- `.agents/skills/codex-webui-llm-wiki-maintenance/SKILL.md`
- `docs/log.md`

Notes:

- reduced workflow duplication in the repo skill so `AGENTS.md`, `docs/README.md`, and the adoption note remain the primary references
- clarified that `docs/index.md` should be refreshed when navigation, discoverability, or content summaries materially change
- updated the adoption note to reflect that issues `#116` and `#117` are complete and that follow-up is now maintenance-oriented
