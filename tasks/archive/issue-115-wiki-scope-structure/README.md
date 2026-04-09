# Issue 115 Work Package: Repo-local LLM Wiki Scope and Structure

## Purpose

- Define the repo-local LLM Wiki scope, structure, and ownership boundaries for `codex-webui`.

## Primary issue

- Issue: `#115` https://github.com/tsukushibito/codex-webui/issues/115

## Source docs

- `AGENTS.md`
- `docs/README.md`
- `docs/codex_webui_llm_wiki_adoption_note_v0_1.md`
- Issue `#113`
- Issue `#115`

## Scope for this package

- decide what content belongs in the repo-local wiki and what stays outside it
- define placement relative to `docs/`, `tasks/`, and `artifacts/`
- define page categories for maintained docs, design notes, and research memos
- define naming and placement rules for wiki-managed pages
- update the maintained docs needed to record those decisions

## Exit criteria

- the repo-local wiki scope and ownership boundary are documented in maintained repo docs
- page categories and placement rules are explicit enough to guide follow-on work in `#116` and `#117`
- the package README and linked Issue execution metadata reflect the active slice accurately

## Work plan

- review current repo document boundaries and the LLM Wiki adoption note
- draft the repo-local wiki scope, category, and placement rules
- update maintained docs with the chosen structure and boundaries
- verify the package state and issue execution metadata

## Artifacts / evidence

- Planned evidence: maintained doc updates under `docs/`
- Linked Issue execution state for `#115`

## Status / handoff notes

- Status: `locally complete`
- Notes: `Completed the #115 slice in the worktree by defining the repo-local LLM Wiki boundary inside docs/, adding docs/notes/README.md, and updating docs/README.md with placement and promotion rules. Retrospective: the bounded slice and docs-only write scope worked well; the main workflow problem was agent read-only drift during intake/planning, so future runs should verify subagent side effects early. Follow-up remains on #116 and #117, and this package should be archived while the issue stays open until the branch reaches main.`

## Archive conditions

- Archive this package when the exit criteria are met and the handoff notes are updated.
