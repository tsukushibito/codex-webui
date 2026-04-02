# Codex WebUI MVP 実装ロードマップ v0.1

最終更新: 2026-04-01

## 1. 目的

本ドキュメントは、既存の以下文書を前提として、Codex WebUI の MVP 完成までの実行順序を整理するためのロードマップである。

- MVP 要件定義 v0.8
- 共通仕様 v0.8
- 公開 API 仕様 v0.8
- 内部 API 仕様 v0.8
- app-server 挙動確認計画 / 引き継ぎメモ

本ロードマップの狙いは、**手戻りコストの大きい境界面を先に固め、その後に runtime / BFF / UI / テストを順序良く収束させること**にある。

---

## 2. 現状整理

### 2.1 すでに固まっているもの

現時点で以下は大枠として整理済みである。

- MVP の成立条件
- 公開境界が `frontend-bff` のみであること
- `codex-runtime` が内部責務を持つこと
- `workspace / session / message / approval / event` の概念分離
- `session create` と `session start` の概念分離
- active session 制約
- approval 制約
- REST + SSE による復元方針
- internal/public の責務境界

### 2.2 すでに固定済みの重要ルール

- `session_status` は `created / running / waiting_input / waiting_approval / completed / failed / stopped`
- active session は `running` または `waiting_approval`
- `waiting_input` のときのみ通常メッセージ送信可
- `completed` は単なる 1 turn 完了ではなく WebUI 終端判断時のみ
- `waiting_approval` 中に stop した場合、approval は `canceled`
- session stream では `sequence` を持ち、再接続後は REST 再取得で収束する
- 公開 API / 内部 API ともに JSON, `snake_case`, UTC RFC 3339, opaque ID を前提とする

### 2.3 次にやるべきこと

次にやるべきことは、**app-server 依存の不確定点だけを先に観測で潰し、その結果をもとに仕様を最終固定し、実装へ進むこと**である。

---

## 3. 未確定事項一覧

### 3.1 app-server 観測が必要な事項

1. thread / turn / item / request / event の ID 安定性
2. native signal / event の種類と順序
3. `session create` / `session start` の実装上の意味
4. `running -> waiting_input` 判定根拠
5. approval の pending / resolved 再検出可否
6. `completed / failed / stopped` を native だけで判定できるか
7. stream 未接続初回ロードでも履歴再取得だけで復元できるか
8. approval 最低確認情報の native 取得元

### 3.2 観測後に仕様へ落とし込むべき事項

1. `session_id / message_id / approval_id / turn_id / event_id / sequence` の最終採用表
2. native signal → internal/public event 対応表
3. `session.status` 判定ルール
4. `session start` を façade action としてどう固定するか
5. app-owned 永続化の最小スキーマ
6. 原子性 / recovery の確定手順
7. workspace 単位排他ルール
8. BFF の field mapping / read model 合成方針
9. UI 復元ルール
10. 契約テスト観点

### 3.3 実装時にまだ揺れうるが後回し可能な事項

- `workspace_id` / ID 具体フォーマット
- projection cache の保持期間
- `system` role item の扱い
- pagination の既定 limit 最終値
- SSE transport の `event:` 名の細部

---

## 4. 全体フェーズ

本ロードマップでは、MVP 完成までを以下 6 フェーズに分ける。

1. フェーズ 0: 実験基盤・観測準備
2. フェーズ 1: app-server 挙動確認
3. フェーズ 2: 仕様固定
4. フェーズ 3: runtime 実装
5. フェーズ 4: BFF / UI 実装
6. フェーズ 5: テスト / 収束 / MVP 判定

依存関係としては、**フェーズ 1 の結果がフェーズ 2 の入力、フェーズ 2 の結果がフェーズ 3・4 の入力**になる。

---

## 5. フェーズ 0: 実験基盤・観測準備

### 5.1 目的

app-server の実挙動を観測できる最低限の検証環境を作る。

### 5.2 実施内容

- `codex app-server` を安定起動できる検証用 runtime を用意する
- native event / history / request / resolution を保存できるロガーを用意する
- 1 session ごとの観測ログを分離保存できるようにする
- stream 接続あり / なしの両方を検証できる簡易クライアントを用意する
- approval を意図的に発生させるプロンプトセットを用意する
- stop / deny / stream 切断 / 初回復元の試験シナリオをスクリプト化する

