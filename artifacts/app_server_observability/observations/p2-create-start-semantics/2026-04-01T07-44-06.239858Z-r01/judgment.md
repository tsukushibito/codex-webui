# 判定メモ

## Case Info

- case_name: `p2-create-start-semantics`
- observed_in_tasks_phase: `phase_2`
- run_key: `2026-04-01T07-44-06.239858Z-r01`
- executed_at_utc: `2026-04-01T07:44:06.239858Z`
- session_key: `sk-20260401-baseline-01`
- app_server_version: `0.117.0`
- runtime_version: `codex-cli 0.117.0`
- thread_id: `019d4800-6e58-7fe1-991b-b333453f8b47`
- request_id: `unknown`
- compared_artifacts: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`, `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`, `stream/events.ndjson`, `history/history-0003.json`
- summary: `thread/start` だけで `idle` thread を作成できた。first user message 前は `includeTurns=true` の readback が unavailable で、thread はまだ materialized されていなかった。`includeTurns=false` なら `idle` / `turns=[]` の thread として再取得できた。

## Judgments

### `session create / start` の基本 semantics

- 判定: 保留だが先行可
- 根拠: `responses/response-0001.json` で `thread/start` 直後に `status.type = idle`, `turns = []` の thread が返り、`responses/response-0003.json` でも同じ thread を `idle` / `turns = []` で再取得できた。
- 補足: 現在の native surface では、thread 作成だけで idle container を得られる。一方、input 無しで turn を開始する独立 primitive は今回の観測では見えない。
- 保留時のデフォルト判断: native `thread/start` は create 相当として扱い、公開上の `session start` は App-owned façade action 候補として進める。

### `created`

- 判定: 保留だが先行可
- 根拠: first user message 前の thread は `idle` で存在し、かつ `includeTurns=true` の履歴取得が unavailable だったため、turn/materialization 前の段階が native に存在する。
- 補足: native status 自体は `idle` なので、App の `created` は native status の写像ではなく app-owned projection になる。
- 保留時のデフォルト判断: app 側では `thread/start` 成功直後から first user message 前までを `created` として安全に持てる候補とする。

### `session_id`

- 判定: 保留だが先行可
- 根拠: create 直後の `thread_id` は `thread/start` response と `thread/read` readback で一致した。
- 補足: follow-up case と合わせると `session_id = native thread ID` 候補は強い。
- 保留時のデフォルト判断: `session_id = native thread ID` 候補として維持する。

### `running`

- 判定: 保留だが先行可
- 根拠: input を送らないこのケースでは `thread/status/changed` with `active` は一度も出なかった。
- 補足: active 化は turn 開始に結び付いている可能性が高い。
- 保留時のデフォルト判断: input 無し create 直後は `running` ではなく、通常系で観測した `active` を `running` 候補として扱う。

### `waiting_input`

- 判定: 保留だが先行可
- 根拠: create 直後から `status.type = idle` で安定しており、turn を開始していない状態でも idle が成立した。
- 補足: この `idle` を `waiting_input` と完全同一視するか、App 上 `created` と分離するかは app-owned projection の設計判断になる。
- 保留時のデフォルト判断: native `idle` は create 直後にも現れるため、公開上は `created` と `waiting_input` を分け、native `idle` だけでは区別しない。

### `session.status_changed`

- 判定: 保留だが先行可
- 根拠: このケースでは `thread/started` は見えたが `thread/status/changed` は出なかった。status 変化が無ければ通知されない挙動に見える。
- 補足: 通常 turn ケースで観測した `thread/status/changed` は turn 実行時の状態遷移通知として解釈できる。
- 保留時のデフォルト判断: `thread/status/changed` は state transition がある場合の native 候補とし、create 直後の初期確立は `thread/started` と response を併用して扱う。

## Open Questions

- 未観測事項: assistant message が出ない turn、input 無しでの native turn 開始 primitive、item/event timestamp、native `event_id`。
- 後続フェーズで再観測する case: `p2-no-assistant-message`

## Cross References

- metadata: `metadata.md`
- ids: `ids.md`
- requests: `requests/request-0001.json`, `requests/request-0002.json`, `requests/request-0003.json`
- responses: `responses/response-0001.json`, `responses/response-0002.json`, `responses/response-0003.json`
- stream: `stream/events.ndjson`
- history: `history/history-0003.json`
