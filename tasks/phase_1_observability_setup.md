# Phase 1: 観測基盤定義

## 1. 目的

後続フェーズで必要になる観測証跡を、同じ形式で再実行可能に残せるようにする。  
このフェーズでは app-server の挙動そのものを確定するのではなく、観測方法、ログ構成、判定メモの残し方を固定する。

## 2. このフェーズで確定する設計判断

- 観測スパイクの責務
- ケース実行単位
- ケース命名規則
- 保存対象の最小集合
- ログ保存粒度
- 実行メタデータの最小集合
- thread / session / request 単位で追跡できる保存構造
- 観測用 `session_key` の定義
- 判定記録方式
- 後続フェーズが依存する共通実行ルール

## 3. 事前条件

- `codex app-server` を起動・操作できること
- 観測対象の `app-server version` と `runtime version` を記録できること
- 観測ログと成果物を repo 配下の `tasks/` とは別の正本領域に保存できること

## 4. 実施タスク

- [x] 観測スパイクの入出力仕様を定義する
- [x] 1 ケースの開始条件、終了条件、再実行単位を定義する
- [x] case 名の命名規則を定義する
- [x] request / response / stream event / history snapshot の保存形式を定義する
- [x] 実行メタデータの保存項目を定義する
- [x] thread / session / request 単位で追跡できる保存構造を定義する
- [x] 観測用 `session_key` の採番規則と意味を定義する
- [x] stream と history を同一ケースで比較する手順を定義する
- [x] 後続フェーズで使う必須ケース ID 一覧を予約する
- [x] 判定メモの書式を定義する
- [x] 保留時デフォルト判断の書き方を定義する

## 5. 仕様として固定すること

### ケース命名

- case 名は phase を含める
- case 名だけで目的が分かる粒度にする
- 同一ケースの再実行は UTC 時刻で区別できるようにする

例:

- `p2-normal-turn-complete`
- `p2-no-assistant-message`
- `p3-approval-approve`
- `p3-stop-during-running`
- `p4-stream-disconnect-reload`

### 実行メタデータ

最低限、次を保存する。

- case 名
- `observed_in_tasks_phase`
- `run_key`
- 実行日時 UTC
- `session_key`
- `app-server version`
- `runtime version`
- ケース説明
- 実行に使った入力または操作の要約
- `thread_id` が分かる場合はその値
- `request_id` が分かる場合はその値
- 補足メモ

`session_key` は観測者が付与する安定した grouping key とし、この時点では native の `session_id` や `thread_id` と同一視しない。
native 側の session semantics は後続フェーズで判断し、Phase 1 では「どのケース群を同じ観測セッションとして扱うか」を固定するためだけに使う。
書式は `sk-<YYYYMMDD>-<slug>-<nn>` とする。
`observed_in_tasks_phase` は観測を実施した `tasks Phase` を表し、prior phase のケース再観測時にも保存する。
`run_key` は `<高解像度 UTC 時刻>-<nonce>` の一意キーとし、case 配下の保存ディレクトリ名に使う。

### ログ保存構造

最低限、次をケース単位で分けて残せること。

- raw request
- raw response
- raw stream event
- raw history snapshot
- 実行メタデータ
- 判定メモ

成果物と raw 証跡の正本保存先は `artifacts/app_server_observability/` とする。

ケースをまたいで比較する場合は、少なくとも `session_key` を共通キーとして辿れること。

同一ケース内では、turn ごとまたは request ごとに分けて比較できる粒度にする。
同一 case の再観測は、実施した tasks Phase にかかわらず同じ case 名配下へ保存し、実施 phase は metadata に残す。

## 6. 後続フェーズ向けの予約ケース ID

Phase 1 完了時点で、少なくとも次を予約する。

- `p2-normal-turn-complete`
- `p2-no-assistant-message`
- `p2-multi-turn-follow-up`
- `p2-create-start-semantics`
- `p3-approval-approve`
- `p3-approval-deny`
- `p3-approval-stop`
- `p3-stop-during-running`
- `p3-transient-failure`
- `p3-stop-close-to-approval-resolve`
- `p4-stream-disconnect-reload`
- `p4-initial-history-only-load`

## 7. 確認項目

- [x] request / response / event / history を分けて残せる
- [x] case 名と実行時刻を紐付けられる
- [x] 同一 case の再観測先が tasks Phase に依存せず一意である
- [x] `app-server version` と `runtime version` を残せる
- [x] thread / session / request 単位で出来事を追える
- [x] `session_key` の意味が文書化され、native ID と混同しない
- [x] stream と history を同一ケースで比較できる
- [x] 後続フェーズで ID / status / approval 判定に使える粒度になっている
- [x] Phase 2-4 の予約ケース ID を予約済みである

## 8. 記録すべき証跡

- raw request
- raw response
- raw stream event
- raw history snapshot
- 実行日時 UTC
- case 名
- `session_key`
- `app-server version`
- `runtime version`
- `session_key` / `thread_id` / `request_id` の対応メモ
- 補足メモ

## 9. 判定メモ書式

以下の書式を各判断点で使う。

```md
### <判断項目名>
- 判定: 採用 / 不採用 / 保留だが先行可 / 未完了
- 根拠:
- 補足:
- 保留時のデフォルト判断:
```

保留時は、少なくとも次のどちらかを補足に書く。

- 何が未観測か
- 後続フェーズのどこで再観測するか

## 10. 完了条件

- [x] 観測方法が固定されている
- [x] ログ保存ルールが固定されている
- [x] ケース単位で再実行可能な前提が整っている
- [x] Phase 2-4 の各ケースで何を保存するか説明できる
- [x] `app-server version` / `runtime version` を含む再現条件が明文化されている
- [x] `session_key` を用いた session grouping ルールが明文化され、native session semantics の未確定部分と切り分けられている

## 11. 成果物

- [観測基盤仕様メモ](../artifacts/app_server_observability/phase_1_observability_spike_spec.md)
- [ケース一覧](../artifacts/app_server_observability/phase_1_case_registry.md)
- [ログ保存ルール](../artifacts/app_server_observability/observations/README.md)
- [判定メモ雛形](../artifacts/app_server_observability/phase_1_judgment_template.md)

## 12. `docs/...checklist` 更新対象

完了時に [docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) の以下を更新する。

- `A. 基本ログ準備`
- 実施方法に相当する部分の運用メモ
