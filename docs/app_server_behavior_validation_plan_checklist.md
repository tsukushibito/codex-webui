# app-server 挙動確認実行計画（修正版）

## 1. 目的

`codex app-server` の実挙動を観測し、次を確定する。

- どの native ID をそのまま採用できるか
- どの native signal / event を internal/public event に対応付けられるか
- `session create` と `session start` を実装上どう分離すべきか
- `running -> waiting_input` を何で判定するか
- approval の pending / resolved を何で判定するか
- `completed` / `failed` / `stopped` を native だけで決められるか
- stream を一度も見ていないクライアントでも、履歴再取得だけで message / approval / 最新状態を再構築できるか
- app-owned で最低限保持すべきものは何か

## 2. この作業で確定したい設計判断

### 必須確定

- `session_id = native thread ID` にするか
- `message_id = native item ID` にするか
- `approval_id = native request ID` にするか
- `sequence = app-owned` で確定か
- `session start` を App-owned façade action として扱うべきか
- `session.status` の遷移条件をどう置くか
- approval の再検出を履歴から行えるか
- approval の**最低確認情報**をどの native 事実から組み立てるか

### 条件付き確定

- `turn_id` は internal only で持つ価値があるか
- `event_id` は native 流用するか、app-owned にするか

### 保留でも先に進める項目

- `turn_id` は安定性が弱ければ debug / internal 補助のみ
- `event_id` は安定性が弱ければ app-owned opaque ID
- `approval_id` は native に stable ID が無ければ runtime stable key
- `session start` は native primitive が弱ければ App-owned façade action
- `sequence` は native に明確な安定連番が無ければ app-owned

## 3. スコープ

### 対象に含む

- thread / turn / item / request の ID と履歴
- native signal / event の種類と順序
- approval request / resolve / stop の挙動
- stream 切断後の履歴再取得
- stream 未接続の初回ロード時の履歴再取得
- status マッピングに必要な観測
- create / start / stop semantics
- item / request / event / history の timestamp
- approval 最低確認情報の native 取得元
- approval 解決後メタデータの native 取得元

### 対象外

- UI 詳細
- keepalive
- public API 整形
- 本格 DB 実装
- 冪等性の最終実装
- pagination や limit の細部

## 4. 実施方法

観測用スパイクを使って app-server と直接やり取りし、以下を保存する。

- request / response
- event stream
- 履歴再取得結果
- ケース名
- 時刻
- 同一 thread 内の出来事の順序

本実装ではなく、観測専用として行う。

Phase 1 では、次の運用を固定済みとする。

- 成果物と raw 証跡の正本は repo 内 `artifacts/app_server_observability/` に置く
- 保存単位は `case_name / run_key` とする
- `run_key` は高解像度 UTC 時刻と nonce で一意化し、再観測した tasks Phase は metadata に残す
- `session_key` は観測者が付与する grouping key とし、native `session_id` や `thread_id` と同一視しない
- request / response / history は同一採番で突合し、stream はケース単位の時系列で保存する
- 判定メモは `採用 / 不採用 / 保留だが先行可 / 未完了` の 4 値で残す

## 5. 実施フェーズ

### Phase 1: 基本ケース観測

通常 1 turn と、assistant テキスト無し turn を観測する。

確認すること:

- thread ID が得られるか
- turn ID が得られるか
- user item / assistant item の ID が得られるか
- delta と completed がどう来るか
- 同一 turn で assistant message item が複数生成されうるか
- tool/log/request だけで終わる turn があるか
- turn 完了後に「継続可能」と判断できる signal があるか
- item / event / history に時刻が付くか

### Phase 2: create / start semantics 観測

`session create` と `session start` をどう置くべきか確認する。

確認すること:

- native thread 作成だけで idle に置けるか
- `start without input` 的な安定操作があるか
- 無い場合、`session start` を純粋な App-owned 状態遷移として扱うべきか
- thread 作成直後に app 側で `created` を安全に持てるか

### Phase 3: approval ケース観測

approval を発生させて観測する。

確認すること:

- request ID があるか
- approval 内容として何が取れるか
- approve / deny / stop 後にどういう native 事実が残るか
- pending request を履歴から再検出できるか
- resolved request を履歴から再構成できるか
- request / resolution に時刻が付くか
- **approval の最低確認情報の取得元が何か**
  - `approval_category` 相当
  - `title / summary` 相当
  - `description / reason` 相当
  - `operation_summary` 相当
  - `requested_at` 相当
