# Codex WebUI 共通仕様 v0.6

## 1. 目的

この文書は、Codex WebUI MVP における **共通仕様** を定義する。  
ここで固定するのは、公開 API / 内部 API / SSE にまたがって後から変更しにくい横断ルールに限定する。

この段階では、以下は原則として固定しすぎない。

- 公開 API の最終レスポンス形
- 内部 API の個別 resource 形状
- resource ごとの既定 sort
- SSE transport 上の `event:` 名
- ID の具体生成方式（UUID / ULID など）

---

## 2. 適用範囲

本仕様は以下に適用する。

- 公開 API
- 内部 API
- SSE イベント
- クライアントとサーバー間の共通データ表現

---

## 3. 基本方針

- API バージョンは `/api/v1` とする
- データ形式は JSON とする
- リアルタイム更新は SSE を用いる
- 初期表示は REST、差分更新は SSE とする
- SSE 再接続後の整合は REST 再取得で行う
- 完全 replay は MVP 対象外とする
- 変更系 API は必要に応じて冪等性を持たせる
- 共通仕様では、UI 都合の集約表現と内部ドメイン表現を過度に統一しない
- MVP の公開構成は `frontend-bff` から UI / API / SSE を同一オリジンで提供する前提とする

---

## 4. 命名規則

### 4.1 JSON フィールド名

- JSON フィールド名は `snake_case` で統一する

例:

```json
{
  "session_id": "ses_xxx",
  "workspace_name": "example_workspace",
  "created_at": "2026-03-27T05:12:34Z"
}
```

### 4.2 enum 値

- enum 値は `snake_case` を用いる

例:

- `waiting_input`
- `waiting_approval`
- `external_side_effect`

### 4.3 event type

- `event_type` は `domain.action` 形式とする

例:

- `session.status_changed`
- `message.user`
- `message.assistant.delta`
- `message.assistant.completed`
- `approval.requested`
- `approval.resolved`
- `error.raised`

### 4.4 query parameter

- query parameter 名も `snake_case` とする

### 4.5 Boolean フィールド名

- Boolean 値のフィールド名は、述語として自然に読める名前を用いる
- 典型例として `is_` / `has_` / `can_` を用いる
- 状態を表す語として自然な場合は `deleted` のような過去分詞形も許容する

---

## 5. 日時表現

- 日時は UTC の RFC 3339 文字列で表現する
- 末尾は `Z` を用いる

例:

- `2026-03-27T05:12:34Z`

補足:

- 表示時のローカルタイム変換はクライアント側で行う
- MVP ではミリ秒は必須としない

---

## 6. ID 方針

### 6.1 基本方針

- API に露出する ID は **opaque string** とする
- クライアントは ID の構造や連番性を前提にしてはならない

### 6.2 この段階で固定しないこと

以下は共通仕様では未確定とする。

- UUID を使うか ULID を使うか
- prefix を必須にするか
- 内部 ID と外部 ID を分けるか

### 6.3 備考

- `session_id` / `approval_id` / `event_id` は opaque ID を前提にしてよい
- `workspace` は `name` との関係が強いため、`workspace_id` の公開採用方法は個別 API 設計で詰める

---

## 7. null / 空値 / 省略ルール

- 配列の空は `[]` を返す
- 次ページがない場合の cursor は `null` を許可する
- 任意オブジェクトは未設定時に省略可とする
- 必須フィールドは常に返す
- nullable を認める項目だけ `null` を許可する

例:

```json
{
  "items": [],
  "next_cursor": null,
  "has_more": false
}
```

---

## 8. 正常レスポンスの扱い

### 8.1 共通仕様としての扱い

正常レスポンスの最外殻は **この段階では固定しない**。

理由:

- 公開 API は UI 向けに集約された形を取りうる
- 内部 API はよりドメインに近い形を取りうる
- この段階で `{"data": ...}` に統一すると将来の公開 API 設計を不必要に縛る可能性がある

### 8.2 この段階で揃えること

正常レスポンスでは、以下のみを共通原則とする。

- フィールド命名規則
- 日時形式
- enum 表記
- ID は opaque string
- 一覧系で `items` / `next_cursor` / `has_more` を採用可能とする

---

## 8.3 変更系 API の冪等性

MVP では、モバイル回線や再送を考慮し、変更系 API については **必要に応じて冪等性を定義してよい**。

### 共通原則

- 同じ操作の再送が実運用で起こりうる endpoint は、冪等成功を許容する設計を推奨する
- 冪等性の具体方式は、resource ごとの仕様で定義する
- 典型的には以下のいずれかを用いる
  - `client_message_id` のような request body 内キー
  - `Idempotency-Key` のような header
- 再送時の挙動は、個別仕様で以下のいずれかを明示する
  - 同じ結果を返す
  - 最新状態を返す
  - もはや同一操作として扱えない場合のみ `409 Conflict` を返す

