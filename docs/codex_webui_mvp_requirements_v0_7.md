# Codex WebUI MVP 要件定義 v0.7

## 1. 目的

`codex app-server + 自前フロントエンド + Microsoft Dev Tunnels` を用いて、**PC およびスマホのブラウザから Codex とやり取りできる個人用 WebUI** を実現する。

本システムは本番向け公開サービスではなく、**個人用のリモート開発アクセス環境** を目的とする。  
利用イメージは、IDE 全体をブラウザ化することではなく、**Codex session を遠隔から安全に開始・継続・承認・確認できること** に置く。

---

## 2. MVP の成立条件

MVP が成立したとみなす条件は以下とする。

1. PC とスマホの両方から Web ブラウザでアクセスできる
2. 公開入口は Dev Tunnel 経由の `frontend-bff` のみである
3. 認証は **Dev Tunnels の認証のみ** を前提とする
4. 利用者は workspace を選択または作成できる
5. 利用者は session を作成し、開始し、Codex とチャット形式で対話できる
6. Codex の応答をストリーミング表示できる
7. 承認要求が発生した場合、**内容確認に必要な最低情報を表示した上で** approve / deny ができる
8. ブラウザ再接続または再読み込み後に、session の履歴と最新状態を確認できる
9. スマホでも主要操作が完結できる
10. 一時的な SSE 切断後は、REST 再取得により一覧・履歴・最新状態が再び整合する

---

## 3. 前提・制約

* 用途は個人用リモート開発アクセスであり、本番公開サービスではない
* 実行環境は **Windows + WSL + Docker**
* 公開経路は **Microsoft Dev Tunnels**
* 外部公開するのは **`frontend-bff` のみ**
* `codex-runtime` は内部 Docker ネットワーク専用
* `codex app-server` は `codex-runtime` 内で `stdio` 接続前提
* **単一ユーザー前提**
* **スマホブラウザからの利用を必須要件** とする
* workspace 管理対象は **`/workspaces` 配下限定** とする
* 汎用ファイルマネージャ化はしない
* IDE 的な多機能 UI は MVP 対象外とする
* 独自のアプリ側認証は設けず、**アクセス制御は Dev Tunnels の認証に依存する**
* したがって、**セキュリティ境界は Dev Tunnels 側にあり、アプリ内の追加認証・認可は MVP では提供しない**
* 変更系操作は、**通信再送・二重タップ・再読み込み直後の再送を考慮した設計**を前提とする
* WebUI 向けの公開状態・承認状態・一覧表示順序・event sequence など、**app-owned で安定保持すべき最小情報**は runtime 側で保持する

---

## 4. システム境界と責務

### 4-1. `frontend-bff`

責務は以下とする。

* ブラウザ向け UI 配信
* ブラウザ向け API 提供
* SSE 配信
* 承認 UI の窓口
* Dev Tunnel の公開入口
* UI 向け read model / façade の組み立て

外部公開される唯一のコンポーネントである。

### 4-2. `codex-runtime`

責務は以下とする。

* `codex app-server` の起動・管理
* session 管理
* workspace 管理
* 承認対象操作の制御
* bind mount された開発ディレクトリへのアクセス
* `frontend-bff` へのイベント供給
* active session 制約の最終保証
* session / approval / event の永続化に必要な最小限の app-owned 情報管理
* native state と app-owned state の整合維持、および部分失敗時の回復処理

---

# 5. MVP 機能一覧

## 5-1. Must

### アクセス・認証

* Dev Tunnel 経由で WebUI にアクセスできる
* `frontend-bff` のみが外部公開される
* 認証は Dev Tunnels に委譲する
* 未認証状態では WebUI に到達できない

### Workspace

* workspace 一覧取得
* workspace 選択
* workspace 新規作成
* 管理対象は `/workspaces` 配下のみ
* 任意パス指定によるディレクトリ操作は不可

### Session

