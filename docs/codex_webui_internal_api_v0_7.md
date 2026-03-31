# Codex WebUI 内部 API 仕様書 v0.7

## 1. 文書の目的

本仕様は、Codex WebUI MVP において `frontend-bff` と `codex-runtime` の間で利用する **内部 API** の契約を定義する。

本版では、Codex App Server の **Thread / Turn / Item / server-initiated request flow** を正本として扱い、内部 API における各 resource が以下のいずれに属するかを明確にする。

- **App 固有 resource**
- **native-backed façade resource**
- **projection / read model**

本仕様の目的は以下とする。

- 公開 API v0.7 を成立させるための最小で堅い内部契約を定める
- `codex-runtime` の責務と `frontend-bff` の責務を明確に分離する
- App Server native primitive と WebUI resource の対応を明確にする
- session / approval / message / event の状態整合と原子性を定義する
- 復元要件を満たすための永続化単位を明確にする
- SSE 配信と event / sequence の責務分担を定める
- internal schema から public schema への変換責務を明確にする
- WebUI 側で不要な独自採番や履歴複製を避ける

本仕様は MVP を対象とし、将来拡張を過剰に先取りしない。

---

## 2. 適用範囲

本仕様は以下に適用する。

- `frontend-bff` から `codex-runtime` への内部 REST API
- `frontend-bff` から `codex-runtime` への内部 SSE stream
- internal domain resource の schema
- native primitive と App 側 resource の対応
- state transition / atomicity / persistence / event generation ルール
- internal resource から public resource への field mapping ルール

以下は対象外とする。

- ブラウザ向け公開 API 契約そのもの
- App Server native protocol 全体の完全固定
- DB 実装技術の固定
- event bus 製品の導入前提
- 複数ユーザー対応前提の認可モデル
- workspace rename / delete
- session delete / archive
- 完全 replay を伴うイベント再送

---

## 3. 前提

### 3.1 システム前提

- 公開境界は `frontend-bff` のみ
- `codex-runtime` は外部非公開
- 認証は Dev Tunnels に委譲する
- 単一ユーザー前提
- workspace 管理対象は `/workspaces` 配下限定
- `codex app-server` は `codex-runtime` 内で長寿命プロセスとして管理される
- UI は Home / Chat / Approval の 3 画面を前提とする

### 3.2 App Server 前提

Codex App Server は、会話の native primitive として少なくとも以下を持つ前提で扱う。

- `thread`
- `turn`
- `item`
- server-initiated request / client response flow

内部 API は、これら native primitive を必要に応じて façade / projection 化して BFF に提供する。

### 3.3 公開 API から逆算される制約

内部 API は少なくとも以下を支えられる必要がある。

- workspace 一覧 / 作成 / 詳細
- session 一覧 / 作成 / 開始 / 詳細 / stop
- message 一覧 / 送信
- event 一覧 / session stream
- approval 一覧 / 詳細 / approve / deny / approvals stream
- Home 初期表示用の集約情報

### 3.4 session / approval の重要制約

- `session create` と `session start` は公開 API 上で概念分離される
- 同一 workspace で active session は 1 つまで
- active は `running` または `waiting_approval`
- `waiting_input` のときのみ通常メッセージ送信可
- `waiting_approval` 中は通常メッセージ送信不可
- `deny` 後は `waiting_input`
- `waiting_approval` 中に stop した場合、approval は `canceled`
- `completed` / `failed` / `stopped` は WebUI 上の終端状態
- `completed` は runtime / app-server 側で session を終端と判断した場合のみ遷移させる
- 単なる 1 turn 完了は原則 `waiting_input` に戻す
- 同一 session に同時 pending approval は 1 件までとする
- 同一 workspace に active session が存在していても、別 session の `create` 自体は許可する
- active session 制約は `start` 時および `waiting_input -> running` 遷移時に最終保証する

---

## 4. 設計方針

### 4.1 基本方針

- API バージョン基底は `/api/v1`
- データ形式は JSON
- JSON フィールド名は `snake_case`
- enum 値は `snake_case`
- `event_type` は `domain.action`
- 日時は UTC RFC 3339 文字列、末尾 `Z`
- API に露出する ID は opaque string
- エラーは共通 envelope を用いる
- `409` は状態衝突、`422` は値ルール違反
- 一覧系 query parameter は `limit` / `cursor` / `sort`
- 初期表示は REST、差分は SSE
- `Last-Event-ID` は MVP では前提にしない
- 正常レスポンスの最外殻に共通 `data` envelope は設けない

### 4.2 resource の分類

内部 API の resource は 3 種に分かれる。

#### 4.2.1 App 固有 resource

- `workspace`
- workspace registry
- workspace と thread の対応
- active session 制約
- WebUI 公開状態
- Home 用集約

#### 4.2.2 native-backed façade resource

- `session`
- `approval`
- SSE の一部
- stop / start / resolve の action

#### 4.2.3 projection / read model

- `message`
- `events`
- `active_session_summary`
- global approval summary

### 4.3 責務境界

#### `frontend-bff` の責務

- ブラウザ向け公開 API への整形
- Home 用など UI 都合の集約レスポンス生成
- internal SSE の relay
- Dev Tunnel 公開入口
- internal error から public error への変換
- internal resource から public resource への field mapping
- 画面単位の read model 合成
- `can_*` UI 補助フィールドの最終導出

#### `codex-runtime` の責務

- workspace 管理
- workspace と native thread の対応管理
- App Server プロセス管理
- App Server native primitive の操作
- active session 制約の最終保証
- approval / stop / message send の複合状態遷移
- public / internal 用 projection の構築
- 必要最小限の app-owned 永続化
- 復元用 read model / cursor の保持
- session stream 用の canonical sequencing

### 4.4 App Server との整合原則