- **approval の解決後メタデータの取得元が何か**
  - `resolved_at` 相当

### Phase 4: stop / 異常 / 終端観測

停止や失敗を含むケースを観測する。

確認すること:

- stop が native にどう反映されるか
- `stopped` を置ける根拠があるか
- 一時失敗と終端失敗を区別できるか
- `completed` を native だけで置けるか
- native だけで足りなければ、runtime 判定が必要か

### Phase 5: 再取得・再構築観測

stream を切るケースと、stream を一度も見ていない初回ロードの両方で、履歴再取得だけでどこまで戻せるかを見る。

確認すること:

- messages を履歴から再構築できるか
- approvals を履歴から再構築できるか
- pending / resolved を区別できるか
- 最新状態を再推定できるか
- `sequence` は native ではなく app-owned で持つべきか
- 時刻だけで安定順序が取りやすいか
- 同一 thread / 同一 request 内で、時刻が順序判定の補助として信頼できるか
- stream 未接続のクライアントでも初回復元できるか

## 6. 優先ケース

最低限やるケース:

1. 通常 1 turn 完了
2. assistant テキスト無し turn
3. 複数 turn 継続
4. approval 発生 → approve
5. approval 発生 → deny
6. approval 発生中 → stop
7. 一時失敗ケース
8. stream 切断 → 履歴再取得
9. stream 未接続の初回ロード → 履歴再取得のみで復元

余力があれば:

- stop と approval resolve が近接するケース

## 7. 完了条件

次が埋まったら終了。

- ID 安定性一覧
- native signal / event 対応表
- create / start semantics の判断
- status マッピング方針
- approval 再検出可否
- approval 最低確認情報の取得元一覧
- approval 解決後メタデータの取得元一覧
- app-owned 必須項目一覧
- 保留時のデフォルト判断

---

# app-server 挙動確認チェックリスト（修正版）

## A. 基本ログ準備

- [x] request / response / event / history snapshot をケース単位で保存できる
- [x] ケース名と UTC 実行時刻を付けて保存できる
- [x] 時刻順と request 順の両方で追える
- [x] `session_key` / `thread_id` / `request_id` を対応付け、thread 単位で追える

## B. ID 安定性確認

- [x] thread ID が取得できる
- [x] thread ID は再取得後も同一
- [x] user item ID が取得できる
- [x] assistant item ID が取得できる
- [x] request ID が取得できるか確認した
- [ ] request ID が pending / resolved 再取得時も同一か確認した
- [x] turn ID が取得できるか確認した
- [x] turn ID が完了判定や request 紐付けに使えるか確認した
- [x] event ID が取得できるか確認した
- [x] event ID は安定 contract として使う価値があるか確認した

## C. 通常 turn 確認

- [x] user message 送信で何が生成されるか確認した
- [x] assistant delta の signal / event を確認した
- [x] assistant completed の signal / event を確認した
- [x] delta と completed が同じ message に結び付くか確認した
- [x] 同一 turn で assistant item が複数生成されうるか確認した
- [x] turn 完了を示す signal を確認した
- [x] `running -> waiting_input` に戻す根拠を確認した
- [x] 複数 turn 継続ケースを観測した
- [x] follow-up user message で既存 thread が再利用されるか確認した
- [x] follow-up turn で `waiting_input -> running` に戻る根拠を確認した

## D. assistant テキスト無し turn 確認

- [x] tool/log/request だけで終わる turn を観測した
- [x] assistant message が出ないまま turn 完了しうるか確認した
- [x] その場合でも `waiting_input` に戻せる根拠があるか確認した
- [x] message projection に含めない item を切り分けられるか確認した

## E. create / start 確認

- [x] native thread 作成だけで idle に置けるか確認した
- [x] `start without input` 的な安定操作があるか確認した
- [x] 無い場合、`session start` を App-owned façade action にすべきと判断できた
- [x] `created` 状態を app 側で安全に持てると判断できた

## F. approval 確認