* session 一覧取得
* session 作成
* session 開始
* session 詳細表示
* ユーザーメッセージ送信
* Codex 応答のストリーム表示
* session 状態表示
* session 停止
* 1 workspace に複数 session を持てる
* 同一 workspace で **同時に active 状態にできる session は 1 つまで** とする
* active 状態とは **`running` または `waiting_approval`** を指す
* 終端状態の session は再開不可とする

### Approval

* 承認要求の検出
* 承認内容の表示
* approve / deny
* pending approval の再表示
* 承認結果の session 反映
* stop による承認キャンセルの反映
* **1 session あたり同時に pending な approval は 1 件まで** とする
* approve / deny 実行前に、対象操作を確認する最低限の情報を表示できること

### 永続化・復元

* session メタデータを永続化
* message 履歴を復元できる
* approval 履歴を復元できる
* ブラウザ再接続・再読み込み後に session 一覧・履歴・最新状態を復元できる
* SSE 再接続後は REST 再取得により整合を回復できる
* runtime 側で保持する app-owned 最小状態から、公開状態の整合が再構成できる

### Event / 表示

* SSE によるイベント購読
* message / status / approval / error を UI に反映
* ユーザー向けアクティビティログの表示
* エラー表示
* 初期表示は REST 取得、以後は SSE で更新を受信する
* SSE 切断時は自動再接続する
* 再接続後は最新状態を再取得して整合を取る
* keepalive を送る
* 承認待ち session は一覧上で判別できること
* 承認要求受信時は in-app のバナーまたはトーストで気づけること
* 主要画面から承認待ち件数または承認待ち導線に到達できること
* session 単位 event には順序制御用の `sequence` を持たせること

### UI / スマホ

* スマホで workspace 選択ができる
* スマホで session 選択・作成・開始ができる
* スマホでメッセージ送信ができる
* スマホで応答確認ができる
* スマホで approval 処理ができる
* スマホで session 状態と履歴確認ができる

## 5-2. Should

* 変更ファイル一覧表示
* 簡易 diff 表示
* 変更要約表示
* session タイトル自動生成
* 直近 session 優先導線
* PC での補助パネル最適化

## 5-3. Later

* workspace rename
* workspace delete
* session delete
* session archive
* 任意 path import
* ファイルブラウザ
* ターミナル UI
* 高機能 diff viewer
* 複数ユーザー対応
* 高度な承認ポリシー編集
* persistent tunnel 管理 UI
* 本格的な監査ログ

---

# 6. ドメイン整理

## 6-1. Workspace

### 定義

Codex が作業対象とするディレクトリ単位。

### 管理範囲

* `/workspaces` 直下のディレクトリのみを対象とする

### MVP 操作

* list
* create
* get
* select

### 命名ルール

MVP では以下を前提とする。

* workspace 名は表示名兼ディレクトリ名とする
* 使用可能文字は **英小文字、数字、`-`、`_`** とする
* 長さは **1 以上 64 以下** とする
* 空文字不可
* 先頭文字は英小文字または数字とする
* 末尾の `-`、`_` は不可とする
* `.` および `..` は禁止とする
* `/`、`\\`、空白は使用不可とする
* 小文字正規化後の重複を認めない
* 作成時に同名ディレクトリが存在する場合はエラー
* 列挙対象は `/workspaces` 直下ディレクトリのみ

### 列挙時の除外条件

* symlink は列挙対象外とする
* 先頭が `.` の隠しディレクトリは列挙対象外とする
* 読み取り権限が不足しているディレクトリは列挙対象外とする
* 除外対象が存在しても、一覧 API 全体は失敗させず、必要に応じて runtime ログに記録する

### 作成時の初期化

* MVP では空ディレクトリ作成のみを前提とする
* Git 初期化やテンプレート展開は対象外

### 非対象

* rename
* delete
* move
* 任意 path 指定

---

## 6-2. Session

### 定義

workspace に紐づく Codex との対話・実行単位。

### 責務

