# Agent UI benchmark note v0.1

Last updated: 2026-04-23

## Purpose

Capture reusable structural and interaction lessons from reference agent and assistant UI families for the CodexWebUI UX renewal work.

This is a maintained research/design note. It is not raw evidence, an implementation plan, or a normative replacement for:

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`

## Anti-mimicry boundary

This benchmark is for structural and interaction lessons only. CodexWebUI must not copy visual style, branding, layouts, iconography, animation language, naming, color, typography, or proprietary product identity from reference products.

In this note, "adopt" means "translate the interaction responsibility into CodexWebUI-native v0.9 concepts." It does not mean visual copying or visual mimicry.

## Reference families

The benchmark uses public product documentation sparingly to orient broad UI families. Public UIs change frequently, so this note intentionally avoids pixel-level claims.

Sources consulted:

- OpenAI Codex CLI repository and documentation: <https://github.com/openai/codex>
- OpenAI ChatGPT Projects and Canvas help pages: <https://help.openai.com/en/articles/10169521-chatgpt-projects> and <https://help.openai.com/en/articles/9930697-what-is-the-canvas-feature-in-chatgpt-and-how-do-i-use-i>
- Anthropic Claude Code security and Claude artifacts help pages: <https://docs.anthropic.com/en/docs/claude-code/security> and <https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them>
- Visual Studio Code Copilot chat and inline chat documentation: <https://code.visualstudio.com/docs/copilot/chat/overview> and <https://code.visualstudio.com/docs/copilot/chat/inline-chat>
- GitHub Copilot coding agent documentation: <https://docs.github.com/en/copilot/concepts/coding-agent/about-copilot-coding-agent> and <https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/track-copilot-sessions>
- Devin documentation: <https://docs.devin.ai/>

## Comparison matrix

| Family | Category | Main pane | Navigation | Activity/status visibility | Approval/risky-action handling | Detail surfaces | Composer behavior | Background task cues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Terminal coding agents such as Codex CLI and Claude Code | CLI/TUI | Linear transcript with command/tool events and assistant messages in one focused terminal surface. | Workspace is implicit in the current directory; session commands and history provide lightweight navigation. | Current command, tool use, stream progress, and permission prompts are close to the transcript. | Risk is handled by explicit permission prompts, approval policies, sandbox modes, or allow rules before file edits, commands, or other privileged actions. | Detail is usually inline, expandable, or command-addressable rather than a persistent inspector. | One prompt line is the dominant input path; slash commands are modifiers, not separate conversation surfaces. | Background awareness is limited to terminal output, logs, status commands, shell notifications, or task completion signals. |
| General assistant chats such as ChatGPT and Claude | Assistant | Conversation thread is the main pane; generated artifacts or canvases may appear beside it for larger created content. | Sidebar/history/project lists organize chats and project context rather than execution state. | Tool use and generation state appear in the conversation or near the assistant response. | Risky external actions are usually constrained by tool confirmation, sandbox, admin policy, or limited tool availability. | Canvas/artifact style side panes support focused editing or inspection while the chat remains present. | Composer is a single primary input with attachments/tools invoked from the same input area. | Background work is usually communicated through response progress, project/chat history, or notifications, not a separate operational queue. |
| IDE assistant chat and inline edit surfaces such as VS Code Copilot | IDE assistant | Chat view, inline chat, and editor diff previews are tied to source files and current selection. | IDE activity bar, file explorer, source control, chat sessions, and editor tabs carry navigation. | Status is shown near the edit target, chat session, terminal, or source-control surface. | Code changes are reviewed through diffs, Keep/Undo controls, command insertion, terminal run decisions, and workspace trust/security rules. | Editor diff, inline chat, terminal inline chat, and artifacts panels provide detail without making chat the only view. | Composer scope can be active file, selected code, terminal, or full chat session; the UI must make scope visible. | Background cues arrive through IDE notifications, task/job lists, source-control changes, and session state. |
| Cloud coding agents such as GitHub Copilot coding agent | Autonomous agent/task-runner | Pull request, issue, or session-log view becomes the main review surface after delegation. | Repository, PR list, agents panel/tab, IDE integrations, CLI commands, and mobile task lists provide return paths. | Session logs, PR checks, draft status, commits, and review requests expose progress. | Risk is managed through branch protection, required reviews/checks, draft PR review, workflow approval boundaries, and inability to self-approve or merge. | Session logs, PR diffs, check logs, and commit traces are the primary detail surfaces. | Task starts from issue/PR/chat delegation; later steering can occur through comments, review, or session controls. | Background progress is surfaced through agent session status, notifications, PR updates, check states, and logs. |
| Web autonomous software-engineer UIs such as Devin | Autonomous agent/task-runner | Task/session workspace combines conversation, plan/progress, environment state, code/IDE, browser, and results. | Dashboard/session list and repository/workspace selectors organize delegated work. | Progress, plans, terminal/browser actions, test outcomes, and completion states remain visible during long-running work. | Risk is handled through permission models, user takeover, review gates, repository controls, and explicit deployment or integration boundaries. | IDE/browser/terminal/log panes act as task detail surfaces for inspecting what the agent did. | Composer/delegation input starts or steers a task; follow-up input is task-scoped. | Long-running status, session titles, notifications, and task list states help the user return later. |
| Browser assistant agent modes and deep-research style tasks | Assistant / autonomous task-runner | The main pane remains a conversational report or task thread, with structured progress and final synthesis. | Chat/project history and task-specific entries provide return navigation. | Step progress, source gathering, tool use, and final status are summarized in the thread. | Risky external actions are usually bounded by confirmation or product-level restrictions, with external communications and side effects treated cautiously. | Source lists, intermediate summaries, generated files, or report panes become details behind the thread. | The same composer starts the request and usually receives follow-up instructions in the same thread. | Background task completion is communicated through task state, notification, or a resumable chat entry. |

## Cross-family lessons

The strongest shared pattern is not a specific layout. It is continuity: the user should keep one recognizable task/thread context while inspecting details, responding to risk, and returning after work continues in the background.

Useful structural lessons:

- Main work belongs in one primary pane. CLI/TUI tools, assistant chats, IDE assistants, and cloud agents all keep the task narrative close to the action surface.
- Navigation should optimize return, not taxonomy. Product families differ, but useful navigation quickly answers "what needs me now?" and "where was I working?"
- Activity/status must be visible before detail. Users need a short current state before opening logs, diffs, artifacts, or session details.
- Risk handling works best at the point of consequence. Approval prompts, diffs, review gates, and branch protections are understandable because they sit near the operation they govern.
- Detail surfaces help when they preserve context. Canvas, artifacts, logs, diffs, terminal output, and browser/IDE panes are useful when they avoid replacing the task narrative.
- A single dominant composer reduces confusion. Scope modifiers, attachments, slash commands, and steering controls are helpful only when they remain subordinate to one clear input path.
- Background task cues should be lightweight but actionable. Notifications, badges, session status, PR checks, and task rows should guide the user back to the right task without stealing focus.

## CodexWebUI synthesis

### Adopt as CodexWebUI-native patterns

- Use `thread_view` as the primary work surface. The benchmark supports the v0.9 requirement that the user observes, intervenes in, and continues one thread from one main screen.
- Keep `timeline` as the main body. Translate CLI transcripts, assistant conversations, session logs, command events, file changes, approval requests, approval resolutions, and errors into thread-scoped chronology instead of splitting chat and activity into separate primary screens.
- Treat approval as thread-scoped request flow. Borrow the placement principle of permission prompts and review gates, but implement it through CodexWebUI `request flow` tied to thread / turn / item, not through a standalone approval resource.
- Put immediate state in current activity. Use a pinned current activity summary for running, waiting for approval, waiting for input, error present, latest turn failed, or similar native-derived state.
- Make Navigation a return surface. Navigation should expose current workspace, thread list, badges, filters, resume cues, blocked cues, and priority-aware ordering so users can return to high-priority threads without a global approval inbox.
- Keep Detail Surface secondary and selection-driven. Request detail, error detail, diff summaries, command output, selected timeline item detail, and supporting references should open only after user selection.
- Preserve a single composer. `thread_view` owns one normal composer path for workspace-scoped first input and selected-thread continuation. Request-response controls and interrupt controls can sit nearby, but they are not competing composers.
- Surface background work through lightweight cues. Background high-priority changes should update badges, current activity summaries, filters, workspace summaries, banners, toasts, or notifications so resume and blocked states are discoverable.
- Design mobile reachability from the same IA. Smartphone UI should degrade to a single-column `thread_view` with Navigation and Detail Surface reachable through drawers, sheets, overlays, or full-screen detail while preserving approval response, interrupt, composer, and return-to-thread paths.

### Do not adopt

- Do not adopt standalone approval inbox dependency. Cross-workspace discovery is allowed, but approval remains request flow inside thread context.
- Do not adopt Home as primary UX dependency. Workspace selection, thread discovery, high-priority return, empty states, and first-input start must be explainable through Navigation, `thread_view`, Detail Surface, notifications, and empty states.
- Do not adopt independent WebUI-owned conversation or approval state. WebUI must not create a conversation lifecycle engine, canonical approval resource, or independent task state that competes with App Server-native thread / turn / item / request flow.
- Do not adopt automatic detail opening on events. Approval, error, reconnect, and background-priority events may update notifications or badges, but Detail Surface opens by user selection.
- Do not adopt visual mimicry. No reference visual style, branding, icon set, color system, typography, layout composition, product name, or proprietary identity should be copied.
- Do not adopt a permanently expanded workspace tree as the default information architecture. Workspace is operational context; Navigation is centered on current-workspace thread discovery and return flow.
- Do not adopt multiple competing composers. A separate "approval composer," "chat composer," and "task composer" for the same thread would weaken the v0.9 single-composer rule.
- Do not adopt desktop-only multi-pane assumptions. Mobile and smartphone reachability are acceptance requirements, not polish.

## Mapping to v0.9 responsibilities

| CodexWebUI v0.9 concept | Benchmark input | Required translation |
| --- | --- | --- |
| `thread_view` | CLI transcript, assistant chat, PR/session review, task workspace | One primary monitoring / intervention / continuation surface for the selected thread. |
| `timeline` | Terminal logs, assistant messages, agent session logs, IDE diffs/checks | Thread-scoped chronological main body with user messages, assistant messages, request flow, command/tool/file-change summaries, errors, and status changes when available. |
| `request flow` | Permission prompts, code-review gates, command confirmations, sandbox boundaries | Pending approval summary and response controls inside thread context, backed by App Server request flow. |
| `Navigation` | Chat history, project lists, IDE sidebars, agents panels, task dashboards | Current-workspace thread discovery plus resume cues, blocked cues, badges, filters, priority-aware sort, and workspace switcher summaries. |
| `Detail Surface` | Canvas, artifacts, editor diff, PR diff, session logs, terminal/browser panes | Secondary selected-item inspection that preserves thread context and does not open automatically on events. |
| Current activity | CLI command status, IDE task status, agent session status, PR checks | Native-derived pinned summary of what the selected thread is doing now. |
| Resume / blocked cues | Agent task lists, notifications, PR states, chat history status | Lightweight return signals derived from native facts, not independent canonical state. |
| Single composer | Terminal prompt, chat input, IDE inline/chat input, task steering box | One normal input path for first-input thread start and selected-thread continuation, with scoped controls nearby. |
| Mobile / smartphone reachability | Mobile chat/task lists and condensed agent status | Single-column thread-first flow with reachable Navigation, approval response, interrupt, Detail Surface return, and reconnect resume within v0.9 constraints. |

## Design implications for later UI work

- Start screen-level UX review from `thread_view`, not Home.
- Evaluate every benchmark-inspired idea by asking which v0.9 responsibility owns it: Navigation, `thread_view`, `timeline`, current activity, request flow, Detail Surface, notification, or composer.
- Prefer compact status and return cues over new primary screens.
- Keep details inspectable but not intrusive.
- Use public references only to validate structural patterns; avoid visual copying even when a reference UI appears effective.
