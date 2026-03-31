# Codex WebUI 公開 API 仕様書 v0.6

## 1. 文書の目的

本仕様は、Codex WebUI MVP における **公開 API** の契約を定義する。  
対象は `frontend-bff` が同一オリジンで提供する以下の 3 系統である。

- REST API
- SSE stream
- ブラウザ向けの公開データ形状

本仕様は UI 実装および内部 API 設計の基準とする。  
内部都合よりも、**Home / Chat / Approval の 3 画面がスマホで成立すること** を優先する。

本版では、Codex App Server の **Thread / Turn / Item / request flow** を前提に、公開 API の各 resource が native primitive そのものなのか、あるいは WebUI 向けの façade / projection なのかを明確にする。

---

## 2. 適用範囲と前提

### 2.1 適用範囲

本仕様は `/api/v1` 配下の公開 API に適用する。

### 2.2 前提

- 公開境界は `frontend-bff` のみ
- `codex-runtime` は外部公開しない
- 単一ユーザー前提
- 認証・認可は Dev Tunnels 側に委譲し、アプリ独自認証は MVP では提供しない
- 初期表示は REST、差分更新は SSE とする
- SSE 再接続後の整合は REST 再取得で行う
- 対象 workspace は `/workspaces` 配下に限定する
- Codex App Server は、会話の native primitive として **thread / turn / item** を持つ前提で扱う

### 2.3 非対象

- 内部 API の仕様固定
- 完全 replay を伴うイベント再送
- 多人数共有向けの権限制御
- workspace rename / delete
- session delete / archive
- App Server の native protocol 全体の公開

---

## 3. 設計方針

### 3.1 バージョン

公開 API の基底パスは以下とする。

```text
/api/v1
```

### 3.2 データ形式

- Content-Type は JSON を基本とする
- SSE は `text/event-stream` を用いる
- JSON フィールド名および query parameter 名は `snake_case` とする
- 日時は UTC RFC 3339 文字列、末尾 `Z` とする
- API に露出する ID は opaque string とする

### 3.3 公開 API における resource 方針

公開 API の resource は 3 種に分かれる。

1. **App 固有 resource**
   - 例: `workspace`
   - WebUI / runtime 側で正本を持つ

2. **native 寄り resource**
   - 例: `session`
   - App Server の native primitive に強く対応する

3. **façade / projection resource**
   - 例: `message`, `approval`, `home`
   - native primitive や内部イベントを UI 向けに整形した読み取りモデル

### 3.4 App Server との整合原則

本仕様では、以下を原則とする。

- `workspace` は App 側 resource とする
- `session` は **App Server thread の公開 façade** として扱う
- `message` は **App Server item のうち message 系 item を投影した resource** として扱う
- `approval` は **App Server の server-initiated request / approval flow を投影した resource** として扱う
- SSE の `event_type` は UI 向けの façade event であり、native event 名と 1:1 対応を保証しない

### 3.5 正常レスポンス方針

正常レスポンスの最外殻に共通 `data` envelope は設けない。

- 単体取得は resource object を直接返す
- 一覧取得は `items` / `next_cursor` / `has_more` を用いる
- 画面初期化用の集約 endpoint は、用途に応じた named field を直接返す

この方針により、Home の集約レスポンスや Chat の復元レスポンスを素直に表現できる。

---

## 4. ID 方針

### 4.1 Workspace

- `workspace_id` は App 側で管理する opaque ID とする
- `workspace_id` は App Server native ID ではない

### 4.2 Session

- `session_id` は **App Server thread ID** を採用する
- 公開 API の `session_id` は、原則として native thread を直接参照する識別子とする

### 4.3 Message

- `message_id` は **message として公開する item の native item ID** を採用する
- すべての item が message ではない
- 公開 API における `message` は、item の部分集合である

### 4.4 Approval

- `approval_id` は、native request / approval に stable ID がある場合はそれを採用する
- native に stable ID がない場合に限り、BFF / runtime 側の stable ID を許容する

### 4.5 Event

- `event_id` は、公開 SSE event を一意識別できればよい
- native event をほぼそのまま中継する場合は native event ID を流用してよい
- BFF が複数 native event を再構成して 1 つの公開 event にする場合は、公開 event 用の opaque ID を付与してよい

---

## 5. 画面と公開 API の対応

### 5.1 Home

Home 画面では以下を扱う。

- workspace 一覧
- 各 workspace の active session 要約
- pending approval 件数
- workspace 作成

### 5.2 Chat

Chat 画面では以下を扱う。

- session 一覧
- session 作成
- session 開始
- session 詳細
- message 履歴
- activity/event 履歴
- message 送信
- session 停止
- session 用 SSE stream

### 5.3 Approval