- `workspace` は App 側 resource とする
- `session` は **App Server thread の内部 façade** とする
- `session start` は **native 1:1 action ではなく App-owned façade action** とする
- `message` は **App Server item のうち message 系 item を投影した resource** とする
- `approval` は **App Server の server-initiated request flow を投影した resource** とする
- internal SSE の `event_type` は UI / BFF 向けの安定 event 名であり、native event 名と 1:1 対応を保証しない
- 可能な限り native ID を流用し、WebUI 側の独自採番は必要最小限に留める

### 4.5 正本境界と再構築原則

不整合時の判断基準として、MVP では以下を採用する。

- native `thread` / `turn` / `item` / request flow の事実は **App Server 側を正本** とする
- `workspace registry`、`workspace_id <-> session_id` 対応、公開 `session.status`、`active_approval_id`、approval stable ID、session `sequence` は **runtime / app-owned 永続化を正本** とする
- native 側事実と app-owned projection が食い違う場合、可能な限り native history から projection を再構築し、再構築不能な app-owned 制御情報は永続化値を優先する

### 4.6 `workspace.updated_at` の意味

internal における `workspace.updated_at` は、workspace 自身の作成・更新時刻だけを表すものではない。  
MVP では、**配下 session または approval の最後の状態変化時刻を含む集約時刻** として扱う。

これにより、Home 画面の並び順、差分反映、および public `workspace.updated_at` と整合する。

---

## 5. ID 方針

### 5.1 Workspace

- `workspace_id` は App 側で管理する opaque ID とする
- `workspace_id` は App Server native ID ではない

### 5.2 Session

- `session_id` は **native thread ID** を採用する
- internal でも public でも、原則として同一の `session_id` を用いる
- `native_thread_id` は別 field を持たず、`session_id` と同一視してよい

### 5.3 Turn

- `turn_id` は native turn ID が安定して取得できる場合は内部的に保持してよい
- `turn_id` は MVP の公開 API には露出しない
- internal API でも必須露出はしないが、event / debug / projection 更新の内部キーとして使用してよい

### 5.4 Message

- `message_id` は **message として公開する item の native item ID** を採用する
- すべての item が message ではない
- `message` は item の部分集合である

### 5.5 Approval

- `approval_id` は、native request / approval に stable ID がある場合はそれを採用する
- native に stable ID がない場合に限り、runtime 側で stable ID を付与してよい
- native ID がない場合でも、同一 request に対し再接続後も同じ `approval_id` を返せること

### 5.6 Event

- `event_id` は internal SSE event を一意識別できればよい
- native event をほぼそのまま relay する場合は native event ID を流用してよい
- runtime が複数 native event を再構成して 1 つの internal event にする場合は、internal event 用の opaque ID を付与してよい

---

## 6. native primitive と internal resource の対応

| internal 概念 | Native 対応 | 種別 | 備考 |
|---|---|---|---|
| `workspace` | なし | App 固有 | runtime 側で正本を持つ |
| `session` | `thread` | façade | session_id は thread ID |
| `session start` | native 1:1 ではない | façade action | thread 活性化・公開状態初期化・必要な bootstrap を含んでよい |
| `message` | `item` の部分集合 | projection | chat bubble 表示対象のみ |
| `approval` | server-initiated request flow | façade | native request を UI resource 化 |
| `session events` | thread / turn / item / request 通知群 | projection | BFF 向け安定 event 名へ整形 |
| `approval stream` | request / resolution 通知群 | projection | global approval 更新用 |

---

## 7. 内部ドメインモデル

## 7.1 Workspace

```json
{
  "workspace_id": "ws_xxx",
  "workspace_name": "alpha",
  "directory_name": "alpha",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:22:00Z",
  "active_session_id": "thread_abc123",
  "active_session_summary": {
    "session_id": "thread_abc123",
    "status": "running",
    "last_message_at": "2026-03-27T05:21:40Z"
  },
  "pending_approval_count": 1
}
```

### ルール

- `workspace_id` は App 側 opaque ID
- `workspace_name` は表示名兼作成入力値
- MVP では `directory_name` と `workspace_name` は 1:1 とする
- 実パスは `/workspaces/{directory_name}` から導出する
- `updated_at` は配下 session / approval の最後の状態変化を含む集約時刻とする
- `active_session_summary` は Home 集約と workspace 一覧のための read model である
- `active_session_summary` は **active な session が存在する場合のみ** 非 `null`
- rename / delete / move は対象外

## 7.2 Session

```json
{
  "session_id": "thread_abc123",
  "workspace_id": "ws_xxx",
  "title": "Fix build error",
  "status": "waiting_input",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:22:00Z",
  "started_at": "2026-03-27T05:13:00Z",
  "last_message_at": "2026-03-27T05:21:40Z",
  "active_approval_id": null,
  "current_turn_id": null,
  "app_session_overlay_state": "open"
}
```

### 補足

- `session` は **App Server thread の内部 façade**
- `session_id` は native thread ID
- `status` は WebUI 用に要約された公開 / 内部状態であり、native thread status をそのまま露出するものではない
- `current_turn_id` は active turn がある場合に内部的に保持してよい
- `app_session_overlay_state` は App-owned の補助情報であり、例として `open` / `stopping` / `closed` などを取りうる
- `app_session_overlay_state` は public contract の正本ではない

### session_status

- `created`
- `running`
- `waiting_input`
- `waiting_approval`
- `completed`
- `failed`
- `stopped`

### session_status の解釈

- `created`: App-owned session resource と native thread は作られたが、公開上まだ開始前
- `running`: active turn 実行中、または turn 実行に伴う進行状態
- `waiting_input`: active turn がなく、通常メッセージ送信可能
- `waiting_approval`: native request への応答待ち
- `completed`: App-owned 終端状態
- `failed`: runtime が **同一 session の継続を打ち切るべき実行失敗** と判断した場合の App-owned 失敗終端状態
- `stopped`: 利用者またはシステムによる **停止意思に基づく** App-owned 停止終端状態

> 注記:
> native thread は durable container であり本来継続可能であっても、MVP の WebUI では `completed` / `failed` / `stopped` を終端状態として扱う。

## 7.3 Message