### この段階で固定しないこと

- すべての POST endpoint に冪等性を必須化すること
- 冪等性キーの保持期間
- 冪等性判定を BFF / runtime / 永続層のどこで行うか


---

## 9. エラーレスポンス

エラーレスポンスの envelope は共通化する。

```json
{
  "error": {
    "code": "session_conflict_active_exists",
    "message": "another active session already exists in this workspace",
    "details": {
      "workspace_id": "ws_xxx",
      "active_session_id": "ses_xxx"
    }
  }
}
```

### 9.1 フィールド定義

- `code`: 機械判定用の固定文字列
- `message`: 人間向けの簡潔な説明
- `details`: 任意の補足情報

### 9.2 エラーコード命名

- `snake_case` を用いる
- ドメインと原因が分かる命名にする
- 状態衝突系のエラーコードは、過度に細分化しすぎないことを推奨する


例:

- `workspace_name_invalid`
- `workspace_name_conflict`
- `session_conflict_active_exists`
- `approval_not_pending`
- `session_invalid_state`

補足:
- 状態衝突の詳細は `error.details.current_status` などで返してよい
- たとえば `session_not_waiting_input` / `session_waiting_approval` のような細分化は個別仕様で必要性を判断する


---

## 10. HTTP ステータス運用

### 10.1 基本方針

- HTTP ステータスは transport / protocol レベルの分類に使う
- 業務上の詳細判定は `error.code` で行う
- CRUD に収まりにくい状態変更操作については、POST を用いた action endpoint を許容する
- action endpoint の具体的な endpoint 形状は公開 API / 内部 API 設計で定義する
- action endpoint の再送時挙動は個別仕様で明示する

### 10.2 推奨運用

- `400 Bad Request`
  - リクエスト形式不正
  - パラメータ形式不正
- `404 Not Found`
  - 対象リソースが存在しない
- `409 Conflict`
  - 現在状態と衝突して操作できない
- `422 Unprocessable Entity`
  - 値は読めるが業務ルール上不正
- `500 Internal Server Error`
  - 想定外の内部失敗
- `503 Service Unavailable`
  - runtime 未接続または一時的に利用不可

### 10.3 409 と 422 の切り分け

`409` の例:

- 同一 workspace に active session があり新規 start できない
- `waiting_approval` 中のため通常メッセージ送信不可

`422` の例:

- workspace 名に禁止文字を含む
- workspace 名が空文字
- sort の指定値が許可されていない

---

## 11. 共通 enum

### 11.1 session_status

- `created`
- `running`
- `waiting_input`
- `waiting_approval`
- `completed`
- `failed`
- `stopped`

### 11.2 approval_status

- `pending`
- `approved`
- `denied`
- `canceled`

### 11.3 approval_category

- `destructive_change`
- `external_side_effect`
- `network_access`
- `privileged_execution`

---

## 12. 状態遷移の扱い

### 12.1 共通仕様として固定すること

- API は現在状態を `status` として返せるようにする
- 不正な状態遷移は `409 Conflict` で表現する
- 状態遷移表そのものは resource ごとの仕様で定義する

### 12.2 この段階で固定しないこと

- `available_actions` のような UI 支援フィールドを必須化すること
- 各 resource の詳細遷移条件

---

## 13. 一覧 API 共通ルール

### 13.1 この段階で固定すること

一覧 API の共通 query parameter 名として以下を採用する。

- `limit`
- `cursor`
- `sort`

一覧レスポンスでは、必要に応じて以下を採用する。

- `items`
- `next_cursor`
- `has_more`

### 13.2 sort 記法

- 降順は先頭 `-` を用いて表現可能とする

例:

- `created_at`
- `-created_at`
- `updated_at`
- `-updated_at`
- `occurred_at`
- `-occurred_at`

### 13.3 sort key の原則

- resource の時系列ソートは、その resource が持つ代表時刻フィールドに対して行う
- `message` 系は通常 `created_at` を用いる
- `event` 系は通常 `occurred_at` を用いる
- どの sort key を許可するかは resource ごとの仕様で定義する

### 13.4 cursor paging の安定性原則

cursor-based paging を採用する一覧は、**安定順序**を持たなければならない。

共通原則:
- 主 sort key だけで同値がありうる場合は、tie-break 用の第 2 キー以降を持つ
- cursor はその安定順序を再現できる情報を含む
- 既定 sort と tie-break 規則は resource ごとの仕様で明記する

例:
- `updated_at desc, workspace_id desc`
- `occurred_at asc, sequence asc, event_id asc`


### 13.5 この段階で固定しないこと

- resource ごとの既定 sort
- offset paging を完全に禁止するかどうか
- 全一覧 API の完全同一 shape

備考:

