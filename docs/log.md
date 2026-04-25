# Codex WebUI LLM Wiki Log

Last updated: 2026-04-25

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

## [2026-04-25] ingest | target UI reference and UX refresh execution order

Source:

- user-provided chat attachment from 2026-04-25 used as the current visual target UI reference
- `.tmp/codex_webui_v0_9_ux_improvement_plan.md`
- GitHub parent issue `#175`
- GitHub follow-up issues `#198` through `#203`

Updated:

- `docs/notes/codex_webui_target_ui_design_note_v0_1.md`
- `docs/notes/codex_webui_ux_refresh_execution_order_synthesis_note_v0_1.md`
- `docs/index.md`
- `docs/log.md`

Notes:

- added a maintained design note that decomposes the current target desktop/mobile UI reference into Navigation, Thread View, Detail Surface, mobile reachability, and visual-direction expectations
- recorded the current reviewed execution order for the UX refresh follow-up line so implementation can proceed in the same dependency order as the reviewed plan and GitHub Project setup
- kept the note pages non-normative and pointed behavior ownership back to maintained requirements and specs

## [2026-04-24] ingest | Issue #186 UX renewal validation gates

Source:

- approved sprint slice for Issue #186
- `tasks/issue-186-validation-gates/README.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/e2e/chat-flow.spec.ts`
- `apps/frontend-bff/e2e/approval-flow.spec.ts`
- `apps/frontend-bff/tests/chat-page-client.test.tsx`
- `apps/frontend-bff/tests/home-page-client.test.tsx`

Updated:

- `docs/validation/codex_webui_ux_renewal_validation_gates_v0_1.md`
- `docs/index.md`
- `docs/log.md`
- `tasks/issue-186-validation-gates/README.md`

Notes:

- added a maintained validation source for UX renewal E2E gates, UX regression gates, desktop visual inspection expectations, mobile reachability checks, and a gate-to-evidence coverage map
- kept roadmap, requirements, and UI/spec documents as the normative source instead of duplicating behavior contracts into the validation page
- linked the maintained validation page into wiki navigation so later sessions can find the current browser and inspection gates directly

## [2026-04-23] ingest | Issue #180 contract audit

Source:

- approved sprint slice for Issue #180
- `tasks/issue-180-contract-audit/README.md`
- v0.9 public, internal, and common API specs

Updated:

- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/log.md`
- `tasks/issue-180-contract-audit/README.md`

Notes:

- tightened maintained contracts for thread Navigation cue material, `thread_view` helper shape, request-helper identity and confirmation fields, pending-request absence semantics, ordering and REST reacquisition triggers, first-input idempotency, and public absorption of internal open-required handling
- preserved approval as thread-scoped request flow and did not add standalone canonical approval resources or a required global approval inbox

## [2026-04-23] ingest | Issue #179 desktop state specification

Source:

- planner-approved docs-only sprint for Issue #179
- `tasks/issue-179-desktop-state-spec/README.md`
- Issue #179 body and comments inspected read-only for a desktop layout image asset or attachment
- parent-checkout draft `.tmp/CodexWebUI_UX重視_作業計画書_v0_1.md`, which mentions `codexwebui_approval_interface_screenshot.png` as a filename but does not provide a maintained or normative image asset
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`
- `docs/notes/codex_webui_agent_ui_benchmark_note_v0_1.md`

Updated:

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/log.md`
- `tasks/issue-179-desktop-state-spec/README.md`

Notes:

- added implementation-ready desktop region ownership rules for Navigation, Thread View, and Detail Surface while preserving the thread-first v0.9 model
- added a desktop state matrix for waiting on input, in progress, waiting on approval, system error / failed turn, `notLoaded`, and open-required recovery
- kept approval as thread-scoped request flow, kept resume and blocked cues as derived display cues, and explicitly rejected old Home / Chat / Approval primary page separation
- no maintained desktop layout image asset was found in the repo or Issue #179; the only local draft reference found is the `.tmp` filename mention, which is not itself a maintained or normative asset
- mobile behavior remains deferred to the existing v0.9 mobile reachability rules

## [2026-04-23] ingest | Agent UI benchmark note

Source:

- planner-approved docs-only sprint for Issue #178
- `tasks/issue-178-benchmark-agent-uis/README.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- primary public product documentation for reference UI families, used only for structural orientation

Updated:

- `docs/notes/codex_webui_agent_ui_benchmark_note_v0_1.md`
- `docs/index.md`
- `docs/log.md`

Notes:

- added a maintained benchmark note comparing CLI/TUI, assistant, IDE assistant, and autonomous agent/task-runner UI families across main pane, navigation, status, approval/risk, detail, composer, and background-task cues
- mapped adopt and do-not-adopt patterns back to CodexWebUI v0.9 `thread_view`, `timeline`, request flow, Navigation, Detail Surface, resume/blocked cues, current activity, single composer, and mobile reachability
- explicitly constrained the benchmark to structural and interaction lessons, rejecting visual copying, visual mimicry, standalone approval inbox dependency, Home as primary UX dependency, independent WebUI-owned conversation/approval state, and automatic detail opening on events

## [2026-04-23] lint | UX renewal source-of-truth alignment

