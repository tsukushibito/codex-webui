# Codex WebUI LLM wiki adoption note v0.1

Last updated: 2026-04-09

Source inspiration:

- Andrej Karpathy, "LLM Wiki"
  - <https://gist.githubusercontent.com/karpathy/442a6bf555914893e9891c11519de94f/raw/ac46de1ad27f92b28ac95459c782c07f6b8c964a/llm-wiki.md>

## 1. Purpose

This note defines the repo-local LLM Wiki scope and structure for `codex-webui`.

The source idea is a workflow where an LLM incrementally maintains a persistent markdown knowledge base instead of re-synthesizing knowledge from raw inputs on every query. For this repository, the LLM Wiki is not a separate product or a competing top-level knowledge base. It is a maintained markdown layer inside the existing repo documentation structure.

## 2. Current scope decision

The repo-local LLM Wiki covers the following maintained knowledge surfaces:

- source-of-truth documents under `docs/`
- maintained design-thinking notes that explain architecture, UX, or workflow reasoning before or beside formal specs
- maintained research memos that capture reusable investigation output, external references, and cross-source synthesis

The repo-local LLM Wiki does not include:

- `tasks/`, which remains the execution-package area for in-progress work only
- `artifacts/`, which remains the evidence/output area
- GitHub Issues and Projects, which remain the execution-tracking layer
- transient chat history that has not been promoted into maintained repo documents

## 3. Repository placement and boundaries

This repository already has a structure that partially matches the LLM Wiki pattern:

- raw sources: issue threads, PR reviews, local observations, external references, runtime behavior evidence, and implementation code
- maintained compiled knowledge: `docs/`
- execution slices: `tasks/`
- execution outputs and evidence: `artifacts/`
- schema and workflow rules: `AGENTS.md` and local `README.md` files

The boundary decision is:

- keep the repo-local LLM Wiki inside `docs/`
- keep formal source-of-truth documents in their existing category directories
- store non-normative but maintained design and research pages under `docs/notes/`
- keep cross-cutting wiki guidance and future entrypoints such as `index.md` and `log.md` directly under `docs/`

This keeps the wiki visible to the repo workflow while avoiding a competing tree beside `docs/`.

## 4. Page categories

Use these page categories for repo-local LLM Wiki content:

- `requirements/`: what to build
- `specs/`: how to build it
- `validation/`: validation plans, review points, design decisions, and confirmed behavior notes that directly support quality or correctness judgments
- `notes/`: maintained non-normative wiki pages such as design-thinking notes, research memos, and cross-source synthesis pages
- directly under `docs/`: cross-cutting guidance, repo-wide orientation, and future wiki entrypoints such as `index.md` and `log.md`

When a note becomes normative, promote or split the relevant parts into `requirements/`, `specs/`, or `validation/` instead of letting `notes/` become the hidden source of truth.

## 5. Naming and placement rules

For note-style wiki pages under `docs/notes/`:

- use filenames that stay explicit about subject and note type
- prefer `codex_webui_<topic>_<note_type>_v0_1.md`
- use `<note_type>` values such as `design_note`, `research_memo`, or `synthesis_note`
- keep one note focused on one reusable topic rather than combining unrelated investigations

Place a page under `docs/notes/` when it is maintained and reusable but not yet the authoritative contract or acceptance source.

Do not place the following under `docs/notes/`:

- active execution instructions that belong in `tasks/`
- raw evidence or logs that belong in `artifacts/`
- finalized API or requirement contracts that belong in `requirements/` or `specs/`

## 6. Deferred follow-up work

This note resolves only the scope and structure questions for issue `#115`.

The following remain follow-up work:

- issue `#116`: add the initial `index.md` and `log.md` entrypoints
- issue `#117`: define the minimum `ingest`, `query`, and `lint` workflow for repo agents

## 7. Operating intent

The operating intent is:

- capture reusable multi-source synthesis in maintained repo pages instead of losing it in chat history
- keep formal contracts in the established source-of-truth categories
- give design-thinking and research notes a stable maintained home without confusing them with execution packages or evidence storage

This note can be revised as `#116` and `#117` make the wiki entrypoints and operating workflow more concrete.
