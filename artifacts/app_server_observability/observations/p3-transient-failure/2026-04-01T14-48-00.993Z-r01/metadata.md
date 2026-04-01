# Metadata

- case_name: `p3-transient-failure`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-48-00.993Z-r01`
- executed_at_utc: `2026-04-01T14:48:00.993Z`
- session_key: `sk-20260401-terminal-02`
- app_server_version: `unknown`
  source: この run では app-server 固有 version source を別保存していない。`result.thread.cliVersion` は CLI version のため採用しない。
- runtime_version: `codex-cli 0.118.0`
  source: `codex --version` と `responses/response-0001.json` の `result.thread.cliVersion`
- case_description: `approvalPolicy = never` で thread を作成し、non-zero exit の shell command を 1 回だけ実行させ、command execution failure が transient failure として処理されるかを観測するケース。
- input_summary: text input 1 件。内容は `Use a shell command to run \`printf 'boom\\n' >&2; exit 42\`, do not retry, and if it fails answer with exactly one short sentence that includes the text exit 42.`
- thread_id: `019d4984-0160-71f3-a4cb-764a7e596a5a`
- request_id: `none observed`
- operator_notes: stream では `thread/status/changed` が `active[] -> idle` と遷移した。`item/completed` で `commandExecution.status = failed` と `exitCode = 42` を観測したが、続いて final `agentMessage` が生成され、`turn/completed` は `status = completed`、final `thread/read` / `history/history-0004.json` でも thread は `idle` だった。history には failed `commandExecution` item も turn error も materialize されず、残ったのは commentary / final `agentMessage` と `turn.status = completed` だけだった。