* 会話の送受信
* 状態遷移管理
* 承認待ち管理
* イベントの発生源

### MVP 状態

* `created`
* `running`
* `waiting_input`
* `waiting_approval`
* `completed`
* `failed`
* `stopped`

### 状態の意味

* `created`: session メタデータは存在するが、まだ実行開始していない状態
* `running`: Codex が処理中、または現在のターンを進行中の状態
* `waiting_input`: assistant の直前ターンが完了し、**次の通常ユーザー入力を受け付ける継続状態**
* `waiting_approval`: 承認要求が発生し、approve / deny / stop のいずれかを待っている状態
* `completed`: runtime が **その session を WebUI 上の終端として確定**した状態
* `failed`: runtime が **同一 session の継続を打ち切るべき実行失敗** と判断した状態
* `stopped`: 利用者またはシステムが **停止意思に基づいて終端化** した状態

### `waiting_input` と `completed` の境界

* assistant 応答が完了しても、**以後の通常入力を受け付ける場合は `waiting_input`** とする
* `completed` は、**単なる1ターン完了ではなく、その session を WebUI として終端扱いにする場合にのみ**遷移させる
* `completed` に遷移した session は通常メッセージ送信を受け付けない
* `completed` / `failed` / `stopped` は終端状態とする
* 終端状態に遷移した session は再開不可とする
* 続きを行いたい場合は新しい session を作成する
* turn 単位の一時的失敗で、利用者が同一 session で再試行可能な場合は `error.raised` を通知しつつ `waiting_input` に戻してよい

### create / start の定義

* `session create` は session メタデータを生成し、初期状態 `created` を作る操作とする
* `session start` は `created` の session を実行開始し、状態を `running` に遷移させる操作とする
* UI 上は「新規 session 作成」を 1 操作で見せてもよいが、内部的には `create` と `start` を分離してよい

### 複数 session

* 1 workspace に複数 session を許可する
* `created` または `waiting_input` の session が複数存在してよい
* ただし同一 workspace で同時に active にできる session は 1 つまでとする
* active とは `running` または `waiting_approval` を指す
* 同一 workspace に active session が存在する場合、別 session の **`start` はエラーとして拒否する**
* 同一 workspace に別 active session が存在する場合、対象 session の **`waiting_input` → `running`** もエラーとして拒否する
* 同一 workspace に active session が存在していても、別 session の **`create` 自体は許可する**
* 既存 active session を自動で `stopped` にして切り替える動作は MVP では行わない
* `waiting_input` の session は active ではないため、別 session の `start` を妨げない
* UI は最新 session を優先表示する

### 状態遷移ルール

* `created` → `running` : `start` 実行時
* `running` → `waiting_input` : 現在ターンの応答完了後、追加承認待ちがなく、session を継続可能と判断した場合
* `running` → `waiting_approval` : 承認要求が発生した場合
* `waiting_input` → `running` : ユーザーメッセージ送信時
* `waiting_approval` → `running` : approve 時
* `waiting_approval` → `waiting_input` : deny 時
* `waiting_approval` → `stopped` : stop 時
* `running` → `completed` : runtime が session の終端を確定した場合
* `running` → `failed` : 実行失敗時
* `running` / `waiting_input` / `waiting_approval` → `stopped` : 利用者またはシステムによる停止時

### 補足

* `deny` 時の遷移先は **常に `waiting_input`** とする
* `waiting_approval` 中は通常メッセージ送信を受け付けない
* `waiting_input` 中のみ通常のユーザーメッセージ送信を受け付ける
* `waiting_approval` は approve / deny / stop のいずれかが行われるまで維持する
* `waiting_approval` に自動タイムアウトは設けない

---

## 6-3. Approval

### 定義

危険操作または外部副作用を伴う操作に対する承認要求。

### 承認カテゴリ

MVP では以下のリスクカテゴリで扱う。

* `destructive_change`
* `external_side_effect`
* `network_access`
* `privileged_execution`

