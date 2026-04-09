# Codex WebUI LLM wiki adoption note v0.1

Last updated: 2026-04-09

Source inspiration:

- Andrej Karpathy, "LLM Wiki"
  - <https://gist.githubusercontent.com/karpathy/442a6bf555914893e9891c11519de94f/raw/ac46de1ad27f92b28ac95459c782c07f6b8c964a/llm-wiki.md>

## 1. Purpose

This note records how the "LLM wiki" pattern may apply to this repository without prematurely turning it into tracked implementation work.

The source idea is a workflow where an LLM incrementally maintains a persistent markdown knowledge base instead of re-synthesizing knowledge from raw inputs on every query. This note is a repo-specific interpretation of that idea, not a copy of the original proposal. For this repository, the immediate goal is not to introduce a separate wiki product inside the repo. The immediate goal is to clarify whether the same pattern helps maintain `docs/` as the compiled knowledge layer for ongoing product work.

## 2. Why this is not an Issue yet

At the current level, the idea is still an operating pattern, not a concrete repo change.

It does not yet define:

- a required directory addition
- a script or tool to build
- a document that must be split or migrated
- a validation flow that must be automated
- an owner, dependency, or delivery slice that belongs on the roadmap

Until one of those becomes concrete, creating an Issue would produce tracking overhead without a bounded implementation target.

## 3. Repo-specific interpretation

This repository already has a structure that partially matches the pattern:

- raw sources: issue threads, PR reviews, local observations, external references, runtime behavior evidence, and implementation code
- compiled knowledge: `docs/`
- execution slices: `tasks/`
- execution outputs and evidence: `artifacts/`
- schema and workflow rules: `AGENTS.md` and local `README.md` files

Because of that, the nearest useful interpretation is not "create a new wiki tree." The nearer fit is "use the existing `docs/` tree more deliberately as the maintained synthesis layer."

In other words:

- do not create a competing knowledge base beside `docs/`
- do not duplicate source facts that already belong in issues, tasks, or artifacts
- do use LLM assistance to consolidate repeated multi-source understanding back into maintained documents

## 4. Low-cost trial policy

For now, adopt the pattern only in a minimal form.

### 4.1 Ingest

When new source material materially changes project understanding, prefer updating an existing source-of-truth document or adding a small new note under `docs/` instead of leaving the synthesis only in chat history.

Examples:

- a clarified runtime behavior should become a validation note or specification update
- a repeated architectural explanation should become a maintained design note
- a recurring workflow decision should become README or AGENTS guidance in the correct area

### 4.2 Query

When answering questions that require reading across issues, specs, validation notes, and implementation context, treat the answer as potentially promotable to `docs/` if it will likely be needed again.

### 4.3 Lint

If repeated inconsistencies appear across `docs/`, `tasks/`, and `artifacts/`, treat that as evidence that a stronger maintenance workflow may be justified later. Until then, normal document hygiene is enough.

## 5. When this should become an Issue

Create an Issue only when the pattern turns into bounded repo work, such as:

- introducing a dedicated directory, index, or log for maintained synthesis
- adding scripts or tooling for ingest, search, or consistency checks
- standardizing a repeatable maintenance workflow that spans multiple docs
- restructuring existing source-of-truth documents to support incremental compilation
- assigning roadmap priority, ownership, and validation to that work

At that point, the Issue should describe the concrete delta, not the general idea.

## 6. Current decision

The current decision is:

- record the pattern as a lightweight repo note
- use it opportunistically when chat-derived synthesis clearly belongs in maintained docs
- avoid opening a tracking Issue until concrete implementation work exists

This note can be revisited if repeated manual synthesis becomes expensive enough to justify dedicated tooling or a more explicit wiki-like structure.
