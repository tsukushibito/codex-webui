---
name: codex-webui-llm-wiki-maintenance
description: Maintain the repo-local LLM Wiki for `codex-webui`. Use when new source material should be incorporated into maintained `docs/` pages, when reusable design or research synthesis should be promoted from chat into maintained `docs/` content, when `docs/index.md` or `docs/log.md` need maintenance, or when stale, inconsistent, or orphaned wiki pages should be linted and corrected.
---

# Codex WebUI LLM Wiki Maintenance

## Overview

Use this skill to keep the repo-local LLM Wiki coherent without turning `docs/` into a dump of transient notes, execution plans, or raw evidence.

Treat `ingest`, `query`, and `lint` as three modes of the same maintenance workflow:

- `ingest`: absorb new source material into maintained repo knowledge
- `query`: promote a reusable answer from chat into maintained repo knowledge
- `lint`: repair stale, inconsistent, or weakly-linked maintained wiki pages

## Build Context

Read these files before making wiki changes:

- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `docs/codex_webui_llm_wiki_adoption_note_v0_1.md`
- `docs/index.md`
- `docs/log.md`
- `docs/notes/README.md` when adding or revising note pages

Read the specific maintained pages you may update before deciding whether to revise an existing page or add a new one.

## Responsibility Boundaries

Use `docs/README.md` and the adoption note as the source of truth for placement and boundary decisions.

Keep the repo adaptation intact:

- `docs/` is the maintained knowledge layer
- `tasks/` and `artifacts/` are not wiki surfaces
- GitHub Issues and Projects track execution state; they are not the maintained wiki itself
- prefer updating an existing maintained page over creating a parallel note that says the same thing

## Choose the Mode

Use `ingest` when a new source changes project understanding and should update maintained repo knowledge.

Use `query` when the answer to a cross-source question is likely to be reused and should not remain only in conversation history.

Use `lint` when the wiki already contains stale summaries, inconsistent statements, weak navigation, or orphaned maintained pages.

If more than one mode applies, start with the one that best explains why the change exists, then complete the same shared maintenance steps below.

## Shared Maintenance Rules

- Keep the repo-local wiki inside `docs/`; do not introduce a competing top-level wiki tree
- Promote reusable knowledge, not transient exploration
- Use `docs/README.md` for category placement and promotion rules
- Use `docs/notes/README.md` for note-page naming and note-specific boundaries
- Refresh `docs/index.md` when maintained navigation, discoverability, or content summaries materially change
- Append `docs/log.md` whenever the maintained wiki materially changes
- Follow the existing `docs/log.md` entry format instead of inventing a new one

## Placement Decision

Choose the destination before editing:

- review the placement policy in `docs/README.md`
- use `docs/notes/README.md` when the destination might be `docs/notes/`
- use the adoption note when the question is about repo-local wiki scope or boundaries rather than document category alone

If the content is primarily a work plan, execution checklist, raw observation dump, or evidence bundle, it does not belong in the wiki.

## Ingest Workflow

1. Identify the new source material and what project understanding it changes.
2. Find the maintained page that should absorb the change.
3. If no existing page is appropriate, add a new maintained page in the correct `docs/` location.
4. Refresh `docs/index.md` if the change affects maintained navigation, discoverability, or content summaries.
5. Append `docs/log.md` with an `ingest` entry if the maintained wiki changed.

Use `ingest` for inputs such as:

- issue or PR discussion that settles a reusable design point
- implementation findings that should change a maintained spec or note
- external references or research that materially refine repo understanding

## Query Promotion Workflow

1. Decide whether the answer is likely to be reused by later sessions.
2. If it is not reusable, leave it in chat and stop.
3. If it is reusable, choose the correct maintained destination in `docs/`.
4. Write the result as a maintained page update or a new maintained note rather than as chat-only synthesis.
5. Refresh `docs/index.md` if navigation, discoverability, or content summaries changed and append `docs/log.md` with a `query` entry.

Use `query` promotion for outputs such as:

- cross-document explanations of repo structure or workflow
- reusable design rationale synthesized from multiple maintained docs
- research summaries that will likely guide later implementation work

## Lint Workflow

1. Audit the relevant maintained pages for stale statements, contradictions, weak placement, or poor discoverability.
2. Correct the maintained pages directly instead of layering on another summary page.
3. Repair `docs/index.md` if navigation, discoverability, or summaries are now incomplete or misleading.
4. Append `docs/log.md` with a `lint` entry describing what was corrected.

Use `lint` when you see problems such as:

- a note that became normative but still lives only under `docs/notes/`
- index entries that do not reflect the current maintained pages
- summaries that drift from the current requirement or spec documents
- wiki pages with no clear path from `docs/index.md`

## Guardrails

- Do not duplicate `tasks/` package detail into the wiki
- Do not move raw evidence from `artifacts/` into the wiki unless it is distilled into maintained knowledge
- Do not add note pages that merely restate existing authoritative documents
- Do not skip `docs/log.md` when the maintained wiki materially changes
- Do not treat every chat answer as promotion-worthy

## Example Requests

- `Use $codex-webui-llm-wiki-maintenance to ingest new research findings into docs/.`
- `Use $codex-webui-llm-wiki-maintenance to promote this reusable repo explanation into a maintained note.`
- `Use $codex-webui-llm-wiki-maintenance to lint the wiki after a docs reorganization.`