```json
{
  "message_id": "item_msg_001",
  "session_id": "thread_abc123",
  "role": "user",
  "content": "Please explain the diff.",
  "created_at": "2026-03-27T05:23:00Z",
  "source_item_type": "user_message"
}
```

### message_role

- `user`
- `assistant`

### ルール

- `message` は item のうち chat bubble として表示すべきものだけを抽出した projection
- `message_id` は公開対象となる message 系 item の native item ID
- `source_item_type` は内部的な由来追跡用 field であり、public へは通常露出しない
- tool execution, diff, approval request などの item は `message` ではなく `events` / `approval` 側で扱う
- MVP では `system` role は public / internal read model の標準対象外とし、必要なら将来拡張とする

## 7.4 Approval

```json
{
  "approval_id": "req_001",
  "session_id": "thread_abc123",
  "workspace_id": "ws_xxx",
  "status": "pending",
  "resolution": null,
  "approval_category": "external_side_effect",
  "summary": "Run git push",
  "reason": "Codex requests permission to push changes to remote.",
  "operation_summary": "git push origin main",
  "context": {
    "command": "git push origin main"
  },
  "created_at": "2026-03-27T05:18:00Z",
  "resolved_at": null,
  "native_request_kind": "approval_request"
}
```

### approval_status

- `pending`
- `approved`
- `denied`
- `canceled`

### approval_resolution

- `approved`
- `denied`
- `canceled`

### approval_category

- `destructive_change`
- `external_side_effect`
- `network_access`
- `privileged_execution`

### ルール

- `approval` は native request flow を WebUI resource に投影した façade
- `approval_id` は native request ID を優先採用する
- `created_at` は native request を runtime が受け取った時点を基準にしてよい
- `canceled` は App-owned stop semantics を含む内部 / 公開表現であり、native protocol に同名概念がなくてもよい
- `native_request_kind` は内部追跡用であり public へは通常露出しない
- `approval_category` は MVP では固定し、将来拡張時は後方互換な enum 追加のみ検討する

## 7.5 Event

```json
{
  "event_id": "evt_001",
  "session_id": "thread_abc123",
  "event_type": "message.assistant.delta",
  "sequence": 42,
  "occurred_at": "2026-03-27T05:20:10Z",
  "payload": {
    "message_id": "item_msg_003",
    "delta": "Updated the config"
  },
  "native_event_name": "item/agent_message/delta"
}
```

### event_type 例

- `session.status_changed`
- `message.user`
- `message.assistant.delta`
- `message.assistant.completed`
- `approval.requested`
- `approval.resolved`
- `log.appended`
- `error.raised`

### ルール

- `event` は native event の raw mirror ではなく、BFF / UI 向け安定 event
- `native_event_name` は内部デバッグ / 追跡用 field として保持してよい
- `sequence` は **session stream 用の安定連番** とする
- global approval stream では `sequence` を必須としない

---

## 8. 状態遷移

## 8.1 Session 状態遷移

- `created -> running`
- `running -> waiting_input`
- `running -> waiting_approval`
- `running -> completed`
- `running -> failed`
- `running -> stopped`
- `waiting_input -> running`
- `waiting_input -> stopped`
- `waiting_approval -> running`
- `waiting_approval -> waiting_input`
- `waiting_approval -> stopped`

### 補足

- `waiting_approval -> running` は approve / allow reply 後
- `waiting_approval -> waiting_input` は deny reply 後
- `waiting_approval -> stopped` は stop 時
- `waiting_input -> stopped` は許可する
- `completed` / `failed` / `stopped` は WebUI 上の終端状態
- 終端状態から再開は不可
- assistant 側 1 turn が完了し、次入力を受け付ける場合は原則 `waiting_input`
- `completed` は runtime がその session を WebUI 終端と判断した場合にのみ遷移させる
- `failed` は runtime が **同一 session の継続を打ち切るべき実行失敗** と判断した場合にのみ遷移させる
- turn 単位の一時的失敗で同一 session を継続可能な場合は、`error.raised` を記録しつつ `waiting_input` へ戻してよい
- `stopped` は利用者またはシステムによる停止意思に基づく終端としてのみ用いる

## 8.2 Approval 状態遷移

- `pending -> approved`
- `pending -> denied`
- `pending -> canceled`

### 補足

- `approved` は session を `running` に戻す
- `denied` は session を `waiting_input` に戻す
- `canceled` は session を `stopped` に遷移させる stop 由来の解決結果
- 1 session あたり同時 pending approval は高々 1 件であり、`active_approval_id` はその単一 request を指す

## 9. 原子性ルール

以下の操作は runtime 側で原子的に扱う。  
ただし MVP では分散トランザクションは前提にせず、**成功境界・部分失敗時の補償・再試行方針**を明示する。

### 9.1 共通原則

- native 操作と app-owned 永続化は 1 つの ACID transaction にはできない前提で設計する
- 各複合操作は「公開成功とみなす境界」を定義する
- 公開成功境界を越えた後に projection / event append が失敗した場合、再試行または再構築で収束させる
- 補償不能な partial failure は **recovery_pending** として検出可能にし、次回起動時またはバックグラウンド再整合で処理する
- canonical event append と projection 更新の順序は、**event append を先、projection は event から再構築可能**を原則とする

### 9.2 session create

1. workspace が存在することを検証
2. native thread を作成する
3. `workspace_id <-> session_id(thread_id)` の対応を永続化
4. session overlay record を `created` で保存
5. canonical event を必要に応じて append
6. workspace summary / read model を更新

成功境界:
- 手順 4 完了を成功境界とする

部分失敗時:
- native thread 作成成功後に 3 または 4 が失敗した場合、孤児 thread として検出可能でなければならない
- 再起動時に未対応 thread を検出した場合、対応付け再試行または運用ログ通知を行う

> 補足:
> `session create` では active session 制約を理由に拒否しない。  
> active session 制約の最終保証点は `start` および message 送信に伴う `waiting_input -> running` 遷移である。

### 9.3 session start