- [x] approval request を発生させた
- [x] approval の最低確認情報5項目が native から取れるか確認した
- [x] request ID が stable か確認した
- [x] approve 後の native 変化を確認した
- [x] deny 後の native 変化を確認した
- [x] stop 後の native 変化を確認した
- [ ] pending approval を履歴再取得で再検出できるか確認した
- [ ] resolved approval を履歴から判定できるか確認した
- [x] `approval_category` 相当の native 取得元を記録した
- [x] `title / summary` 相当の native 取得元を記録した
- [x] `description / reason` 相当の native 取得元を記録した
- [x] `operation_summary` 相当の native 取得元を記録した
- [x] `requested_at` 相当の native 取得元を記録した
- [x] `resolved_at` 相当の native 取得元を記録した

## G. signal / event 対応確認

- [x] `message.user` に対応する native signal を決めた
- [x] `message.assistant.delta` に対応する native signal を決めた
- [x] `message.assistant.completed` に対応する native signal を決めた
- [x] `approval.requested` に対応する native signal を決めた
- [ ] `approval.resolved` に対応する native signal を決めた
- [x] `session.status_changed` を native から直接取るか、runtime で生成するか決めた
- [ ] `error.raised` に対応する native signal を決めた

## H. status マッピング確認

- [x] `running` の根拠を確認した
- [x] `waiting_input` の根拠を確認した
- [x] `waiting_approval` の根拠を確認した
- [x] `stopped` の根拠を確認した
- [ ] `failed` の根拠を確認した
- [x] `completed` を native だけで置けるか確認した
- [x] native だけで足りない場合、runtime 判定が必要と判断した

## I. 履歴再構築確認

- [ ] stream なしで messages を再構築できる
- [ ] stream なしで approvals を再構築できる
- [ ] pending / resolved を区別できる
- [ ] latest status 推定の材料が履歴にある
- [ ] `sequence` は app-owned にすべきと判断できる
- [ ] stream 未接続の初回ロードでも復元できるか確認した

## J. timestamp 確認

- [x] item に時刻が付くか確認した
- [x] request / resolution に時刻が付くか確認した
- [x] event に時刻が付くか確認した
- [x] 履歴再取得時に時刻で安定順序が取りやすいか確認した
- [ ] 同一 thread / 同一 request 内で時刻が順序判定の補助として信頼できるか確認した

### Phase 2 一次判断メモ

- `session_id` は native `thread_id` 候補として先行可。follow-up turn でも同一 thread が再利用された
- `message_id = native item ID` は不採用寄り。stream 側 item id と history 側 item id が一致しない
- `turn_id` は internal/debug 用の有力候補。複数 turn でも response / stream / history で一致した
- `event_id` は native 露出を観測できず、app-owned 採番前提で先行可
- `message.user` は `item/completed` with `userMessage`、`message.assistant.delta` は `item/agentMessage/delta`、`message.assistant.completed` は非空 text または history materialization を伴う `item/completed` with `agentMessage` が一次候補
- assistant text なし turn では stream に空文字 `agentMessage` lifecycle が出ても、history に assistant message が materialize されないケースがあった。公開 message projection では empty `agentMessage` を除外候補とする
- `running` / `waiting_input` の一次候補は `thread/status/changed: active` / `thread/status/changed: idle`
- `thread/start` だけで `idle` / `turns=[]` の thread を作成できた。first user message 前は `includeTurns=true` が unavailable で、`created` は app-owned projection 候補
- item / event / history では時刻を観測できず、timestamp 依存の順序判断は Phase 2 時点では採れない

### Phase 3 一次判断メモ

- `request_id` は approval case で native server request id を取得でき、approve / deny / approval 中 stop の各 case で `serverRequest/resolved.params.requestId` と一致した。ただし `thread/read` history には request object 自体が materialize されず、履歴再取得だけでは再検出できない
- `approval.requested` の第一候補は native server request `item/commandExecution/requestApproval`
- `approval.resolved` は `serverRequest/resolved` 単体では不十分。resolution 種別も `resolved_at` も無く、approve / deny は client reply raw と相関させないと区別できない
- `waiting_approval` の一次候補は `thread/status/changed: active[waitingOnApproval]`。pending `thread/read` でも同じ status を再取得できた
- approval の最低確認情報では `approval_category`、`title / summary`、`operation_summary` は native 由来候補がある。一方 `description / reason`、`requested_at`、`resolved_at` は native payload では埋まらず app 補完が必要
- approve 後は `waiting_approval -> active[] -> commandExecution completed -> final agentMessage -> idle`、deny 後は `serverRequest/resolved -> commandExecution declined -> active[] -> interrupted -> idle`、approval 中 stop 後は client approval reply 無しで `interrupted -> idle -> serverRequest/resolved` が出た
- 通常 stop は approval 中 stop と同じく `turn.status = interrupted` と `thread.status = idle` に落ちるが、`waitingOnApproval` も `serverRequest/resolved` も無い。`interrupted` だけでは approval canceled と通常 stop を区別できない
- terminal `completed` は native session status としては観測できず、approve 後の `idle` は `waiting_input` 側、deny / stop 後の `idle` は interrupted turn 完了後の待機状態として扱うのが妥当

