# Issue 117 Work Package: Repo-local LLM Wiki Agent Guidance

## Purpose

- Formalize the minimum ingest, query, and lint workflow for repo agents maintaining the repo-local LLM Wiki.

## Primary issue

- Issue: `#117` https://github.com/tsukushibito/codex-webui/issues/117

## Source docs

- `AGENTS.md`
- `docs/README.md`
- `docs/index.md`
- `docs/log.md`
- `docs/codex_webui_llm_wiki_adoption_note_v0_1.md`
- Issue `#113`
- Issue `#117`

## Scope for this package

- define minimum `ingest`, `query`, and `lint` guidance for agents
- define when chat-derived synthesis should be promoted into maintained wiki pages
- define how `docs/index.md` and `docs/log.md` should be updated as part of wiki maintenance
- update the relevant repo guidance documents so future sessions follow the same workflow

## Exit criteria

- agent-facing guidance explains how new source material is ingested into the wiki
- agent-facing guidance explains when useful query outputs should become maintained pages
- agent-facing guidance explains how `index.md` and `log.md` should be updated
- the documented workflow stays consistent with the repo's `docs/`, `tasks/`, and `artifacts/` boundaries

## Work plan

- review the current repo guidance and the new wiki entrypoints
- write the minimum operational rules for ingest, query promotion, and lint updates
- update maintained guidance documents with those rules
- verify the package state and issue execution metadata

## Artifacts / evidence

- Planned evidence: maintained guidance updates under `AGENTS.md` and `docs/`
- Linked Issue execution state for `#117`

## Status / handoff notes

- Status: `locally complete`
- Notes: `Updated AGENTS.md with repo-wide wiki promotion and update triggers, documented the detailed ingest/query/lint workflow in docs/README.md, linked that guidance from docs/index.md, and recorded the workflow formalization in docs/log.md. Retrospective: keeping detailed workflow in docs/README.md and only short triggers in AGENTS.md fit the repo boundary well. Follow-up work is product-neutral maintenance only; this package can be archived while the issue stays open until the branch reaches main.`

## Archive conditions

- Archive this package when the exit criteria are met and the handoff notes are updated.
