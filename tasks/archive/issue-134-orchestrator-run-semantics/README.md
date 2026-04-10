# Issue #134 Orchestrator Run Semantics

## Purpose

- Execute the log-semantics hardening slice for Issue `#134` so orchestration runs remain append-only, replayable, and machine-checkable across terminal and resumed boundaries.

## Primary issue

- Issue: `#134` https://github.com/tsukushibito/codex-webui/issues/134

## Source docs

- `artifacts/execution_orchestrator/README.md`
- `.agents/skills/codex-webui-orchestration-log/SKILL.md`
- `.agents/skills/codex-webui-execution-orchestrator/SKILL.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`

## Scope for this package

- harden `.agents/skills/codex-webui-orchestration-log/scripts/append_run_event.py` so event sequencing stays unambiguous during append and resume flows
- tighten terminal and resume semantics in the orchestration log guidance and any read-only helpers that check or summarize runs
- keep the slice focused on Issue `#134`; delegated-role prompting and fallback classification remain with sibling Issue `#135`

## Exit criteria

- event append no longer permits duplicated sequence ambiguity within one run log
- terminal events and resumed-pass boundaries are documented in a machine-checkable way
- consistency checks fail fast when a run violates the documented terminal or resume contract
- the reference issue-127 run either becomes representable under the clarified rules or is flagged immediately by the checker

## Work plan

- inspect the current append helper, log checker, and run artifacts to isolate the sequence and terminal-state failure modes
- implement the minimum helper changes needed to make append/resume semantics explicit and detectable
- update the orchestration-log and execution-orchestrator guidance so the emitted events match the helper behavior
- run focused validation against the existing issue-127 run artifact and the active issue-132 closeability run

## Artifacts / evidence

- `.agents/skills/codex-webui-orchestration-log/scripts/append_run_event.py`
- `.agents/skills/codex-webui-orchestration-log/scripts/summarize_run_log.py`
- `artifacts/execution_orchestrator/README.md`
- `artifacts/execution_orchestrator/runs/2026-04-09T14-30-02Z-issue-127-close/events.ndjson`
- `artifacts/execution_orchestrator/runs/2026-04-10T01-45-00Z-issue-132-close/events.ndjson`
- Local validation on 2026-04-10:
  - `python -m py_compile .agents/skills/codex-webui-orchestration-log/scripts/append_run_event.py .agents/skills/codex-webui-orchestration-log/scripts/summarize_run_log.py` passed
  - concurrency and transition-guard temp-root harness passed with strictly increasing `sequence` values and expected terminal/resume rejections
  - `python .agents/skills/codex-webui-orchestration-log/scripts/summarize_run_log.py --events-path /workspace/artifacts/execution_orchestrator/runs/2026-04-09T14-30-02Z-issue-127-close/events.ndjson --check` passed with expected `run_resumed boundary violation` findings
  - `python .agents/skills/codex-webui-orchestration-log/scripts/summarize_run_log.py --events-path /workspace/artifacts/execution_orchestrator/runs/2026-04-10T01-45-00Z-issue-132-close/events.ndjson --check` passed with the expected in-progress findings and no false `run_resumed` boundary hit
- Pre-push validation gate on 2026-04-10:
  - dedicated validator gate passed after rerunning the checker commands with explicit expected-output assertions
  - `git diff --check` passed

## Status / handoff notes

- Status: `locally complete; archived after pre-push validation`
- Notes: Created from `codex-webui-execution-orchestrator` routing for parent Issue `#132` after Issue `#133` merged to `main`. This slice hardened append-time sequence allocation with file locking, enforced terminal/resume segment boundaries, and extended the read-only checker to diagnose `run_resumed` boundary violations in historical run logs.
- Completion retrospective: Package archive boundary only. Contract check for Issue `#134` is satisfied at the local slice level by the helper changes, the documented run-segment contract, the focused checker behavior, evaluator approval, and the dedicated pre-push validation pass. What worked: the bounded slice stayed within the logger helper and docs write scope. Workflow problems: delegated intake timed out repeatedly, and the first validator pass treated expected diagnostic findings as failures because the commands did not assert expected output. Improvements to adopt: validator prompts for diagnostic checkers should encode expected findings explicitly, and the repeated delegated-agent timeout pattern remains a follow-up input for sibling Issue `#135`. Follow-up updates: publish the branch, merge to `main`, clean up the worktree, and then close Issue `#134`.

## Archive conditions

- Archive this package when the helper and doc changes are complete, focused validation is recorded, and the package handoff notes are updated after the dedicated pre-push validation gate passes.