### 5.3 生成物

- 観測用 runtime stub または CLI harness
- raw log 保存形式
- ケース一覧と実行手順書
- 観測結果記録テンプレート

### 5.4 完了条件

- 再現可能な観測環境がある
- 同じケースを複数回流して差分比較できる
- approval / stop / stream 切断を含む最低ケースが自動または半自動で実行できる

---

## 6. フェーズ 1: app-server 挙動確認

### 6.1 目的

app-server 依存の不確定点を観測で潰す。

### 6.2 観測対象

#### Phase 1-A: 基本ケース

- 通常 1 turn 完了
- assistant テキスト無し turn
- 複数 turn 継続

確認事項:

- thread ID の有無と安定性
- turn ID の有無と安定性
- message item ID の有無と安定性
- delta / completed の到着順
- message 系 item が複数生成されうるか
- tool/log/request のみで終わる turn があるか
- item / event / history に時刻が付くか

#### Phase 1-B: create / start semantics

確認事項:

- native thread 作成だけで idle 相当を作れるか
- `start without input` 的な安定操作があるか
- 無い場合、`session start` は pure App-owned transition で良いか
- bootstrap が必要か、不要か

#### Phase 1-C: approval

- approval 発生 → approve
- approval 発生 → deny
- approval 発生中 → stop

確認事項:

- request ID の有無と安定性
- pending / resolved を履歴から再検出できるか
- 最低確認情報の取得元
- `resolved_at` の取得可否
- approval 解決後に session がどう進むか

#### Phase 1-D: stop / 異常 / 終端

確認事項:

- stop が native へどう反映されるか
- `stopped` の根拠を native だけで持てるか
- 一時失敗と終端失敗を区別できるか
- `completed` を native 単独で置けるか、runtime 判定が必要か

#### Phase 1-E: 再取得 / 再構築

- stream 切断 → 履歴再取得
- stream 未接続の初回ロード → 履歴再取得のみで復元

確認事項:

- messages を履歴から再構築できるか
- approvals を履歴から再構築できるか
- pending / resolved を区別できるか
- 最新状態を再推定できるか
- `sequence` を app-owned にすべきか

### 6.3 このフェーズで出すべき成果物

1. ID 安定性一覧
2. native signal / event 一覧
3. native → public/internal event 対応候補表
4. status 判定候補表
5. approval 最低確認情報マッピング表
6. app-owned 必須項目の暫定表
7. 未解決事項リスト

### 6.4 完了条件

- handoff 文書で列挙された確認対象に全て回答が付いている
- 「観測できた事実」と「推論」を分けて記録している
- 未解決事項が残る場合も、MVP での暫定判断が置けている

---

## 7. フェーズ 2: 仕様固定

### 7.1 目的

観測結果を要件・共通・公開 API・内部 API に反映し、以降の実装で迷わない状態にする。

### 7.2 固定対象

#### 7.2.1 ID / key

- `session_id`
- `message_id`
- `approval_id`
- `turn_id`
- `event_id`
- `sequence`

#### 7.2.2 状態判定

- `running -> waiting_input`
- `running -> waiting_approval`
- `running -> completed`
- `running -> failed`
- `running -> stopped`

#### 7.2.3 action semantics

- `session create`
- `session start`
- `message accept`
- `approval resolve`
- `session stop`

#### 7.2.4 event contract

- public / internal `event_type`
- payload の最低限 shape
- `occurred_at` と `sequence` の関係
- stream / REST event の整合ルール

#### 7.2.5 persistence / recovery

- workspace registry
- `workspace_id <-> session_id`
- session overlay
- approval projection
- sequence 管理
- idempotency key
- recovery_pending の扱い

### 7.3 文書反映対象

- 要件定義: 観測で判明した前提差分があれば反映
- 共通仕様: event / sequence / transport の横断ルール調整
- 公開 API: response / error / action semantics の確定
- 内部 API: overlay / projection / atomicity / recovery を確定

### 7.4 完了条件

- 要件・共通・公開・内部の間で矛盾がない
- 未確定事項が「実装に影響しない細部」に限定されている
- runtime / BFF / UI 実装者が仕様だけで着手できる