Approval 画面では以下を扱う。

- pending approval 一覧
- approval 詳細
- approve / deny
- approval 用 SSE stream

---

## 6. ドメインモデル

### 6.1 Workspace

```json
{
  "workspace_id": "ws_xxx",
  "workspace_name": "example_workspace",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:12:34Z",
  "active_session_summary": {
    "session_id": "thread_abc123",
    "status": "running",
    "last_message_at": "2026-03-27T05:20:00Z"
  },
  "pending_approval_count": 1
}
```

#### 補足

- `workspace` は App 固有 resource である
- `updated_at` は、workspace 自身に加えて配下 session / approval の状態変化を含む集約時刻として扱う
- `active_session_summary` は **active な session が存在する場合のみ** 非 `null` とする

### 6.2 Session

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
  "can_send_message": true,
  "can_start": false,
  "can_stop": true
}
```

#### 補足

- `session` は **App Server thread の公開 façade** とする
- `session_id` は native thread ID を用いる
- `can_send_message` / `can_start` / `can_stop` は UI 補助フィールドであり、BFF が公開状態から導出する
- `status` は WebUI の公開状態であり、native thread / turn lifecycle を UI 向けに要約したものである

### 6.3 Message

```json
{
  "message_id": "item_msg_001",
  "session_id": "thread_abc123",
  "role": "assistant",
  "content": "I updated the config file.",
  "created_at": "2026-03-27T05:21:40Z"
}
```

#### 補足

- `message` は **item のうち chat bubble として表示すべきものだけを抽出した projection** とする
- `message_id` は公開対象となる message 系 item の native item ID を優先採用する
- tool execution, diff, approval request などの item は、原則として `message` resource ではなく `events` や `approval` で扱う
- public `/messages` に `system` role を含めるかは将来拡張とし、MVP では `user` / `assistant` を前提とする

### 6.4 ApprovalSummary

```json
{
  "approval_id": "req_001",
  "session_id": "thread_abc123",
  "workspace_id": "ws_xxx",
  "status": "pending",
  "resolution": null,
  "approval_category": "external_side_effect",
  "title": "Run git push",
  "description": "Codex requests permission to push changes to remote.",
  "requested_at": "2026-03-27T05:18:00Z",
  "resolved_at": null
}
```

#### 補足

- `approval` は **native approval / input request flow の公開 façade** とする
- `approval_id` は native request ID がある場合はそれを優先採用する
- `approval_category` / `title` / `description` は UI 表示に適した公開名である
- `approval_category` は MVP では固定し、将来拡張時は後方互換な enum 追加のみ検討する

### 6.5 ApprovalDetail

```json
{
  "approval_id": "req_001",
  "session_id": "thread_abc123",
  "workspace_id": "ws_xxx",
  "status": "pending",
  "resolution": null,
  "approval_category": "external_side_effect",
  "title": "Run git push",
  "description": "Codex requests permission to push changes to remote.",
  "operation_summary": "git push origin main",
  "requested_at": "2026-03-27T05:18:00Z",
  "resolved_at": null,
  "context": {
    "command": "git push origin main"
  }
}
```

#### 補足

- 一覧では `ApprovalSummary` を返し、詳細では `ApprovalDetail` を返す
- `operation_summary` と `context` は詳細 API で露出する

### 6.6 Session Status Enum

- `created`
- `running`
- `waiting_input`
- `waiting_approval`
- `completed`
- `failed`
- `stopped`

#### 補足

- これは公開 API の UI 向け状態であり、native thread / turn / item の状態をそのまま露出するものではない
- `created` は session resource 作成直後の公開状態である
- `running` は native turn 実行中を含む公開上の進行状態である
- `waiting_input` は通常メッセージを送信できる対話待機状態である
- `waiting_approval` は native request への client 応答待ちを含む公開状態である
- `failed` は runtime が **同一 session の継続を打ち切るべき実行失敗** と判断した場合にのみ遷移する
- turn 単位の一時的失敗で、利用者が同一 session で再試行可能な場合は `error.raised` を返しつつ `waiting_input` へ戻してよい
- `stopped` は利用者またはシステムによる **停止意思に基づく終端状態** である

### 6.7 Approval Status Enum

- `pending`
- `approved`
- `denied`
- `canceled`

### 6.8 Approval Resolution Enum

- `approved`
- `denied`
- `canceled`

`status` は approval resource の現在状態を表す。  
`resolution` は解決済み approval の解決結果を表し、`pending` の間は `null` とする。

---

## 7. Native primitive と公開 resource の対応

| 公開概念 | Native 対応 | 種別 | 備考 |
|---|---|---|---|
| `workspace` | なし | App 固有 | App / runtime 側で正本を持つ |
| `session` | `thread` | façade | session_id は thread ID |
| `session start` | native 1:1 ではない | façade action | thread 活性化・公開状態初期化・必要な bootstrap を含んでよい |
| `message` | `item` の部分集合 | projection | chat bubble 表示対象のみ |
| `approval` | server-initiated request flow | façade | native request を UI resource 化 |
| session stream | thread / turn / item 通知群 | façade stream | UI 向けに整形してよい |
| approval stream | request / resolution 通知群 | façade stream | global approval 更新用 |

---

## 8. 状態制約

### 8.1 active session 制約

同一 workspace において、同時に active とみなされる session は 1 つまでとする。

MVP における active は以下とする。

- `running`
- `waiting_approval`

以下は active ではない。

- `created`
- `waiting_input`
- `completed`
- `failed`
- `stopped`

### 8.2 message 送信制約

`POST /sessions/{session_id}/messages` は、原則として `waiting_input` の session に対してのみ受け付ける。

主な拒否条件:

- `created`
- `running`
- `waiting_approval`
- `completed`
- `failed`
- `stopped`

### 8.3 approval 制約

approve / deny は `pending` approval に対してのみ実行できる。  
既に解決済みの場合は、**同一操作の再送**であれば最新状態を返してよく、別操作であれば `409 Conflict` とする。

加えて、MVP では以下を制約とする。

- 1 session あたり同時 pending approval は高々 1 件
- `active_approval_id` はその単一 pending approval を指す
- approval 実行前に、クライアントは少なくとも `approval_category`、`title`、`description`、`operation_summary`、`requested_at` または同等情報を確認可能でなければならない
- 一覧だけでは確認情報が不足する場合、クライアントは `GET /approvals/{approval_id}` を先に取得する

### 8.4 session 状態遷移

MVP における session の基本遷移は以下とする。

- `created -> running`
- `running -> waiting_input`
- `running -> waiting_approval`
- `running -> completed`
- `running -> failed`
- `running -> stopped`
- `waiting_input -> running`
- `waiting_input -> stopped`
- `waiting_approval -> running`  
  承認時。approval は `approved` となる
- `waiting_approval -> waiting_input`  
  拒否時。approval は `denied` となる
- `waiting_approval -> stopped`  
  stop 時。approval は `canceled` となる

以下は終端状態とする。

- `completed`
- `failed`
- `stopped`

`waiting_input` は、assistant 応答が一旦完了し、**次のユーザー入力を受け付ける継続可能状態**である。  
`completed` は、runtime がその session を **WebUI 上の終端状態** と判断し、以後 `POST /sessions/{session_id}/messages` を受け付けない状態である。

補足:
- 単なる 1 turn の完了は原則として `waiting_input` に戻す
- runtime / app-server 側で「この session は完了した」と判断できる場合に限り `completed` へ遷移してよい
- `completed` になった session は、新規 session 作成の起点としては参照できても、同一 `session_id` の再開は行わない
- `failed` は runtime が **同一 session の継続を打ち切るべき実行失敗** と判断した場合にのみ用いる
- turn 単位の一時的失敗で同一 session を継続可能な場合は、`error.raised` を通知しつつ `waiting_input` へ戻してよい
- `stopped` は利用者またはシステムによる停止意思に基づく終端としてのみ用いる

### 8.5 `can_*` 導出ルール

- `can_send_message = true` の条件: `status == waiting_input`
- `can_start = true` の条件: `status == created` かつ 同一 workspace に別 active session が存在しない
- `can_stop = true` の条件: `status in {running, waiting_input, waiting_approval}`

## 9. REST API 一覧

### 9.1 Home 系

#### 9.1.1 GET `/api/v1/home`

Home 画面の初期表示に必要な集約データを返す。

##### response

```json
{
  "workspaces": [
    {
      "workspace_id": "ws_alpha",
      "workspace_name": "alpha",
      "created_at": "2026-03-27T05:12:34Z",
      "updated_at": "2026-03-27T05:22:00Z",
      "active_session_summary": {
        "session_id": "thread_001",
        "status": "running",
        "last_message_at": "2026-03-27T05:21:40Z"
      },
      "pending_approval_count": 1
    }
  ],
  "pending_approval_count": 2,
  "updated_at": "2026-03-27T05:22:00Z"
}
```

##### notes

- Home 初期描画のための集約 endpoint として許容する
- MVP では件数が少ない前提のため、paging は設けない

---

#### 9.1.2 GET `/api/v1/workspaces`

workspace 一覧を返す。

##### query

- `sort` 任意。既定は `-updated_at`
- `limit` 任意。既定 100
- `cursor` 任意

##### allowed sort values

- `updated_at`
- `-updated_at`

##### paging / sort rules

- `sort=updated_at` の場合、順序は `updated_at asc, workspace_id asc`
- `sort=-updated_at` の場合、順序は `updated_at desc, workspace_id desc`
- cursor paging では指定 sort に対応する上記の安定順序を前提とする

##### response

```json
{
  "items": [
    {
      "workspace_id": "ws_alpha",
      "workspace_name": "alpha",
      "created_at": "2026-03-27T05:12:34Z",
      "updated_at": "2026-03-27T05:22:00Z",
      "active_session_summary": null,
      "pending_approval_count": 0
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

---

#### 9.1.3 POST `/api/v1/workspaces`

workspace を新規作成する。

##### request body

```json
{
  "workspace_name": "alpha"
}
```

##### validation

- 空文字不可
- 長さは 1 以上 64 以下
- 使用可能文字は英小文字、数字、`-`、`_`
- 先頭文字は英小文字または数字
- `.` および `..` は禁止
- `/`、`\`、空白は使用不可
- 末尾の `-`、`_` は不可
- 小文字正規化後の値で重複判定する
- 実ディレクトリ名には `workspace_name` をそのまま用いる
- 重複名不可

##### response `201 Created`

```json
{
  "workspace_id": "ws_alpha",
  "workspace_name": "alpha",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:12:34Z",
  "active_session_summary": null,
  "pending_approval_count": 0
}
```

##### errors

- `422 workspace_name_invalid`
- `422 workspace_name_reserved`
- `409 workspace_name_conflict`
- `409 workspace_name_normalized_conflict`

---

#### 9.1.4 GET `/api/v1/workspaces/{workspace_id}`

workspace 詳細を返す。

##### response

```json
{
  "workspace_id": "ws_alpha",
  "workspace_name": "alpha",
  "created_at": "2026-03-27T05:12:34Z",
  "updated_at": "2026-03-27T05:22:00Z",
  "active_session_summary": {
    "session_id": "thread_001",
    "status": "running",
    "last_message_at": "2026-03-27T05:21:40Z"
  },
  "pending_approval_count": 1
}
```

##### errors

- `404 workspace_not_found`

---

### 9.2 Chat / Session 系

#### 9.2.1 GET `/api/v1/workspaces/{workspace_id}/sessions`

指定 workspace 配下の session 一覧を返す。

##### query

- `limit` 任意。既定 20
- `cursor` 任意
- `sort` 任意。既定 `-updated_at`

##### allowed sort values

- `updated_at`
- `-updated_at`

##### paging / sort rules

- `sort=updated_at` の場合、順序は `updated_at asc, session_id asc`
- `sort=-updated_at` の場合、順序は `updated_at desc, session_id desc`
- cursor paging では指定 sort に対応する上記の安定順序を前提とする

##### response

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
      "can_send_message": true,
      "can_start": false,
      "can_stop": true
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

##### errors

- `404 workspace_not_found`

---

#### 9.2.2 POST `/api/v1/workspaces/{workspace_id}/sessions`

session を作成する。作成直後の状態は `created` とする。

##### semantics

- 新しい session resource を作成する
- 対応する native thread を確保する
- 返却される `session_id` は native thread ID とする
- この時点では通常メッセージ送信はできない
- 同一 workspace に active session が存在していても `create` 自体は許可する

##### request body

```json
{
  "title": "Fix build error"
}
```

##### response `201 Created`

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
  "can_send_message": false,
  "can_start": true,
  "can_stop": false
}
```

##### errors

- `404 workspace_not_found`
- `422 session_title_invalid`

---

#### 9.2.3 POST `/api/v1/sessions/{session_id}/start`

`created` session を開始する。

##### semantics

- 本 endpoint は **公開 façade action** である
- App Server native protocol の単一操作と 1:1 対応することを保証しない
- WebUI における active session 選択、必要な bootstrap、初期実行開始を含んでよい
- 返却直後は `running` を返してよい
- その後、初期処理完了に応じて `waiting_input` へ遷移しうる
- 既に同一 start が成功済みであれば、最新 session 状態を返す冪等成功を許容する

##### request body

空 object を許容する。

```json
{}
```

##### response

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
  "can_send_message": false,
  "can_start": false,
  "can_stop": true
}
```

##### errors

- `404 session_not_found`
- `409 session_invalid_state`
- `409 session_conflict_active_exists`

---

#### 9.2.4 GET `/api/v1/sessions/{session_id}`

session 詳細を返す。

##### response

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
  "can_send_message": true,
  "can_start": false,
  "can_stop": true
}
```

##### errors

- `404 session_not_found`

---

#### 9.2.5 GET `/api/v1/sessions/{session_id}/messages`

message 履歴を返す。Chat 本文の復元に用いる。

##### semantics

- 公開 API の `messages` は native item 全件ではない
- chat bubble として表示すべき item のみを返す

##### query

- `limit` 任意。既定 100
- `cursor` 任意
- `sort` 任意。既定 `created_at`

##### allowed sort values

- `created_at`
- `-created_at`

##### paging / sort rules

- `sort=created_at` の場合、順序は `created_at asc, message_id asc`
- `sort=-created_at` の場合、順序は `created_at desc, message_id desc`
- cursor paging では指定 sort に対応する上記の安定順序を前提とする

##### response

```json
{
  "items": [
    {
      "message_id": "item_msg_user_001",
      "session_id": "thread_001",
      "role": "user",
      "content": "Please fix the build error.",
      "created_at": "2026-03-27T05:14:00Z"
    },
    {
      "message_id": "item_msg_agent_001",
      "session_id": "thread_001",
      "role": "assistant",
      "content": "I inspected the logs and updated the config.",
      "created_at": "2026-03-27T05:21:40Z"
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

##### errors

- `404 session_not_found`

---

#### 9.2.6 GET `/api/v1/sessions/{session_id}/events`

message 以外を含む activity/event 履歴を返す。主用途は session 復元および activity log 表示である。

##### semantics

- 本 endpoint は UI 向け activity projection を返す
- payload は native thread / turn / item 通知をそのまま露出することを保証しない

##### query

- `limit` 任意。既定 100
- `cursor` 任意
- `sort` 任意。既定 `occurred_at`

##### allowed sort values

- `occurred_at`
- `-occurred_at`

##### paging / sort rules

- `sort=occurred_at` の場合、順序は `occurred_at asc, sequence asc, event_id asc`
- `sort=-occurred_at` の場合、順序は `occurred_at desc, sequence desc, event_id desc`
- cursor paging では指定 sort に対応する上記の安定順序を前提とする
- session event resource は stream と同じ session 単位 `sequence` を保持する

##### response

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
      }
    },
    {
      "event_id": "evt_002",
      "session_id": "thread_001",
      "event_type": "approval.requested",
      "sequence": 8,
      "occurred_at": "2026-03-27T05:18:00Z",
      "payload": {
        "approval_id": "req_001",
        "title": "Run git push"
      }
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

##### notes

- `messages` と `events` は分離する
- Chat バブル描画と activity log の責務を分離するためである

##### errors

- `404 session_not_found`

---

#### 9.2.7 POST `/api/v1/sessions/{session_id}/messages`

ユーザーメッセージを送信する。

##### semantics

- 公開 API では 1 件の user message 送信として見せる
- native では、新しい user input item と対応 turn 実行開始を伴ってよい
- `202 Accepted` は、message の受理・永続化と turn 開始に必要な記録までは完了していることを意味する
- `client_message_id` は必須であり、クライアントが同一送信を再試行するための冪等性キーである
- 同じ `session_id` と `client_message_id` で request body が同一なら、runtime / BFF は既存結果を返す冪等成功を許容する
- 同じ `session_id` と `client_message_id` で `content` など request body が異なる場合は `409 Conflict` とする

##### request body

```json
{
  "client_message_id": "msgclient_20260331_0001",
  "content": "Please explain the diff."
}
```

##### response `202 Accepted`

```json
{
  "message_id": "item_msg_user_002",
  "session_id": "thread_001",
  "role": "user",
  "content": "Please explain the diff.",
  "created_at": "2026-03-27T05:23:00Z"
}
```

##### errors

- `404 session_not_found`
- `409 session_invalid_state`
- `409 message_idempotency_conflict`
- `422 message_content_invalid`

##### error details

`409 session_invalid_state` の場合、`details.current_status` に現在状態を含めてよい。

---

#### 9.2.8 POST `/api/v1/sessions/{session_id}/stop`

`running` / `waiting_input` / `waiting_approval` の session を停止する。

##### behavior

- `running` で stop した場合、session は `stopped` となる
- `waiting_input` で stop した場合、session は `stopped` となる
- `waiting_approval` で stop した場合、session は `stopped` となる
- `waiting_approval` で stop した場合、関連する active approval は `canceled` に遷移し、`resolved_at` が設定される
- stop 後の session では `active_approval_id` は `null` とする
- 既に stop 済み session への同一 stop 再送は、最新停止状態を返す冪等成功を許容する

##### request body

```json
{}
```

##### response

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
    "can_send_message": false,
    "can_start": false,
    "can_stop": false
  },
  "canceled_approval": {
    "approval_id": "req_001",
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "status": "canceled",
    "resolution": "canceled",
    "approval_category": "external_side_effect",
    "title": "Run git push",
    "description": "Codex requests permission to push changes to remote.",
    "requested_at": "2026-03-27T05:18:00Z",
    "resolved_at": "2026-03-27T05:24:00Z"
  }
}
```

##### errors

- `404 session_not_found`
- `409 session_invalid_state`

---

### 9.3 Approval 系

#### 9.3.1 GET `/api/v1/approvals`

approval 一覧を返す。既定では pending のみを返し、各 item は `ApprovalSummary` とする。

##### query

- `status` 任意。既定 `pending`
- `workspace_id` 任意
- `limit` 任意。既定 50
- `cursor` 任意
- `sort` 任意。既定 `-requested_at`

##### allowed sort values

- `requested_at`
- `-requested_at`

##### paging / sort rules

- `sort=requested_at` の場合、順序は `requested_at asc, approval_id asc`
- `sort=-requested_at` の場合、順序は `requested_at desc, approval_id desc`
- cursor paging では指定 sort に対応する上記の安定順序を前提とする
- 一覧 item だけで安全確認に必要な情報が不足する場合、クライアントは詳細取得後に approve / deny を実行する

##### response

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
      "title": "Run git push",
      "description": "Codex requests permission to push changes to remote.",
      "requested_at": "2026-03-27T05:18:00Z",
      "resolved_at": null
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

##### notes

- Approval 画面は global 一覧を基本とする
- workspace 単位に絞りたい場合は query で `workspace_id` を指定する
- 本 resource は native request / approval flow の公開投影である

---

#### 9.3.2 GET `/api/v1/approvals/{approval_id}`

approval 詳細を返す。返却 shape は `ApprovalDetail` とする。

##### response

```json
{
  "approval_id": "req_001",
  "session_id": "thread_001",
  "workspace_id": "ws_alpha",
  "status": "pending",
  "resolution": null,
  "approval_category": "external_side_effect",
  "title": "Run git push",
  "description": "Codex requests permission to push changes to remote.",
  "operation_summary": "git push origin main",
  "requested_at": "2026-03-27T05:18:00Z",
  "resolved_at": null,
  "context": {
    "command": "git push origin main"
  }
}
```

##### errors

- `404 approval_not_found`

---

#### 9.3.3 POST `/api/v1/approvals/{approval_id}/approve`

approval を承認する。

##### semantics

- native request に対する allow / approve 応答を送る façade action として扱う
- 成功時は approval と session の最新状態を返す
- 同じ approve の再送で既に `approved` なら、最新状態を返す冪等成功を許容する
- 既に `denied` または `canceled` の場合は、別操作として `409 approval_not_pending` とする

##### request body

```json
{}
```

##### response

```json
{
  "approval": {
    "approval_id": "req_001",
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "status": "approved",
    "resolution": "approved",
    "approval_category": "external_side_effect",
    "title": "Run git push",
    "description": "Codex requests permission to push changes to remote.",
    "requested_at": "2026-03-27T05:18:00Z",
    "resolved_at": "2026-03-27T05:19:00Z"
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
    "can_send_message": false,
    "can_start": false,
    "can_stop": true
  }
}
```

##### errors

- `404 approval_not_found`
- `409 approval_not_pending`

---

#### 9.3.4 POST `/api/v1/approvals/{approval_id}/deny`

approval を拒否する。

##### semantics

- native request に対する deny 応答を送る façade action として扱う
- 成功時は approval と session の最新状態を返す
- 同じ deny の再送で既に `denied` なら、最新状態を返す冪等成功を許容する
- 既に `approved` または `canceled` の場合は、別操作として `409 approval_not_pending` とする

##### request body

```json
{}
```

##### response

```json
{
  "approval": {
    "approval_id": "req_001",
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "status": "denied",
    "resolution": "denied",
    "approval_category": "external_side_effect",
    "title": "Run git push",
    "description": "Codex requests permission to push changes to remote.",
    "requested_at": "2026-03-27T05:18:00Z",
    "resolved_at": "2026-03-27T05:19:00Z"
  },
  "session": {
    "session_id": "thread_001",
    "workspace_id": "ws_alpha",
    "title": "Fix build error",
    "status": "waiting_input",
    "created_at": "2026-03-27T05:12:34Z",
    "updated_at": "2026-03-27T05:19:00Z",
    "started_at": "2026-03-27T05:13:00Z",
    "last_message_at": "2026-03-27T05:18:00Z",
    "active_approval_id": null,
    "can_send_message": true,
    "can_start": false,
    "can_stop": true
  }
}
```

##### errors

- `404 approval_not_found`
- `409 approval_not_pending`

---

## 10. SSE 仕様

### 10.1 基本方針

- 初期表示は REST で取得する
- 差分更新は SSE で受ける
- SSE 再接続後は、必要に応じて REST を再取得して整合を取る
- 完全 replay は MVP では提供しない
- `Last-Event-ID` は前提にしない

### 10.2 Stream Endpoint

#### 10.2.1 GET `/api/v1/sessions/{session_id}/stream`

Chat 画面用の session 専用 stream。

用途:

- assistant 出力差分
- assistant 完了通知
- session 状態変化
- approval 発生 / 解決
- session 関連 error

#### 10.2.2 GET `/api/v1/approvals/stream`

Approval 画面およびグローバル approval バッジ更新用 stream。

用途:

- approval.requested
- approval.resolved

---

### 10.3 SSE envelope

transport 上の `data:` には以下の JSON を載せる。

#### 10.3.1 session stream envelope

```json
{
  "event_id": "evt_001",
  "session_id": "thread_001",
  "event_type": "message.assistant.delta",
  "sequence": 12,
  "occurred_at": "2026-03-27T05:20:10Z",
  "payload": {
    "message_id": "item_msg_agent_003",
    "delta": "Updated the config"
  }
}
```

#### envelope field

- `event_id`: 公開 event の一意識別子
- `session_id`: 関連 session。native thread ID を用いる
- `event_type`: UI 向け façade event 種別
- `sequence`: `GET /sessions/{session_id}/stream` における session 単位の単調増加番号
- `occurred_at`: 発生時刻
- `payload`: event 固有 payload

#### sequence の適用範囲

- `sequence` は **session stream および `GET /sessions/{session_id}/events` に共通の session 単位番号** とする
- クライアントは `(session_id, sequence)` で session stream の重複排除を行える
- 欠番や不整合を検知した場合は REST 再取得する
- global approval stream には `sequence` を必須としない

#### 10.3.2 global approval stream envelope

```json
{
  "event_id": "evt_apr_001",
  "session_id": "thread_001",
  "event_type": "approval.requested",
  "occurred_at": "2026-03-27T05:18:00Z",
  "payload": {
    "approval_id": "req_001",
    "workspace_id": "ws_alpha",
    "title": "Run git push",
    "approval_category": "external_side_effect"
  }
}
```

#### global stream の扱い

- `GET /api/v1/approvals/stream` では `sequence` を必須としない
- global approval stream の順序は transport 到着順を基本とし、再整合が必要な場合は REST 再取得で補正する

#### 備考

- 公開 SSE event は native thread / turn / item 通知の 1:1 露出を保証しない
- BFF は UI 上扱いやすい event 単位へ再構成してよい

---

### 10.4 SSE event_type 一覧

#### session 系

- `session.status_changed`

開始・停止を含む session 状態変化は、すべて `session.status_changed` で表現する。  
`from_status` / `to_status` は payload に含める。

#### message 系

- `message.user`
- `message.assistant.delta`
- `message.assistant.completed`

#### approval 系

- `approval.requested`
- `approval.resolved`

#### error 系

- `error.raised`

#### keepalive

- transport 上は comment line を用いる
- UI は keepalive をユーザー向け activity として表示しない

---

### 10.5 代表 payload

#### `message.assistant.delta`

```json
{
  "message_id": "item_msg_agent_003",
  "delta": "Updated the config"
}
```

#### `message.assistant.completed`

```json
{
  "message_id": "item_msg_agent_003",
  "content": "Updated the config and reran the build.",
  "created_at": "2026-03-27T05:20:30Z"
}
```

#### `session.status_changed`

```json
{
  "from_status": "running",
  "to_status": "waiting_input"
}
```

#### `approval.requested`

```json
{
  "approval_id": "req_001",
  "title": "Run git push",
  "approval_category": "external_side_effect"
}
```

#### `approval.resolved`

```json
{
  "approval_id": "req_001",
  "resolution": "approved",
  "resolved_at": "2026-03-27T05:19:00Z"
}
```

#### `error.raised`

```json
{
  "code": "session_runtime_error",
  "message": "codex runtime exited unexpectedly"
}
```

---

## 11. エラーレスポンス

### 11.1 共通 envelope

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

### 11.2 主要 HTTP ステータス

- `400 Bad Request`: 構文レベルの不正
- `404 Not Found`: 対象 resource が存在しない
- `409 Conflict`: 状態衝突・不正な状態遷移
- `422 Unprocessable Entity`: 値ルール違反
- `500 Internal Server Error`: 想定外エラー
- `503 Service Unavailable`: backend 依存先の一時利用不可

### 11.3 主要 error.code

#### workspace

- `workspace_not_found`
- `workspace_name_invalid`
- `workspace_name_reserved`
- `workspace_name_conflict`
- `workspace_name_normalized_conflict`

#### session

- `session_not_found`
- `session_invalid_state`
- `session_conflict_active_exists`
- `session_title_invalid`
- `message_content_invalid`
- `message_idempotency_conflict`
- `session_runtime_error`

#### approval

- `approval_not_found`
- `approval_not_pending`

---

## 12. UI 実装上の運用ルール

### 12.1 Home

- 初回表示では `GET /home` を使う
- `workspace.updated_at` は、workspace 自身の作成更新に加えて、配下 session または approval の状態変化が最後に発生した時刻として扱う
- workspace 作成後は、返却 resource をそのまま一覧へ反映してよい
- approval バッジ更新は `GET /approvals?status=pending` 再取得または `/approvals/stream` を使う

### 12.2 Chat

- 初回表示では以下を並行取得してよい
  - `GET /sessions/{session_id}`
  - `GET /sessions/{session_id}/messages`
  - `GET /sessions/{session_id}/events`
- その後 `GET /sessions/{session_id}/stream` を接続する
- stream 切断後は session / messages / events を再取得して整合を取る
- assistant の途中出力は `message.assistant.delta` を連結して表示する
- 完了時は `message.assistant.completed` を正とする
- `messages` は item 全件ではない前提で実装する

### 12.3 Approval

- Approval 画面は `GET /approvals` を基準に描画する
- approve / deny 後はレスポンス内の `approval` と `session` をそのまま局所反映してよい
- stop により `canceled_approval` が返った場合、Approval 一覧と Chat の両方を局所更新してよい
- 画面全体の整合が不安な場合は `GET /approvals?status=pending` を再取得する

---

## 13. 非採用とした設計

### 13.1 `workspace_name` を path 主キーにしない

理由:

- rename 導入時に契約破壊を起こしやすい
- 表示名と識別子の責務を分けたい

### 13.2 正常レスポンスを `data` envelope に統一しない

理由:

- Home の集約レスポンスが冗長になる
- MVP の UI 実装では単体 object 直返しの方が単純

### 13.3 messages と events を 1 API に統合しない

理由:

- Chat バブルと activity log の責務が異なる
- item 全件をそのまま message とすると UI が複雑になる

### 13.4 native protocol をそのまま公開しない

理由:

- App Server の native primitive は Thread / Turn / Item / request flow であり、UI でそのまま扱うには粒度が低い
- WebUI では session / message / approval / event の façade を提供した方がスマホ UI と整合しやすい

---

## 14. 今後の内部 API 逆算時の着目点

- `session_id = thread_id` を前提に、internal session resource を thread façade として定義し直すこと
- `message` が item subset であることを internal / public の両方で明示すること
- approval/request の native stable ID の有無を確認し、ある場合は `approval_id` と一致させること
- session start / message send / approval resolve / stop が、native thread / turn / request flow にどう対応するかを整理すること
- sequence が native に存在するか確認し、なければ runtime 側採番とすること
- public SSE façade event と internal native event の対応表を持つこと

---

## 15. 未確定事項

現時点で以下は公開 API 仕様としては未固定とする。

- `approval_id` を常に native request ID にできるか
- public `event_id` を常に native event ID にできるか
- `sequence` を native 由来にするか runtime 採番にするか
- session start が native protocol 上でどこまで単一操作に寄せられるか
- SSE transport 上の `event:` 名の固定方式
- error `details` の最終 schema
- `workspace_name_reserved` の予約語一覧

---

## 16. 付録: 代表的な画面初期化フロー

### 16.1 Home

1. `GET /api/v1/home`
2. 必要に応じて `/api/v1/approvals/stream` を接続

### 16.2 Chat

1. `GET /api/v1/sessions/{session_id}`
2. `GET /api/v1/sessions/{session_id}/messages`
3. `GET /api/v1/sessions/{session_id}/events`
4. `GET /api/v1/sessions/{session_id}/stream`

### 16.3 Approval

1. `GET /api/v1/approvals?status=pending`
2. 必要に応じて `GET /api/v1/approvals/{approval_id}`
3. `GET /api/v1/approvals/stream`


---

## 17. 本版で固定した追加ルール（v0.6）

- `completed` は runtime が WebUI 終端と判断した場合のみ用いる
- `waiting_input` は対話継続可能状態であり、単なる turn 完了は原則こちらに戻す
- 1 session あたり同時 pending approval は 1 件まで
- approval 実行前に最低確認情報へ到達可能であることを API 契約に含める
- `POST /sessions/{session_id}/messages` は `client_message_id` による冪等性を必須化
- `start` / `stop` / `approve` / `deny` は再送時の冪等成功を許容
- `GET /sessions/{session_id}/events` に `sequence` を含め、session stream と整合させる
- 一覧系 endpoint は安定ソートと cursor 前提を明文化
