# Metadata

- case_name: `p3-stop-during-running`
- observed_in_tasks_phase: `phase_3`
- run_key: `2026-04-01T14-31-32.293678Z-r01`
- executed_at_utc: `2026-04-01T14:31:32.289898Z`
- session_key: `sk-20260401-terminal-01`
- app_server_version: `unknown`
  source: この run では app-server 固有 version source を別保存していない。`result.thread.cliVersion` は CLI version のため採用しない。
- runtime_version: `codex-cli 0.118.0`
  source: `codex --version` と `responses/response-0001.json` の `result.thread.cliVersion`
- case_description: `approvalPolicy = never` で thread を作成し、長めの command execution が started した直後に `turn/interrupt` を送り、running / stop 後の `thread/read` を比較するケース。
- input_summary: text input 1 件。内容は `Use a shell command to run \`sleep 10; printf 'done\\n'\`, then answer with exactly one short sentence containing the word done.`
- thread_id: `019d4974-eb2b-7f70-b7ef-08c9f78d0540`
- request_id: `none observed`
- operator_notes: stream では `thread/status/changed` が `active[] -> idle` と遷移した。`item/started` で `commandExecution` item が `status = inProgress` になった直後に `requests/request-0004.json` の `turn/interrupt` を送った。`responses/response-0004.json` の interrupt response は空で、resolved 後は `turn/completed` が `status = interrupted`、final `thread/read` / `history/history-0005.json` には final `agentMessage` も `commandExecution` item も無いまま `idle` と interrupted turn だけが残った。approval 系と違って `waitingOnApproval` も `serverRequest/resolved` も出ていない。