---

## 8. フェーズ 3: runtime 実装

### 8.1 目的

MVP の中核である `codex-runtime` を実装する。

### 8.2 実装優先順位

#### 8.2.1 最優先

1. App Server プロセス管理
2. workspace registry
3. `workspace_id <-> session_id` 対応管理
4. session overlay
5. active session 制約の最終保証
6. message accept / approval resolve / stop の複合状態遷移

#### 8.2.2 次点

7. message / approval / event projection
8. canonical `sequence` 採番
9. summary read model
10. recovery / reconciliation

### 8.3 実装単位

#### A. workspace 管理

- `/workspaces` 列挙
- 作成ルール
- 除外条件

#### B. session 管理

- create
- start
- get / list
- stop
- session overlay 更新

#### C. messaging

- `client_message_id` による冪等化
- native thread への input 送信
- user message projection
- assistant delta / completed 処理

#### D. approval

- request 検出
- detail projection
- approve / deny / cancel
- `active_approval_id` 管理

#### E. event / sequence

- canonical event append
- session stream 用 sequence
- approval global stream 用 projection

#### F. recovery

- partial failure 検出
- native history からの再構築
- orphan / mismatch 検知

### 8.4 完了条件

- internal API を満たす runtime 操作が一通り動く
- active session 制約が runtime で最終保証される
- approval / stop / idempotency / recovery の基本系が動く
- SSE 用 event source を BFF に供給できる

---

## 9. フェーズ 4: BFF / UI 実装

### 9.1 目的

runtime の内部契約を公開 API とスマホ前提 UI に変換する。

### 9.2 BFF 実装

#### 優先順

1. public REST endpoint
2. internal → public mapping
3. Home 集約
4. session stream relay
5. approvals stream relay
6. public error mapping
7. `can_*` 導出

#### 特に重要な変換

- approval `summary/reason` → public `title/description`
- public approve / deny → internal resolve
- Home の集約 response
- stop response の `canceled_approval` 変換

### 9.3 UI 実装

#### 画面優先順

1. Home
2. Chat
3. Approval

#### Chat で必要なもの

- session 詳細表示
- message 一覧
- activity log
- delta 仮表示
- completed 確定表示
- status 表示
- stop
- SSE 再接続後 REST 再取得

#### Approval で必要なもの

- pending 一覧
- detail
- approve / deny
- stop 由来 `canceled` 反映
- badge / banner / toast

#### スマホ観点

- 360px 幅で主要操作完結
- Home / Chat / Approval の 3 画面で主操作完結
- approval は最低確認情報到達後 2 タップ以内

### 9.4 完了条件

- 公開 API が仕様通り返る
- UI が Home / Chat / Approval の 3 画面で完結する
- スマホで主要操作が横スクロールなしで可能
- SSE 切断時に REST 再取得で整合回復する

---

## 10. フェーズ 5: テスト / 収束 / MVP 判定

### 10.1 目的

仕様通りに動くこと、MVP 成立条件を満たすことを確認する。

### 10.2 テスト観点

#### 契約テスト

- workspace CRUD のうち MVP 対象機能
- session create / start / get / list / stop
- `waiting_input` 以外での message reject
- active session 制約
- approval approve / deny / cancel
- idempotent resend
- error.code / status code の整合

#### 復元テスト

- ブラウザ再読み込み
- SSE 切断 → 再接続 → REST 再取得
- stream 未接続初回ロード
- approval pending 再表示
- stop 後の state / approval 整合

#### E2E テスト

- workspace 作成 → session 作成 → start → 対話 → stop
- approval 発生 → approve
- approval 発生 → deny
- approval 発生 → stop
- runtime 部分失敗後の再取得収束

#### UI 受け入れテスト

- PC ブラウザ
- スマホブラウザ相当幅
- approval 導線
- banner / toast
- 直前 session への復帰

### 10.3 MVP 判定基準

以下を満たせば MVP 完了とする。

- 要件定義の Must を満たす
- app-server 観測に基づく仕様差分が文書へ反映済み
- runtime / BFF / UI の責務境界で重大な曖昧さが残っていない
- SSE 切断後の再取得で整合回復する
- スマホ受け入れ基準を満たす
- approval の最低確認情報が UI から確認可能