具体的な shell コマンドや git 操作の分類は runtime 側で行う。

### 同時件数制約

* **1 session あたり同時に pending な approval は高々 1 件**とする
* 追加の native request が発生しうる場合でも、MVP では runtime 側で直列化し、UI には同時に 1 件のみ公開する

### approval request の最小情報

* `approval_id`
* `session_id`
* `approval_category`
* `summary`
* `reason`
* `operation_summary`
* `created_at` または公開 API 上の同等項目である `requested_at`
* `status`

### approve / deny 実行前の最低確認情報

approve / deny を実行する前に、少なくとも以下を利用者が確認できることを要件とする。

* `approval_category`
* `summary`
* `reason`
* `operation_summary`
* `created_at` または公開 API 上の同等項目である `requested_at`

一覧画面から直接承認操作を許す場合でも、上記最低情報に到達できることを前提とする。

### status

* `pending`
* `approved`
* `denied`
* `canceled`

### 補足

* `canceled` は、主に **`waiting_approval` 中の session に対して stop を行った場合** の解決結果として扱う
* `status` は承認要求の現在状態を表す
* stop による解決も approval 履歴として参照できることを前提とする

---

## 6-4. Event

### 定義

UI に時系列で流す通知の共通表現。

### 共通フィールド

MVP の **session 単位 event** は最低限以下の共通フィールドを持つ。

* `event_id`
* `session_id`
* `event_type`
* `sequence`
* `occurred_at`

`sequence` は **session ごとの単調増加番号** とし、UI での重複排除と順序制御に利用する。

session event 一覧で `occurred_at` を使う場合、同一 session 内では `occurred_at` は `sequence` と同順の単調非減少とする。

### event 例

* `session.status_changed`
* `message.user`
* `message.assistant.delta`
* `message.assistant.completed`
* `approval.requested`
* `approval.resolved`
* `log.appended`
* `error.raised`

### 方針

* 初期表示は REST
* 差分更新は SSE
* 完全 replay は MVP 対象外
* 再接続後は REST 再取得で整合を取る
* `sequence` は **session 単位 stream の整合制御用** とし、重複排除と順序制御に利用する
* 再接続後の復旧は `Last-Event-ID` に依存せず、REST 再取得を正とする
* グローバル通知 stream では `sequence` を必須としない

---

# 7. 復元要件

復元要件は以下に限定する。

## 対象に含むもの

* ブラウザ再接続
* ブラウザ再読み込み
* SSE 切断後の再購読

## 対象外

* `codex-runtime` 再起動後の実行継続
* container 再起動後の実行継続
* `running` 中 session のプロセス継続保証

### 正本と整合方針

* message 履歴や approval 履歴の事実情報は、原則として app-server 側履歴を優先してよい
* 一方で、WebUI として必要な **一覧・最新状態・承認状態・sequence・stable ID 対応** などの app-owned 情報は runtime 側で保持する
* SSE 再接続後は、**REST で再取得した公開状態を正**として UI を収束させる
* runtime は、必要に応じて native state と app-owned state の差異を検出し、再構成可能な範囲で公開状態を再整合する
* runtime / container 再起動後に実行中処理が継続していなくても、保存済みの session 履歴・approval 履歴・最終公開状態は参照可能であることが望ましい

### 部分失敗時の基本方針

* native 操作成功後に app-owned 永続化や projection 更新で失敗しうることを前提とする
* MVP では、**部分失敗を検出可能であり、再試行または再取得で最終的に公開状態を収束させられること**を要件とする
* 途中失敗が発生しても、少なくとも不整合を観測・記録できることを前提とする

---

# 8. UI/UX 要件

## 8-1. 基本方針

UI は PC の縮小版ではなく、**スマホで成立する情報設計** を前提とする。  
MVP では単一カラム中心のタスク指向 UI を基本とする。

## 8-2. 必要画面

### Home