- MVP では cursor-based paging を第一候補とする
- ただし、件数が小さい一覧は実装簡略化を優先してよい

---

## 14. SSE 共通仕様

### 14.1 基本方針

- SSE は差分通知に使う
- 再接続後の整合は REST 再取得で担保する
- 完全 replay は MVP では扱わない

### 14.2 session-scoped SSE envelope

**session 単位 stream** の `data` は以下の共通フィールドを持つ。

```json
{
  "event_id": "evt_xxx",
  "session_id": "ses_xxx",
  "event_type": "message.assistant.delta",
  "sequence": 42,
  "occurred_at": "2026-03-27T05:12:34Z",
  "payload": {}
}
```

### 14.3 フィールド定義

- `event_id`: イベント識別子
- `session_id`: 所属 session
- `event_type`: ドメインイベント種別
- `sequence`: session ごとの単調増加番号
- `occurred_at`: 発生時刻
- `payload`: イベント固有データ

### 14.4 sequence のルール

- `sequence` は **session 単位 stream において** 単調増加とする
- クライアントは `(session_id, sequence)` で重複排除できる
- 欠番や不整合を検知した場合は REST 再取得する
- session 単位の event resource を別途定義する場合、同じ session `sequence` を共有してよい
- global stream には `sequence` を必須としない

### 14.5 session event resource との関係

共通仕様として、session scoped な SSE event と `GET /sessions/{session_id}/events` のような session event resource は、**同じ出来事系列を異なる transport で表現するもの**として扱ってよい。

ただし、この段階では以下は固定しない。

- SSE payload と REST event resource の shape を完全一致させること
- transport 都合の補助フィールドを REST 側にも必須化すること


### 14.6 global stream の扱い

- approval 一覧更新などの **global stream** では `sequence` を必須としない
- global stream の順序補正は REST 再取得で行う
- global stream にも `event_id` / `event_type` / `occurred_at` / `payload` は持たせてよい
- `session_id` は関連 session がある場合に含めてよい

### 14.7 transport event 名

- SSE の `event:` 名は **共通仕様では固定しない**
- 必要なら公開 API 設計で `message` / `status` / `approval` / `error` / `keepalive` などを採用する

### 14.8 Last-Event-ID

- MVP では `Last-Event-ID` を前提にしない
- 再接続後は REST 再取得で最新状態に収束させる

---

## 15. keepalive

- keepalive 自体は採用してよい
- ただし payload 仕様や送信間隔は共通仕様では固定しない
- 詳細は公開 API の SSE 運用仕様で定義する

---

## 16. 共通仕様で固定しないもの

この段階では以下は未確定とする。

- 正常レスポンスの `data` envelope 採用有無
- ID の具体フォーマット
- `workspace_id` を公開 API の主キーにするかどうか
- resource ごとの既定 sort
- 公開 API の集約レスポンス shape
- 内部 API の resource 詳細 shape
- SSE transport の `event:` 命名
- `available_actions` のような UI 補助フィールド

---

## 17. 次フェーズへの持ち越し事項

次の API 設計フェーズで決めるべき事項は以下。

1. 公開 API の正常レスポンス形
2. 内部 API の resource 単位 schema
3. `workspace_id` / `workspace_name` の関係
4. resource ごとの既定 sort
5. 一覧 API の paging 厳密仕様
6. SSE transport event 名
7. 共通エラーコード一覧の確定
8. resource ごとの状態遷移表

---

## 18. 最小固定版サマリ

この v0.3 で固定する共通軸は以下。

- `snake_case` 統一
- UTC RFC 3339 日時
- enum は `snake_case`
- `event_type` は `domain.action`
- ID は opaque string
- 共通エラー envelope を使う
- `409` は状態衝突、`422` は値ルール違反
- `session_status` / `approval_status` / `approval_category` を固定
- `approval_status` には `canceled` を含める
- session stream の SSE envelope は `event_id / session_id / event_type / sequence / occurred_at / payload`
- `sequence` は session ごとの単調増加
- global stream では `sequence` を必須としない
- 初期表示は REST、差分更新は SSE、再接続後は REST 再取得
- `Last-Event-ID` は MVP では使わない
- 一覧系 query parameter 名は `limit / cursor / sort`
- `message` 系は通常 `created_at`、`event` 系は通常 `occurred_at` を時系列キーに用いる

以上を共通仕様の確定対象とする。


---

## 19. 本版で追加した横断ルール（v0.6）

- 変更系 API は必要に応じて冪等性を持たせてよい
- 再送時の挙動は個別仕様で明示する
- 状態衝突系エラーコードは過度に細分化しすぎず、必要なら `details.current_status` で補う
- cursor-based paging を採用する一覧は安定順序を持つ
- session scoped SSE の `sequence` は session event resource と共有してよい
- global stream では `sequence` を必須としない