Source:

- planner-approved docs-only sprint for Issue #176
- `.tmp/CodexWebUI_UX重視_作業計画書_v0_1.md` as a working input only, not a normative source
- review of remaining Home / Chat / Approval roadmap ambiguity against the maintained v0.9 UI layout direction

Updated:

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/index.md`
- `docs/log.md`

Notes:

- clarified that roadmap UX wording is sequencing guidance and that the v0.9 UI layout spec plus v0.9 requirements/specs govern the current thread-first UX model
- retired Home as an active primary Phase 4B UI target by moving former Home responsibilities into navigation, workspace switching, thread lists, resume cues, and empty states
- clarified that `home_overview` and `GET /api/v1/home` are helper aggregates for app-shell initialization, not canonical UI screen contracts

## [2026-04-21] operational pitfall | Vulkan SDK generic download and extraction validation

Source:

- `docker compose build` failure against LunarG's version-embedded Linux Vulkan SDK tarball URL
- LunarG Vulkan SDK Version Query and Download API
- `Dockerfile`
- `docker-compose.yml`

Updated:

- `Dockerfile`
- `docker-compose.yml`
- `docs/codex_webui_dev_container_onboarding.md`
- `docs/log.md`

Notes:

- switched the Vulkan SDK download path to LunarG's generic `vulkan_sdk.tar.xz` API file name
- kept `VULKAN_SDK_VERSION` as the requested version and as the expected extracted directory version, with compose and doctor defaults aligned
- documented why the Dockerfile must fail if the extracted SDK directory does not match the compose-provided expected version

## [2026-04-20] lint | requirements alignment for v0.9 UI layout spec

Source:

- follow-up review of `docs/requirements/codex_webui_mvp_requirements_v0_9.md` after adding `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`

Updated:

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/log.md`

Notes:

- clarified that `resume cue` and `blocked cue` do not require standalone UI modules and may be expressed through badges, filters, sort priority, workspace summaries, and notifications
- aligned navigation requirements with the maintained UI layout direction by centering navigation on the current-workspace thread list and on-demand workspace switching rather than a permanently expanded workspace tree
- kept approval handling thread-scoped and preserved lightweight cross-workspace discovery as the requirement, rather than a dedicated approval inbox or blocked-thread panel

## [2026-04-20] ingest | v0.9 UI layout specification

Source:

- user request to turn `.tmp/CodexWebUI_UIレイアウト案_v0_9_改訂版_レビュー反映.md` into a maintained UI layout document
- `.tmp/CodexWebUI_UIレイアウト案_v0_9_改訂版_レビュー反映.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`

Updated:

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/index.md`
- `docs/log.md`

Notes:

- promoted the reviewed UI layout proposal into a maintained v0.9 specification aligned with the native-first and thin-facade direction
- fixed the thread-first layout model across desktop and mobile, including workspace switcher behavior, timeline-first thread view, thread-scoped approval handling, and selection-driven detail surfaces
- left canonical sort semantics and approval recovery-window guarantees explicitly deferred to requirements or API specifications rather than defining them only in the layout document

## [2026-04-19] restructure | launcher ngrok interaction flow

Source:

- user request to add an interactive ngrok decision flow to `scripts/start-codex-webui.sh`
- `scripts/start-codex-webui.sh`
- `docs/codex_webui_dev_container_onboarding.md`

Updated:

- `scripts/start-codex-webui.sh`
- `docs/codex_webui_dev_container_onboarding.md`
- `docs/log.md`

Notes:

- added launcher support for `--interactive` and `--with-ngrok` so one flow can decide whether ngrok should start for the session
- documented that the launcher can now collect ngrok Basic Auth and extra arguments before startup instead of requiring a separate manual tunnel command every time
- kept the local-only launcher path available for runs that should not expose a remote browser entrypoint

## [2026-04-13] restructure | Issue #152 ngrok doc sync

Source:

- planner-approved docs-only sprint for Issue #152
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/codex_webui_dev_container_onboarding.md`

Updated:

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/codex_webui_dev_container_onboarding.md`
- `docs/log.md`

Notes:

- synchronized the maintained supported-browser path to ngrok and recorded ngrok Basic Auth as the access-control boundary
- rewrote the onboarding flow to describe ngrok-based remote browser verification instead of Dev Tunnel
- deferred code, task-state, and roadmap updates to later implementation work

## [2026-04-13] query | GitHub intake command pitfalls for Project audits

Source:

- repeated `gh` retries while auditing Issue `#151` and Project `#9`
- `gh issue view 151 --repo tsukushibito/codex-webui`
- `gh project item-list 9 --owner tsukushibito --format json`

Updated:

- `.agents/skills/codex-webui-work-intake/SKILL.md`
- `docs/notes/codex_webui_github_projects_operations_synthesis_note_v0_1.md`
- `docs/log.md`

Notes:

- recorded that plain `gh issue view` can fail through the deprecated `repository.issue.projectCards` path even when ProjectV2 access is healthy
- tightened the work-intake skill to use `gh project item-list --limit 100` during Project audits so large Projects are not misread as missing items
- documented `gh issue view --json` and `gh api` as the safer fallback path for structured Issue reads during intake

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