* workspace 一覧
* workspace 作成
* session 一覧
* session 作成 / 開始
* 承認待ち件数導線

### Chat

* メッセージ一覧
* session 状態表示
* 入力欄
* 承認待ち通知
* ログ / 変更要約への導線

### Approval / Activity

* 承認詳細
* approve / deny
* 直近アクティビティ
* エラー表示

PC では補助パネルで拡張可だが、スマホでは 1 画面 1 主目的を基本とする。

## 8-3. スマホ受け入れ基準

MVP では、少なくとも以下を満たすこと。

* 横幅 **360px 相当** で主要操作が横スクロールなしで行える
* Home / Chat / Approval の 3 画面で主要操作が完結する
* approval の approve / deny が、**最低確認情報に到達した状態から** 2 タップ以内で実行可能
* 再接続後、直前 session の状態確認まで迷わず到達できる

## 8-4. スマホ非対象

* 大規模 diff の詳細閲覧最適化
* ファイルツリー操作
* 複数ペイン同時表示
* ターミナル操作
* 長文編集最適化

---

# 9. 非機能メモ

* MVP は単一ユーザー運用を前提とする
* セキュリティの中心は Dev Tunnels 認証に置く
* アプリ内部での細粒度な認可やロール分離は扱わない
* 将来的な複数ユーザー化を阻害しないよう、workspace / session / approval は識別子ベースで管理する
* native primitive をそのまま UI に露出するのではなく、WebUI 向けの façade / projection を許容する
* ただし、不要な独自 ID や過剰な履歴複製は避ける
* 変更系 API は、冪等化キーまたは同等手段により、少なくとも二重送信に対して安全に扱える設計が望ましい
* 一覧 API と event API は、UI が安定ページング・順序制御できるよう、安定順序と tie-break を持つことが望ましい

---

# 10. この版で固定した判断

* 認証は Dev Tunnels のみとし、アプリ側独自認証は持たない
* 同一 workspace で同時に active 状態にできる session は 1 つまでとする
* active とは `running` または `waiting_approval` を指し、別 session の **`start`** はエラーで拒否する
* 同一 workspace に別 active session が存在する場合、対象 session の **`waiting_input` → `running`** もエラーで拒否する
* active session が存在しても、別 session の **`create`** 自体は許可する
* `session create` と `session start` は概念上分離する
* `waiting_input` は継続状態、`completed` は終端状態として明確に区別する
* `completed` は単なる1ターン完了ではなく、runtime がその session を終端と確定した場合にのみ遷移させる
* `deny` 時の遷移先は常に `waiting_input` とする
* `waiting_approval` 中に stop した場合、approval は `canceled` として扱う
* `completed` / `failed` / `stopped` は終端状態とし、再開不可とする
* `waiting_approval` に自動タイムアウトは設けない
* 1 session あたり同時に pending な approval は 1 件までとする
* session delete / archive は MVP 対象外とする
* session stream 用 event には共通フィールドとして `event_id` / `session_id` / `event_type` / `sequence` / `occurred_at` を持たせる
* `sequence` は session 単位の重複排除・順序制御に使い、再接続後の整合回復は REST 再取得を正とする
* workspace 名は **英小文字、数字、`-`、`_`** のみを許可し、長さ 1〜64、先頭文字制約・末尾文字制約・予約名制約を設ける
* workspace 列挙時は symlink・隠しディレクトリ・権限不足ディレクトリを除外する
* 復元対象はブラウザ再接続までとし、runtime / container 再起動後の実行継続は対象外とする
* runtime は native state と app-owned state の差異を検出し、必要に応じて公開状態を再整合できることが望ましい
* 部分失敗は起こりうる前提とし、不整合を検出・記録し、再試行または再取得で収束可能な設計を採る
* 承認通知は一覧バッジと in-app バナー / トーストで扱い、OS レベル通知は MVP 対象外とする
* UI はスマホ成立を前提とした 3 画面構成を基本とする