`session start` は native 1:1 primitive ではなく App-owned façade action とする。

最低限、以下を保証する。

1. session が `created` であることを検証
2. 同一 workspace に別 active session が存在しないことを検証
3. App-owned session 状態を `running` へ遷移
4. 必要なら bootstrap 用 native operation を実行する
5. `session.status_changed` canonical event を append
6. workspace summary / read model を更新

成功境界:
- 手順 3 完了を成功境界とする

再送時:
- 同じ start が既に成功済みなら最新状態を返す冪等成功を許容する

> 補足:
> native App Server に「start without input」の安定 primitive がない場合、
> `session start` は App 側状態遷移と UI 初期化の façade action として扱ってよい。

### 9.4 message accept

1. session が `waiting_input` であることを検証
2. 同一 workspace に別 active session が存在しないことを最終確認する  
   ただし対象 session 自身は active 候補として許可する
3. `client_message_id` の重複を検査する
4. native thread に対して新しい turn を開始する
5. user message item を native に送信する
6. App-owned session 状態を `running` に更新
7. `current_turn_id` を必要に応じて保持
8. `message.user` / `session.status_changed` canonical event を append
9. projection / summary を更新

成功境界:
- 手順 7 完了を成功境界とする  
- assistant 側生成は native event を受けて非同期継続とする

再送時:
- `client_message_id` は必須とする
- 同じ `session_id` と `client_message_id` の組み合わせで request body が同一なら、既存の user message 結果を返す冪等成功を許容する
- 同じ key で `content` など request body が異なる場合は `409 message_idempotency_conflict` とする

部分失敗時:
- native 送信成功後に app-owned 更新が失敗した場合、session を `recovery_pending` 相当で検出可能にし、次回再整合で message projection と session 状態を復旧する
- canonical event append に失敗した場合でも、native history から再構成可能であること

### 9.5 approval resolve

1. approval が `pending` であることを検証
2. native request へ `allow` または `deny` 相当の reply を返す
3. `resolved_at` を設定
4. session の `active_approval_id` を `null` に更新
5. session 状態を resolution に応じて更新
6. `approval.resolved` canonical event を append
7. `session.status_changed` canonical event を append
8. projection / summary を更新

成功境界:
- 手順 5 完了を成功境界とする

再送時:
- 既に同じ resolution が確定している場合、最新状態を返す冪等成功を許容する
- 既に別 resolution が確定している、または `canceled` 済みの場合は `409 approval_not_pending` とする

部分失敗時:
- native reply 成功後に 3〜8 が失敗した場合、approval は `recovery_pending` として再整合対象に載せる
- pending から resolved への二重遷移を防ぐため、approval stable ID ごとの一意更新を要求する

### 9.6 session stop

1. session が stop 可能状態であることを検証
2. `running` の場合は native turn / execution へ cancel / interrupt を送る
3. `waiting_approval` の場合は active approval を `canceled` に更新し、native request 側に必要な cancel / deny 相当処理を行う
4. `waiting_input` の場合は App-owned session overlay を `stopped` に更新する
5. session を `stopped` に更新
6. `active_approval_id` を `null` に更新
7. `approval.resolved` canonical event を必要に応じて append
8. `session.status_changed` canonical event を append
9. projection / summary を更新

成功境界:
- 手順 6 完了を成功境界とする

再送時:
- 既に `stopped` であれば最新停止状態を返す冪等成功を許容する

部分失敗時:
- native cancel 成功後に app-owned 停止反映が失敗した場合、再起動時に停止済み / approval 解決済みの突合を行い `stopped` へ収束させる

## 10. 永続化方針

## 10.1 基本方針

App Server が native に保持する thread / turn / item history を正本とし、WebUI / runtime 側では **App 固有情報と必要最小限の projection** のみを永続化する。

### 10.2 App-owned 永続化対象

App-owned session overlay には最低限以下の責務を持たせてよい。

- `open`: 通常運用中
- `stopping`: stop の複合処理実行中
- `closed`: stop 済み
- `recovery_pending`: native 事実と projection / overlay の再整合が必要


最低限、以下を永続化する。

- workspace registry
- `workspace_id <-> directory_name`
- `workspace_id <-> session_id(thread_id)` の対応
- App-owned session overlay metadata
- pending / resolved approval projection
- summary / cursor / sequence 管理に必要な read model
- stop / approval resolve などの複合操作の補助状態
- native stable ID が存在しない approval / event の場合の対応表

### 10.3 原則として正本を app-server に委ねる対象

以下は、可能な限り App Server thread history を正本とする。

- full message history
- full item history
- native event history
- turn execution history

### 10.4 キャッシュ / projection として保持してよい対象

以下は、再接続・高速初期表示・cursor 運用のために denormalized に保持してよい。

- message projection
- approval projection
- public / internal events projection
- workspace / session summary
- unread / pending counts
- session stream 用 sequence counter

### 10.5 復元要件との関係

MVP で保証するのは以下。

- ブラウザ再接続後の一覧 / 履歴 / 最新状態参照
- SSE 切断後の再購読と REST 再取得による整合

以下は保証対象外。

- runtime 再起動後の実行継続
- container 再起動後の実行継続
- `running` 中処理の中断復帰

ただし runtime 再起動後でも、App Server が thread history を保持している範囲では、保存済みの workspace 対応情報と合わせて履歴・最終状態を再構成可能であることを目標とする。

---

## 11. 内部 API 一覧

## 11.1 Workspace 系

### `GET /api/v1/workspaces`

workspace summary 一覧を返す。

#### query

- `limit` 任意。既定 100
- `cursor` 任意
- `sort` 任意。既定 `-updated_at`

#### allowed sort values

- `updated_at`
- `-updated_at`

#### paging / sort rules

- `sort=updated_at` の場合、順序は `updated_at asc, workspace_id asc`
- `sort=-updated_at` の場合、順序は `updated_at desc, workspace_id desc`
- cursor paging では指定 sort に対応する上記の安定順序を前提とする

#### response

