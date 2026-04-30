# Codex WebUI LLM Wiki Index

Last updated: 2026-04-30

## Purpose

This file is the content-oriented entrypoint for the repo-local LLM Wiki.

Read this file first when you need to locate maintained knowledge across source-of-truth documents, design-thinking notes, research memos, or wiki guidance pages.

## Entry points

- [docs/README.md](./README.md): directory policy and category boundaries
- [docs/log.md](./log.md): chronological maintenance log for wiki updates
- [docs/codex_webui_llm_wiki_adoption_note_v0_1.md](./codex_webui_llm_wiki_adoption_note_v0_1.md): repo-local LLM Wiki scope, structure, placement rules, and adaptation notes

## Source-of-truth documents

- [docs/requirements/codex_webui_mvp_requirements_v0_9.md](./requirements/codex_webui_mvp_requirements_v0_9.md): current maintained MVP requirements
- [docs/specs/codex_webui_common_spec_v0_9.md](./specs/codex_webui_common_spec_v0_9.md): shared API and behavior rules
- [docs/specs/codex_webui_internal_api_v0_9.md](./specs/codex_webui_internal_api_v0_9.md): maintained internal API contract
- [docs/specs/codex_webui_public_api_v0_9.md](./specs/codex_webui_public_api_v0_9.md): maintained public API contract
- [docs/specs/codex_webui_shared_contract_strategy_v0_1.md](./specs/codex_webui_shared_contract_strategy_v0_1.md): maintained near-term decision for reducing runtime/BFF contract drift without root workspace, shared package, generator, or lockfile churn
- [docs/specs/codex_webui_ui_layout_spec_v0_9.md](./specs/codex_webui_ui_layout_spec_v0_9.md): maintained thread-first desktop/mobile UI layout and interaction structure
- [docs/validation/app_server_behavior_validation_plan_checklist.md](./validation/app_server_behavior_validation_plan_checklist.md): app-server behavior validation plan
- [docs/validation/codex_webui_ux_renewal_validation_gates_v0_1.md](./validation/codex_webui_ux_renewal_validation_gates_v0_1.md): maintained UX renewal browser, regression, desktop-inspection, and mobile-reachability validation gates

## Maintained note pages

- [docs/notes/README.md](./notes/README.md): note-page placement, naming, and promotion rules
- [docs/notes/codex_webui_agent_ui_benchmark_note_v0_1.md](./notes/codex_webui_agent_ui_benchmark_note_v0_1.md): structural benchmark note for agent and assistant UI families, mapping reusable interaction lessons to CodexWebUI v0.9 `thread_view`, timeline, Navigation, Detail Surface, request-flow, resume, and mobile responsibilities
- [docs/notes/codex_webui_current_ui_gap_analysis_note_v0_1.md](./notes/codex_webui_current_ui_gap_analysis_note_v0_1.md): maintained visual and implementation gap analysis for the current thread UI against the v0.9 target, including first-input flow, timeline noise, detail, composer, navigation, current activity, approval, mobile, visual-language, feedback, recovery, and artifact-extraction issues
- [docs/notes/codex_webui_github_projects_operations_synthesis_note_v0_1.md](./notes/codex_webui_github_projects_operations_synthesis_note_v0_1.md): reusable GitHub Issue and Project operation guidance, including sub-issue, `gh api`, and Project audit pitfalls seen in this repo
- [docs/notes/codex_webui_target_ui_design_note_v0_1.md](./notes/codex_webui_target_ui_design_note_v0_1.md): maintained decomposition of the current target desktop/mobile UI reference for the v0.9 UX refresh, including Navigation, Thread View, Detail Surface, and visual-direction cues
- [docs/notes/codex_webui_thread_view_information_architecture_note_v0_1.md](./notes/codex_webui_thread_view_information_architecture_note_v0_1.md): focused Thread View information-architecture note for making Timeline the primary desktop surface, defining visibility rules, moving status and metadata into lower-status/Details surfaces, simplifying Navigation thread cards, compacting the composer and header actions, supporting normal sidebar/minibar modes, and splitting follow-up work with acceptance criteria
- [docs/notes/codex_webui_timeline_contextual_request_and_expansion_note_v0_1.md](./notes/codex_webui_timeline_contextual_request_and_expansion_note_v0_1.md): focused Timeline and composer-adjacent note for keeping approval/request rows in causal context, preserving normal message readability, moving routine status near the composer, reducing redundant thread chrome, and using compact icon-first controls
- [docs/notes/codex_webui_ux_refresh_execution_order_synthesis_note_v0_1.md](./notes/codex_webui_ux_refresh_execution_order_synthesis_note_v0_1.md): recommended dependency order for the current UX refresh follow-up issues, mapping the reviewed plan to concrete execution sequencing

## Cross-cutting guidance

- [AGENTS.md](../AGENTS.md): repo-wide workflow rules, including wiki promotion and update triggers
- [docs/codex_webui_mvp_roadmap_v0_1.md](./codex_webui_mvp_roadmap_v0_1.md): phase breakdown and delivery order; for UX questions, treat it as sequencing guidance and use the v0.9 UI layout spec plus v0.9 requirements/specs as the current UX source of truth
- [docs/codex_webui_dev_container_onboarding.md](./codex_webui_dev_container_onboarding.md): development container, Tailscale sidecar, Tailscale Serve, and tunnel workflow
- [docs/codex_webui_tailscale_browser_check.md](./codex_webui_tailscale_browser_check.md): usage guide for the separate Tailscale sidecar plus noVNC browser verification compose stack
- [docs/README.md](./README.md): wiki maintenance workflow and category-specific placement rules

## Update expectations

- update this file when maintained navigation, discoverability, or content summaries materially change
- keep the descriptions short and content-oriented
- prefer adding links here instead of relying on ad hoc chat-only orientation