## K. 最終判定

### 必須確定

- [ ] `session_id = native thread ID` 採用可否を確定
- [ ] `message_id = native item ID` 採用可否を確定
- [ ] `approval_id = native request ID` 採用可否を確定
- [ ] `sequence = app-owned` を確定
- [ ] `session start` を App-owned façade action とするか確定
- [ ] app-owned 必須情報を列挙した
- [ ] approval 最低確認情報の取得元を列挙した
- [ ] approval 解決後メタデータの取得元を列挙した

### 条件付き確定

- [ ] `turn_id` を internal only で保持する価値を確定
- [ ] `event_id` を native 流用するか app-owned にするか確定

### 保留でも先に進める判断

- [ ] `turn_id` は未判定でも debug / internal 補助のみで進められる
- [ ] `event_id` は未判定でも app-owned で進められる
- [ ] `approval_id` は未判定でも runtime stable key で進められる
- [ ] `session start` は未判定でも façade action として進められる

---

# 最終成果物テンプレート（修正版）

## 1. ID 安定性一覧

### 必須

- thread ID  
  - 判定: 採用 / 不採用 / 保留だが先行可  
  - 取得可否  
  - 再取得後同一性  
  - `session_id` 流用可否  
  - 保留時のデフォルト判断

- item ID  
  - 判定: 採用 / 不採用 / 保留だが先行可  
  - 取得可否  
  - `message_id` 流用可否  
  - delta/completed との対応  
  - 保留時のデフォルト判断

- request ID  
  - 判定: 採用 / 不採用 / 保留だが先行可  
  - 取得可否  
  - pending/resolved 再取得時の同一性  
  - `approval_id` 流用可否  
  - 保留時のデフォルト判断

### 条件付き

- turn ID  
  - 判定: 採用 / 不採用 / 保留だが先行可  
  - 取得可否  
  - 同一性  
  - internal only 利用価値  
  - 保留時のデフォルト判断

- event ID  
  - 判定: 採用 / 不採用 / 保留だが先行可  
  - 取得可否  
  - 安定性  
  - 流用価値  
  - 保留時のデフォルト判断

## 2. native signal / event 対応表

- native signal:
- internal event:
- public event:
- 補足:
- 判定: 採用 / 不採用 / 保留だが先行可

## 3. create / start semantics 判断

- native thread 作成だけで idle に置けるか:
- `start without input` 的 primitive の有無:
- `session start` を App-owned façade action にすべきか:
- 判定: 採用 / 不採用 / 保留だが先行可
- 補足:

## 4. status マッピング表

- native 観測:
- internal/public status:
- 判定条件:
- runtime 補完要否:
- 判定: 採用 / 不採用 / 保留だが先行可

## 5. approval 最低確認情報の取得元

- `approval_category`:
- `title / summary`:
- `description / reason`:
- `operation_summary`:
- `requested_at`:
- 欠ける場合の app 補完要否:

## 6. approval 解決後メタデータの取得元

- `resolved_at`:
- 欠ける場合の app 補完要否:

## 7. app-owned 必須項目

- `workspace_id`
- `sequence`
- `active_approval_id`
- session overlay
- idempotency key
- 必要なら approval stable key
- 必要なら event stable key

## 8. 保留時のデフォルト判断

- `turn_id` は安定性が弱ければ debug / internal 補助のみ
- `event_id` は安定性が弱ければ app-owned
- `approval_id` は native に stable ID が無ければ runtime stable key
- `session start` は native primitive が弱ければ App-owned façade action
- `sequence` は native に明確な安定連番が無ければ app-owned
