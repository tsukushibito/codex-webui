# Issue 116 Work Package: Repo-local LLM Wiki Index and Log

## Purpose

- Introduce the minimum persistent `index.md` and `log.md` entrypoints for the repo-local LLM Wiki.

## Primary issue

- Issue: `#116` https://github.com/tsukushibito/codex-webui/issues/116

## Source docs

- `docs/codex_webui_llm_wiki_adoption_note_v0_1.md`
- `docs/README.md`
- `docs/notes/README.md`
- Issue `#113`
- Issue `#116`

## Scope for this package

- add the initial wiki `index.md`
- add the initial wiki `log.md`
- define minimum structure and update expectations for both files
- update maintained docs as needed so future `#117` workflow rules can rely on these entrypoints

## Exit criteria

- `docs/index.md` exists with a stable navigation-oriented structure
- `docs/log.md` exists with a stable append-oriented structure
- maintained docs explain enough about those files for later ingest/query/lint guidance
- the package README and linked Issue execution metadata reflect the active slice accurately

## Work plan

- review the `#115` scope decision and current docs layout
- define lightweight first versions of `index.md` and `log.md`
- update maintained docs to describe the new entrypoints
- verify the package state and issue execution metadata

## Artifacts / evidence

- Planned evidence: maintained doc updates under `docs/`
- Linked Issue execution state for `#116`

## Status / handoff notes

- Status: `locally complete`
- Notes: `Added the initial docs/index.md and docs/log.md entrypoints, updated docs/README.md with wiki entrypoint guidance, and kept the scope lightweight so #117 can define the agent workflow later. Retrospective: the simple entrypoint pattern worked well for this slice; the main follow-up is to make #117 update discipline explicit so index/log do not drift from later note additions.`

## Archive conditions

- Archive this package when the exit criteria are met and the handoff notes are updated.
