# Issue #130 Validator Pre-Push Gate

## Purpose

- Refactor the repo workflow so `validator` no longer runs inside each bounded sprint and instead runs as a dedicated pre-push validation gate.

## Primary issue

- Issue: `#130` https://github.com/tsukushibito/codex-webui/issues/130

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `AGENTS.md`
- `.agents/skills/codex-webui-sprint-cycle/SKILL.md`
- `.agents/skills/codex-webui-execution-orchestrator/SKILL.md`
- `.agents/skills/codex-webui-work-packages/SKILL.md`
- `.codex/agents/evaluator.toml`
- `.codex/agents/validator.toml`

## Scope for this package

- remove `validator` from the default `codex-webui-sprint-cycle` loop
- define a dedicated pre-push validation handoff and route locally complete work through it before push-oriented steps
- tighten the evaluator and validator agent contracts for the new split
- align root workflow guidance and task-package lifecycle guidance with the new validator timing

## Exit criteria

- the sprint workflow no longer requires `validator` inside each sprint
- a pre-push validation path is defined in the repo workflow
- the affected skills and agent configs no longer conflict about validator timing
- package handoff notes capture any remaining follow-up needed before merge-oriented use

## Work plan

- update the sprint, orchestrator, and work-package skill docs to reflect the new validation boundary
- add the dedicated pre-push validation skill or equivalent handoff surface
- update evaluator and validator agent configs, including the validator model selection
- reconcile any root guidance that still describes validator as part of every sprint

## Artifacts / evidence

- Skill and config changes under `.agents/` and `.codex/`
- Validation evidence from focused config/doc consistency checks

## Status / handoff notes

- Status: `locally complete`
- Notes: Issue `#130` was moved to Project `In Progress` on 2026-04-09. Active worktree created from `origin/main` at `.worktrees/issue-130-validator-prepush-gate` with shared `.venv` and app `node_modules` symlinks. The bounded sprint completed with evaluator approval after updating the sprint, orchestrator, work-package, and agent contracts to move `validator` out of the default sprint loop and into the dedicated pre-push validation gate. The new pre-push validation gate was then exercised against the same worktree and passed using read-only consistency checks. Completion retrospective result: the new gate timing is now reflected in the maintained workflow guidance, but publish-oriented follow-through is still pending and parked Issue `#125` still has tracking/state to reconcile separately. Follow-up before Issue close: commit and publish this slice, keep the issue/project in execution until the work reaches `main`, and reconcile parked `#125` tracking in a later slice.

## Archive conditions

- Archive this package when the scoped workflow refactor is locally complete, the handoff notes are current, and the remaining merge-oriented work no longer needs the package to stay active.
