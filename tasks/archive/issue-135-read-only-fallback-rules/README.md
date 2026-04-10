# Issue #135 Read-Only Fallback Rules

## Purpose

- Execute the delegated-agent policy slice for Issue `#135` so orchestrator routing can classify read-only violations and unusable delegated results with explicit recovery rules.

## Primary issue

- Issue: `#135` https://github.com/tsukushibito/codex-webui/issues/135

## Source docs

- `artifacts/execution_orchestrator/README.md`
- `.agents/skills/codex-webui-orchestration-log/SKILL.md`
- `.agents/skills/codex-webui-execution-orchestrator/SKILL.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`

## Scope for this package

- tighten orchestrator guidance so delegated intake and evaluator prompts explicitly invoke the intended read-only role guidance
- document and enforce the fallback classes for missing, unusable, or policy-violating delegated results
- keep the slice focused on Issue `#135`; log sequence and terminal semantics already landed in sibling Issue `#134`

## Exit criteria

- delegated read-only prompts have explicit reusable guidance for intended role/skill invocation
- orchestration docs distinguish `continue`, `quarantine`, `hard_stop_recoverable`, and `hard_stop_terminal`
- fallback handling is based on observed side effects and verified drift, not delegated self-report
- orchestration logging guidance records violation class, remediation decision, and whether execution resumed or stopped

## Work plan

- inspect the current orchestrator, orchestration-log, and related workflow docs against the now-observed timeout and read-only drift patterns
- implement the minimum doc and helper updates needed to make delegated read-only fallback behavior explicit and reusable
- validate the new guidance against the existing issue-127 and issue-132 orchestration evidence without broadening into unrelated workflow changes

## Artifacts / evidence

- `.agents/skills/codex-webui-execution-orchestrator/SKILL.md`
- `.agents/skills/codex-webui-orchestration-log/SKILL.md`
- `.agents/skills/codex-webui-pre-push-validation/SKILL.md`
- `artifacts/execution_orchestrator/README.md`
- `artifacts/execution_orchestrator/runs/2026-04-09T14-30-02Z-issue-127-close/events.ndjson`
- `artifacts/execution_orchestrator/runs/2026-04-10T01-45-00Z-issue-132-close/events.ndjson`
- Sprint validation:
  - `git diff --check`
  - `rg -n "continue|quarantine|hard_stop_recoverable|hard_stop_terminal" .agents/skills/codex-webui-execution-orchestrator/SKILL.md .agents/skills/codex-webui-orchestration-log/SKILL.md artifacts/execution_orchestrator/README.md`
  - `rg -n "failed_agent_role|failure_kind|observed_side_effects|fallback_class|remediation|continued|quarantined|stopped" .agents/skills/codex-webui-orchestration-log/SKILL.md artifacts/execution_orchestrator/README.md`
  - `rg -n "expected diagnostic|evidence only|not judge approval|read-only" .agents/skills/codex-webui-pre-push-validation/SKILL.md`
  - `python .agents/skills/codex-webui-orchestration-log/scripts/summarize_run_log.py --events-path /workspace/artifacts/execution_orchestrator/runs/2026-04-09T14-30-02Z-issue-127-close/events.ndjson --anomalies`
  - `python .agents/skills/codex-webui-orchestration-log/scripts/summarize_run_log.py --events-path /workspace/artifacts/execution_orchestrator/runs/2026-04-10T01-45-00Z-issue-132-close/events.ndjson --anomalies`
- Dedicated pre-push validation:
  - Initial validator run reported `failed` because it treated expected pre-commit implementation diffs as a clean-worktree blocker.
  - Retry validator run reported `passed` after the prompt explicitly framed the expected dirty worktree as evidence, not a gate failure.
  - Retry evidence: commands above passed and `git status --short` showed only the expected implementation and package changes.

## Status / handoff notes

- Status: `locally complete; archived after pre-push validation`
- Notes: Created from `codex-webui-execution-orchestrator` routing for parent Issue `#132` after Issue `#134` reached `main`. The completed slice codifies read-only prompting and delegated fallback boundaries observed in the current orchestration run, without changing product code or reopening the log-semantics work from `#134`.
- Completion retrospective:
  - Completion boundary: package archive after evaluator approval and dedicated pre-push validation.
  - Contract check: Issue `#135` conditions are satisfied locally by reusable delegated-role prompt guidance, fallback class taxonomy, side-effect-based violation handling, hard-stop recovery rules, terminal handoff policy, and structured anomaly logging guidance.
  - What worked: the retry validator framing matched the new policy and cleanly distinguished expected implementation diffs from real blockers.
  - Workflow problems: the first validator run repeated the exact ambiguity this Issue fixes by treating expected dirty state as a gate failure.
  - Improvements to adopt: future validation prompts should predeclare expected diagnostics and expected status entries when the branch is intentionally pre-commit.
  - Skill candidates or skill updates: no new skill needed; this package updates the existing orchestrator, log, and pre-push validation skills.
  - Follow-up updates: merge this branch, sync `main`, remove the worktree, then let GitHub-side tracking close Issue `#135`.

## Archive conditions

- Archived after the delegated-role guidance and fallback policy updates were completed, focused validation was recorded, and the dedicated pre-push validation gate passed.