---

## 11. 依存関係

### 11.1 強い依存

- フェーズ 1 → フェーズ 2
  - 観測なしでは `start semantics`, `status 判定`, `approval 再検出`, `ID 採用表` が固定しにくい

- フェーズ 2 → フェーズ 3
  - runtime 実装前に overlay / projection / atomicity の仕様固定が必要

- フェーズ 3 → フェーズ 4
  - BFF / UI は internal contract と event contract が固まっていないと手戻りが大きい

- フェーズ 4 → フェーズ 5
  - E2E / UX 検証は UI 実装完了後

### 11.2 並行可能なもの

- フェーズ 0 の後半とフェーズ 1 の一部
- フェーズ 2 の文書反映と、フェーズ 3 の非依存部分の雛形実装
- フェーズ 3 の workspace/session 基盤と、フェーズ 4 の UI 骨組み

---

## 12. 優先順位

### 12.1 最優先

1. app-server 観測
2. `session start` / `waiting_input` / `completed` の意味固定
3. approval 再検出と最低確認情報の取得元固定
4. active session 制約の runtime 実装
5. message / approval / stop の原子性と recovery
6. session stream と REST 再取得の整合

### 12.2 次優先

7. Home 集約
8. approval global stream
9. activity log
10. スマホ最適化の詰め

### 12.3 後回し

- diff 表示
- 変更ファイル一覧
- session タイトル自動生成
- PC 補助パネル強化

---

## 13. リスク

### 13.1 技術リスク

#### R1. native ID が安定しない

影響:
- `approval_id` / `event_id` / `turn_id` 設計に波及

対策:
- app-owned stable key の fallback を先に設計する

#### R2. `session start` に対応する安定 native primitive がない

影響:
- public/internal action semantics が揺れる

対策:
- `start` を App-owned façade action として確定する前提で設計する

#### R3. `completed / failed / stopped` を native 単独で判定できない

影響:
- runtime overlay が必須になる

対策:
- native を正本、公開状態は app-owned overlay と割り切る

#### R4. approval を履歴から再検出できない

影響:
- 再接続復元が壊れる

対策:
- approval projection を runtime 永続化の正本寄りに寄せる

#### R5. partial failure により native と projection がずれる

影響:
- UI の最新状態が不安定になる

対策:
- `recovery_pending` と再整合フローを最初から用意する

### 13.2 プロダクトリスク

#### R6. スマホで approval UX が重い

対策:
- Approval 画面を独立させる
- 一覧から detail 到達を短くする
- 最低確認情報に集中する

#### R7. activity と message の責務が混ざる

対策:
- `messages` と `events` を分離維持する

---

## 14. 後回し項目

以下は MVP 後に回すのが妥当である。

- workspace rename / delete
- session delete / archive
- 任意 path import
- ファイルブラウザ
- ターミナル UI
- 高機能 diff viewer
- 複数ユーザー対応
- 高度な承認ポリシー編集
- persistent tunnel 管理 UI
- 本格監査ログ

Should 項目も、MVP 判定には含めず、収束後に個別投入する。

---

## 15. 推奨マイルストーン

### M1. 観測完了

- app-server 挙動確認結果が揃う
- ID / status / approval の主要論点に暫定結論がある

### M2. 仕様凍結

- 4 文書が整合済み
- runtime / BFF / UI の境界が固定される

### M3. runtime 最低完成

- session / message / approval / stop / event が internal で動く

### M4. UI 最低完成

- Home / Chat / Approval が PC / スマホ相当で動く

### M5. MVP 収束完了

- 復元・再接続・承認・停止・排他制約を含む E2E が通る
- Must 要件を満たす

---

## 16. 最小実行順サマリ

最も安全な進め方は次の順である。

1. app-server の観測環境を作る
2. 主要 8 ケースを観測する
3. ID / status / approval / event の仕様を固定する
4. runtime で overlay / projection / atomicity / recovery を実装する
5. BFF で public 契約へ変換する
6. UI を Home / Chat / Approval の順に実装する
7. 再接続 / approval / stop / active session 制約を重点的に E2E 検証する
8. Must 要件を満たしたら MVP と判定する