```json
{
  "items": [
    {
      "workspace_id": "ws_alpha",
      "workspace_name": "alpha",
      "directory_name": "alpha",
      "created_at": "2026-03-27T05:12:34Z",
      "updated_at": "2026-03-27T05:22:00Z",
      "active_session_id": "thread_001",
      "active_session_summary": {
        "session_id": "thread_001",
        "status": "running",
        "last_message_at": "2026-03-27T05:21:40Z"
      },
      "pending_approval_count": 1
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

---

### `POST /api/v1/workspaces`

workspace を作成する。

#### request

```json
{
  "workspace_name": "alpha"
}
```

#### response `201 Created`

```json
{
  "workspace_id": "ws_alpha",
  "workspace_name": "alpha",
  "directory_name": "alpha",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:12:34Z",
  "active_session_id": null,
  "active_session_summary": null,
  "pending_approval_count": 0
}
```

#### errors

- `404 workspace_root_not_found`
- `409 workspace_name_conflict`
- `409 workspace_name_normalized_conflict`
- `422 workspace_name_invalid`
- `422 workspace_name_reserved`

---

### `GET /api/v1/workspaces/{workspace_id}`

workspace summary を返す。

#### response

```json
{
  "workspace_id": "ws_alpha",
  "workspace_name": "alpha",
  "directory_name": "alpha",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:22:00Z",
  "active_session_id": "thread_001",
  "active_session_summary": {
    "session_id": "thread_001",
    "status": "running",
    "last_message_at": "2026-03-27T05:21:40Z"
  },
  "pending_approval_count": 1
}
```

#### errors

- `404 workspace_not_found`

---

## 11.2 Session 系

### `GET /api/v1/workspaces/{workspace_id}/sessions`

workspace 配下の session 一覧を返す。

#### query

- `limit` 任意。既定 20
- `cursor` 任意
- `sort` 任意。既定 `-updated_at`

#### allowed sort values

- `updated_at`
- `-updated_at`

#### paging / sort rules

- `sort=updated_at` の場合、順序は `updated_at asc, session_id asc`
- `sort=-updated_at` の場合、順序は `updated_at desc, session_id desc`
- cursor paging では指定 sort に対応する上記の安定順序を前提とする

#### response

```json
{
  "items": [
    {
      "session_id": "thread_001",
      "workspace_id": "ws_alpha",
      "title": "Fix build error",
      "status": "waiting_input",
      "created_at": "2026-03-27T05:12:34Z",
      "updated_at": "2026-03-27T05:22:00Z",
      "started_at": "2026-03-27T05:13:00Z",
      "last_message_at": "2026-03-27T05:21:40Z",
      "active_approval_id": null,
      "current_turn_id": null,
      "app_session_overlay_state": "open"
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

---

### `POST /api/v1/workspaces/{workspace_id}/sessions`

session を作成する。

#### semantics

- native thread を作成する
- App-owned session overlay を `created` で保存する
- 返却される `session_id` は native thread ID である
- 同一 workspace に active session が存在していても `create` 自体は許可する

#### request

```json
{
  "title": "Fix build error"
}
```

#### response `201 Created`

```json
{
  "session_id": "thread_001",
  "workspace_id": "ws_alpha",
  "title": "Fix build error",
  "status": "created",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:12:34Z",
  "started_at": null,
  "last_message_at": null,
  "active_approval_id": null,
  "current_turn_id": null,
  "app_session_overlay_state": "open"
}
```

#### errors

- `404 workspace_not_found`
- `422 session_title_invalid`

---

### `GET /api/v1/sessions/{session_id}`

session 詳細を返す。

#### response

```json
{
  "session_id": "thread_001",
  "workspace_id": "ws_alpha",
  "title": "Fix build error",
  "status": "waiting_input",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:22:00Z",
  "started_at": "2026-03-27T05:13:00Z",
  "last_message_at": "2026-03-27T05:21:40Z",
  "active_approval_id": null,
  "current_turn_id": null,
  "app_session_overlay_state": "open"
}
```

#### errors

- `404 session_not_found`

---

### `POST /api/v1/sessions/{session_id}/start`

session を開始する。

#### semantics

- native 1:1 primitive ではない
- App-owned 公開状態の初期化と active 制約確立を行う façade action
- native side で bootstrap が必要な場合は runtime が内部的に処理してよい

#### request

```json
{}
```

#### response

```json
{
  "session_id": "thread_001",
  "workspace_id": "ws_alpha",
  "title": "Fix build error",
  "status": "running",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:13:00Z",
  "started_at": "2026-03-27T05:13:00Z",
  "last_message_at": null,
  "active_approval_id": null,
  "current_turn_id": "turn_001",
  "app_session_overlay_state": "open"
}
```

#### errors

- `404 session_not_found`
- `409 session_invalid_state`
- `409 session_conflict_active_exists`

---

### `POST /api/v1/sessions/{session_id}/stop`

session を停止する。

#### behavior

- `running` で stop した場合、active native turn / execution を cancel / interrupt する
- `waiting_input` で stop した場合、App-owned session overlay を `stopped` にする
- `waiting_approval` で stop した場合、関連 approval は `canceled` に遷移する
- stop 後の session では `active_approval_id` は `null` とする
- `canceled_approval` は、stop 対象 session に active pending approval が存在した場合のみ非 `null` とする
- active pending approval が存在しない stop では、`canceled_approval` は `null` または省略可とする

#### request

```json
{}
```

#### response

```json
{
  "session": {
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "title": "Fix build error",
    "status": "stopped",
    "created_at": "2026-03-27T05:12:34Z",
    "updated_at": "2026-03-27T05:24:00Z",
    "started_at": "2026-03-27T05:13:00Z",
    "last_message_at": "2026-03-27T05:23:00Z",
    "active_approval_id": null,
    "current_turn_id": null,
    "app_session_overlay_state": "closed"
  },
  "canceled_approval": {
    "approval_id": "req_001",
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "status": "canceled",
    "resolution": "canceled",
    "approval_category": "external_side_effect",
    "summary": "Run git push",
    "reason": "Codex requests permission to push changes to remote.",
    "operation_summary": "git push origin main",
    "created_at": "2026-03-27T05:18:00Z",
    "resolved_at": "2026-03-27T05:24:00Z",
    "native_request_kind": "approval_request"
  }
}
```

#### errors

- `404 session_not_found`
- `409 session_invalid_state`

---

## 11.3 Message 系

### `GET /api/v1/sessions/{session_id}/messages`

message projection 履歴を返す。

#### semantics

- App Server item history のうち message 系 item を投影した結果を返す
- runtime は native history から都度構築してもよいし、projection cache を利用してもよい

#### query

- `limit` 任意。既定 100
- `cursor` 任意
- `sort` 任意。既定 `created_at`

#### allowed sort values

- `created_at`
- `-created_at`

#### paging / sort rules

- `sort=created_at` の場合、順序は `created_at asc, message_id asc`
- `sort=-created_at` の場合、順序は `created_at desc, message_id desc`
- cursor paging では指定 sort に対応する上記の安定順序を前提とする

#### response

```json
{
  "items": [
    {
      "message_id": "item_user_001",
      "session_id": "thread_001",
      "role": "user",
      "content": "Please fix the build error.",
      "created_at": "2026-03-27T05:14:00Z",
      "source_item_type": "user_message"
    },
    {
      "message_id": "item_agent_001",
      "session_id": "thread_001",
      "role": "assistant",
      "content": "I inspected the logs and updated the config.",
      "created_at": "2026-03-27T05:21:40Z",
      "source_item_type": "agent_message"
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

#### errors

- `404 session_not_found`

---

### `POST /api/v1/sessions/{session_id}/messages`

user message を受理する。

#### semantics

- native thread に対して新しい turn を開始し、user message item を送信する
- 返却される `message_id` は user message item の native item ID を用いる
- assistant 生成と stream 配信は非同期継続する
- 同一 workspace に別 active session が存在し、対象 session の `waiting_input -> running` 遷移を許可できない場合は `409 session_conflict_active_exists` とする
- `client_message_id` は必須の冪等性キーとする
- 同じ `session_id` と `client_message_id` で request body が同一なら、既存結果を返す冪等成功を許容する
- 同じ key で `content` など request body が異なる場合は `409 message_idempotency_conflict` とする

#### request

```json
{
  "client_message_id": "msgclient_20260331_0001",
  "content": "Please explain the diff."
}
```

#### response `202 Accepted`

```json
{
  "message_id": "item_user_002",
  "session_id": "thread_001",
  "role": "user",
  "content": "Please explain the diff.",
  "created_at": "2026-03-27T05:23:00Z",
  "source_item_type": "user_message"
}
```

#### errors

- `404 session_not_found`
- `409 session_invalid_state`
- `409 session_conflict_active_exists`
- `409 message_idempotency_conflict`
- `422 message_content_invalid`

必要に応じて `details.current_status` を返してよい。
`409 session_conflict_active_exists` の場合、必要に応じて `details.active_session_id` を返してよい。

---

## 11.4 Event / Stream 系

### `GET /api/v1/sessions/{session_id}/events`

session の activity / event projection を返す。

#### semantics

- native thread / turn / item / request 通知を BFF 向けに整形した安定 event projection を返す
- raw native event の完全 mirror を返す API ではない

#### query

- `limit` 任意。既定 100
- `cursor` 任意
- `sort` 任意。既定 `occurred_at`

#### allowed sort values

- `occurred_at`
- `-occurred_at`

#### paging / sort rules

- `sort=occurred_at` の場合、順序は `occurred_at asc, sequence asc, event_id asc`
- `sort=-occurred_at` の場合、順序は `occurred_at desc, sequence desc, event_id desc`
- cursor paging では指定 sort に対応する上記の安定順序を前提とする
- session event resource の `occurred_at` は、同一 session 内では `sequence` と同順の単調非減少でなければならない

#### response

```json
{
  "items": [
    {
      "event_id": "evt_001",
      "session_id": "thread_001",
      "event_type": "session.status_changed",
      "sequence": 1,
      "occurred_at": "2026-03-27T05:13:00Z",
      "payload": {
        "from_status": "created",
        "to_status": "running"
      },
      "native_event_name": "turn/started"
    },
    {
      "event_id": "evt_002",
      "session_id": "thread_001",
      "event_type": "approval.requested",
      "sequence": 8,
      "occurred_at": "2026-03-27T05:18:00Z",
      "payload": {
        "approval_id": "req_001",
        "summary": "Run git push"
      },
      "native_event_name": "request/started"
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

#### errors

- `404 session_not_found`

---

### `GET /api/v1/sessions/{session_id}/stream`

session 専用 SSE stream。

#### SSE envelope

```json
{
  "event_id": "evt_001",
  "session_id": "thread_001",
  "event_type": "message.assistant.delta",
  "sequence": 12,
  "occurred_at": "2026-03-27T05:20:10Z",
  "payload": {
    "message_id": "item_agent_003",
    "delta": "Updated the config"
  },
  "native_event_name": "item/agent_message/delta"
}
```

#### 備考

- `sequence` は必須
- runtime が internal session stream 用に採番する
- keepalive は comment line または keepalive event を許容する
- `Last-Event-ID` による replay は提供しない
- raw native event 名は `native_event_name` で保持してよいが、クライアントは `event_type` を正本とする

---

## 11.5 Approval 系

### `GET /api/v1/approvals`

approval projection 一覧を返す。

#### semantics

- native request flow を WebUI resource に投影した一覧
- global approval 画面と badge 更新用の正本

#### query

- `status` 任意。既定 `pending`
- `workspace_id` 任意
- `limit` 任意。既定 50
- `cursor` 任意
- `sort` 任意。既定 `-created_at`

#### allowed sort values

- `created_at`
- `-created_at`

#### paging / sort rules

- `sort=created_at` の場合、順序は `created_at asc, approval_id asc`
- `sort=-created_at` の場合、順序は `created_at desc, approval_id desc`
- cursor paging では指定 sort に対応する上記の安定順序を前提とする

#### response

```json
{
  "items": [
    {
      "approval_id": "req_001",
      "session_id": "thread_001",
      "workspace_id": "ws_alpha",
      "status": "pending",
      "resolution": null,
      "approval_category": "external_side_effect",
      "summary": "Run git push",
      "reason": "Codex requests permission to push changes to remote.",
      "operation_summary": "git push origin main",
      "created_at": "2026-03-27T05:18:00Z",
      "resolved_at": null,
      "native_request_kind": "approval_request"
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

---

### `GET /api/v1/approvals/{approval_id}`

approval 詳細を返す。

#### response

```json
{
  "approval_id": "req_001",
  "session_id": "thread_001",
  "workspace_id": "ws_alpha",
  "status": "pending",
  "resolution": null,
  "approval_category": "external_side_effect",
  "summary": "Run git push",
  "reason": "Codex requests permission to push changes to remote.",
  "operation_summary": "git push origin main",
  "context": {
    "command": "git push origin main"
  },
  "created_at": "2026-03-27T05:18:00Z",
  "resolved_at": null,
  "native_request_kind": "approval_request"
}
```

#### errors

- `404 approval_not_found`

---

### `POST /api/v1/approvals/{approval_id}/resolve`

approval を解決する internal 専用 action。

#### semantics

- native request に対する client response を返す façade action
- `approved` は native allow 相当
- `denied` は native deny 相当
- 既に同じ resolution が確定している場合は、最新状態を返す冪等成功を許容する

#### request

```json
{
  "resolution": "approved"
}
```

または

```json
{
  "resolution": "denied"
}
```

#### response

```json
{
  "approval": {
    "approval_id": "req_001",
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "status": "approved",
    "resolution": "approved",
    "approval_category": "external_side_effect",
    "summary": "Run git push",
    "reason": "Codex requests permission to push changes to remote.",
    "operation_summary": "git push origin main",
    "created_at": "2026-03-27T05:18:00Z",
    "resolved_at": "2026-03-27T05:19:00Z",
    "native_request_kind": "approval_request"
  },
  "session": {
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "title": "Fix build error",
    "status": "running",
    "created_at": "2026-03-27T05:12:34Z",
    "updated_at": "2026-03-27T05:19:00Z",
    "started_at": "2026-03-27T05:13:00Z",
    "last_message_at": "2026-03-27T05:18:00Z",
    "active_approval_id": null,
    "current_turn_id": "turn_009",
    "app_session_overlay_state": "open"
  }
}
```

#### errors

- `404 approval_not_found`
- `409 approval_not_pending`
- `422 approval_resolution_invalid`

---

### `GET /api/v1/approvals/summary`

Home 集約用の global summary を返す。

#### response

```json
{
  "pending_approval_count": 2,
  "updated_at": "2026-03-27T05:22:00Z"
}
```

---

### `GET /api/v1/approvals/stream`

approval global SSE stream。

#### SSE envelope

```json
{
  "event_id": "evt_apr_001",
  "session_id": "thread_001",
  "event_type": "approval.requested",
  "occurred_at": "2026-03-27T05:18:00Z",
  "payload": {
    "approval_id": "req_001",
    "workspace_id": "ws_alpha",
    "summary": "Run git push",
    "approval_category": "external_side_effect"
  },
  "native_event_name": "request/started"
}
```

#### 備考

- global approval stream では `sequence` は必須としない
- 順序の正本は transport 到着順ではなく REST 再取得で補正する

---

## 12. internal schema と public schema の対応

## 12.1 基本方針

- internal schema と public schema は完全一致を前提としない
- `frontend-bff` が field mapping と不要フィールドのマスクを担当する
- action endpoint は極力 internal / public の shape を寄せる
- read model は UI 都合で差分を許容する
- ID は可能な限り native ID を流用し、internal/public で一致させる

## 12.2 Workspace の対応

| internal | public | 備考 |
|---|---|---|
| `workspace_id` | `workspace_id` | そのまま使用 |
| `workspace_name` | `workspace_name` | そのまま使用 |
| `created_at` | `created_at` | そのまま使用 |
| `updated_at` | `updated_at` | 集約時刻として整合させる |
| `active_session_summary` | `active_session_summary` | そのまま使用可能 |
| `pending_approval_count` | `pending_approval_count` | そのまま使用 |
| `directory_name` | なし | public へは露出しない |
| `active_session_id` | なし | BFF が必要に応じ内部利用 |

## 12.3 Session の対応

| internal | public | 備考 |
|---|---|---|
| `session_id` | `session_id` | native thread ID をそのまま使用 |
| `workspace_id` | `workspace_id` | そのまま使用 |
| `title` | `title` | そのまま使用 |
| `status` | `status` | そのまま使用 |
| `created_at` | `created_at` | そのまま使用 |
| `updated_at` | `updated_at` | そのまま使用 |
| `started_at` | `started_at` | そのまま使用 |
| `last_message_at` | `last_message_at` | そのまま使用 |
| `active_approval_id` | `active_approval_id` | そのまま使用 |
| `current_turn_id` | なし | public へは露出しない |
| `app_session_overlay_state` | なし | public へは露出しない |
| なし | `can_send_message` | BFF が `status` から導出 |
| なし | `can_start` | BFF が `status` と active 制約から導出 |
| なし | `can_stop` | BFF が `status` から導出 |

## 12.4 Message の対応

| internal | public | 備考 |
|---|---|---|
| `message_id` | `message_id` | native message item ID をそのまま使用 |
| `session_id` | `session_id` | thread ID をそのまま使用 |
| `role` | `role` | そのまま使用 |
| `content` | `content` | そのまま使用 |
| `created_at` | `created_at` | そのまま使用 |
| `source_item_type` | なし | public へは通常露出しない |

## 12.5 Approval の対応

| internal | public | 備考 |
|---|---|---|
| `approval_id` | `approval_id` | native request ID を優先使用 |
| `session_id` | `session_id` | そのまま使用 |
| `workspace_id` | `workspace_id` | そのまま使用 |
| `status` | `status` | そのまま使用 |
| `resolution` | `resolution` | そのまま使用 |
| `approval_category` | `approval_category` | そのまま使用 |
| `summary` | `title` | 名称変換 |
| `reason` | `description` | 名称変換 |
| `created_at` | `requested_at` | 名称変換 |
| `resolved_at` | `resolved_at` | そのまま使用 |
| `operation_summary` | `operation_summary` | 詳細 API では露出可。summary/list では省略可 |
| `context` | `context` | 詳細 API でのみ露出可 |
| `native_request_kind` | なし | public へは通常露出しない |

## 12.6 Event の対応

| internal | public | 備考 |
|---|---|---|
| `event_id` | `event_id` | そのまま使用 |
| `session_id` | `session_id` | そのまま使用 |
| `event_type` | `event_type` | そのまま使用 |
| `sequence` | `sequence` | session stream でそのまま使用 |
| `occurred_at` | `occurred_at` | そのまま使用 |
| `payload` | `payload` | そのまま使用 |
| `native_event_name` | なし | public へは通常露出しない |

## 12.7 Home の対応

public:

- `GET /api/v1/home`

internal:

- `GET /api/v1/workspaces`
- `GET /api/v1/approvals/summary`

BFF はこれらを合成して以下を返す。

```json
{
  "workspaces": [],
  "pending_approval_count": 0,
  "updated_at": "2026-03-27T05:22:00Z"
}
```

## 12.8 Approval action の対応

public:

- `POST /api/v1/approvals/{approval_id}/approve`
- `POST /api/v1/approvals/{approval_id}/deny`

internal:

- `POST /api/v1/approvals/{approval_id}/resolve`

BFF は `approve -> {"resolution":"approved"}`、  
`deny -> {"resolution":"denied"}` に変換する。

## 12.9 stop response の対応

public では `session` と `canceled_approval` を返す。  
internal でも同 shape を維持し、BFF の変換負担を減らす。

`canceled_approval` は、active pending approval を stop により `canceled` 解決した場合のみ非 `null` とする。  
approval 取り消しを伴わない stop では、`canceled_approval` は `null` または省略可とする。

---

## 13. エラー仕様

## 13.1 共通 envelope

```json
{
  "error": {
    "code": "session_conflict_active_exists",
    "message": "another active session already exists in this workspace",
    "details": {
      "workspace_id": "ws_alpha",
      "active_session_id": "thread_999"
    }
  }
}
```

## 13.2 HTTP ステータス

- `400 Bad Request`
- `404 Not Found`
- `409 Conflict`
- `422 Unprocessable Entity`
- `500 Internal Server Error`
- `503 Service Unavailable`

## 13.3 主な error.code

### workspace

- `workspace_not_found`
- `workspace_root_not_found`
- `workspace_name_invalid`
- `workspace_name_reserved`
- `workspace_name_conflict`
- `workspace_name_normalized_conflict`

### session

- `session_not_found`
- `session_invalid_state`
- `session_conflict_active_exists`
- `session_title_invalid`
- `message_content_invalid`
- `message_idempotency_conflict`
- `session_runtime_error`

### approval

- `approval_not_found`
- `approval_not_pending`
- `approval_resolution_invalid`

---

## 14. 実装メモ

- active session 制約の最終保証は `codex-runtime` 側に置く
- workspace 単位で排他制御できる設計が望ましい
- App Server thread history を可能な限り正本とする
- message / approval / event は native primitive から projection して構築する
- `message.assistant.delta` は stream 向け transient event として扱ってよい
- `message.assistant.completed` は message projection の確定イベントとする
- BFF は event の再採番を行わない
- BFF は Home 集約以外では極力 domain shape を崩さない
- public API に不要な internal field は BFF でマスクする
- `session start` は native strict primitive ではなく App-owned façade action として実装してよい
- `sequence` は native protocol に相当概念がない場合、runtime が session stream 用に付与してよい
- approval に native stable ID がない場合は、runtime が request projection 用の stable key を付与する

---

## 15. 未確定事項

- App Server running version が実際に返す `turn_id` / request ID / event ID の安定性
- raw native event をどこまで projection せずに流用できるか
- `session start` を bootstrap turn で実装するか、純粋な App-owned state transition とするか
- `completed` / `failed` / `stopped` を thread façade 上でどう明示的にマークするか
- projection cache の保持期間と再構築方針
- `system` role item を将来 public / internal message projection に含めるか
- pagination の既定 `limit` 最終値

---

## 16. 最小サマリ

本 internal API 仕様の要点は以下。

- runtime を App 固有状態と projection の system of record とする
- conversation native history の正本は App Server thread / turn / item に委ねる
- `workspace` は App 固有 resource とする
- `session` は App Server thread の façade とする
- `message` は item の message 系部分集合 projection とする
- `approval` は native request flow の façade とする
- session / approval / message / stop の複合操作は runtime が原子的に扱う
- internal schema と public schema の対応は BFF が明示的に担う
- 可能な限り native ID を流用し、不要な WebUI 独自採番は避ける
- `session create` は active session 制約を理由に拒否しない
- `sequence` は session stream に対してのみ安定連番として扱い、global approval stream では必須としない


---

## 17. 本版で固定した追加ルール（v0.7）

- `completed` は runtime / app-server 側が session 終端と判断した場合のみ用いる
- 1 turn 完了は原則 `waiting_input`
- 1 session あたり同時 pending approval は 1 件まで
- native 側の会話事実は App Server 正本、公開状態・overlay・stable approval ID・sequence は app-owned 正本
- 複合操作は成功境界と partial failure 補償を明示し、再整合で収束させる
- `POST /sessions/{session_id}/messages` は `client_message_id` による重複抑止を前提とする
- `start` / `stop` / `resolve` は再送時の冪等成功を許容する
