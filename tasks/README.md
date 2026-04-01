# app-server 挙動確認タスク

## 1. このディレクトリの目的

`tasks/` は、`codex app-server` 挙動確認を段階的に進めるための作業指示書を置くディレクトリとする。  
設計判断の正本は [docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) に置き、`tasks/` は「どう進めるか」「何をもって完了とするか」を定義する。

このディレクトリの文書は、正本チェックリストを更新できるだけの観測手順と判断根拠を与える責務を持つ。
`tasks/` 側で更新対象に挙げた項目には、必ず次のいずれかが存在しなければならない。

- 実行すべきケース
- 確認すべき観測点
- 保存すべき証跡
- 残すべき判定欄
- フェーズ完了条件

これらの裏付けが無い項目は、更新対象に含めない。

## 2. 用語

このディレクトリで使う `Phase` は、`tasks/` 内の作業単位を指す。  
[docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) に書かれた正本の `Phase` 番号とは一致しない。  
以後、曖昧さを避けるために次のように呼び分ける。

- `tasks Phase N`: `tasks/` 配下の作業指示書の区切り
- `正本 Phase N`: [docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) の `## 5. 実施フェーズ` にある区切り
- `ケース`: 1 回の観測として実行する最小単位。固有の case 名と実行時刻を持つ
- `必須ケース`: そのフェーズを完了扱いにするために必ず観測するケース
- `条件付き必須ケース`: 対応する checklist 項目を更新する場合に必ず観測するケース。未観測なら該当項目は未完了のまま持ち越し、更新しない
- `任意ケース`: 実行すると判断精度は上がるが、そのフェーズ完了の必須条件ではないケース
- `一次判断`: 後続フェーズで覆りうるが、先行実装の前提として使ってよい暫定判断
- `最終判断`: Phase 4 で確定し、最終成果物テンプレートへ反映する判断

## 3. フェーズ一覧

1. [Phase 1: 観測基盤定義](./phase_1_observability_setup.md)
2. [Phase 2: 基本 turn 観測](./phase_2_basic_turn_observation.md)
3. [Phase 3: approval / stop / 終端観測](./phase_3_approval_and_terminal_observation.md)
4. [Phase 4: 再構築・最終判断](./phase_4_reconstruction_and_final_decisions.md)

## 4. フェーズ依存関係

- Phase 1 完了前に Phase 2 以降へ進まない
- Phase 2 は message / session の基礎判断を先に固めるため、approval 系より先に実施する
- Phase 3 は approval / stop / 異常 / 終端の観測を担当し、request ID と terminal status の一次判断を固める
- Phase 4 は stream 非依存の復元可否、app-owned 項目、保留時デフォルト判断を最終確定する
- 前フェーズの未観測項目を後フェーズで完了扱いにしてはならない。後続へ持ち越す場合は、保留理由と保留時のデフォルト判断を残す

## 5. 正本との対応

`tasks Phase` は実作業しやすい単位に畳み替えているため、`正本 Phase` とは 1 対 1 では対応しない。  
会話や進捗報告で `Phase` という語を使う場合は、必要に応じて `tasks Phase` か `正本 Phase` を明示する。

- `tasks Phase 1` は正本の `## 4. 実施方法` と `## A. 基本ログ準備` を実行に落としたもの
- `tasks Phase 2` は正本の `Phase 1: 基本ケース観測` と `Phase 2: create / start semantics 観測` をまとめて扱い、basic signal / status / event ID の一次観測も担当する
- `tasks Phase 3` は正本の `Phase 3: approval ケース観測` と `Phase 4: stop / 異常 / 終端観測` をまとめて扱い、approval / error / terminal signal の一次観測も担当する
- `tasks Phase 4` は正本の `Phase 5: 再取得・再構築観測` と `## K. 最終判定` をまとめて扱う

更新責務の原則は次の通りとする。

- `tasks Phase 1` は全フェーズで共通に使うケース命名、ログ粒度、判定メモ書式を固定する
- `tasks Phase 2` は `thread / item / turn / event` と basic message / status の一次観測を更新する
- `tasks Phase 3` は request ID / approval / stop / terminal status の一次観測を更新する
- `tasks Phase 4` は Phase 2-3 の一次判断を `G. signal / event 対応確認`、`H. status マッピング確認`、`I. 履歴再構築確認`、`J. timestamp 確認`、`K. 最終判定`、最終成果物テンプレートへ統合して最終確定する

## 6. 共通実行ルール

- raw request / response / stream event / history snapshot を残す
- 各ケースに固有の case 名を付ける
- 実行時刻を UTC で残す
- 観測用の `session_key` を各ケースに付け、native の `session_id` 意味論は確定前に仮定しない
- `thread_id` / `request_id` が分かる場合は `session_key` と対応付けて後追いできる形にする
- stream と history は同一ケース単位で比較できるように保存する
- 観測対象の `app-server version` と `runtime version` を残す
- approval / stop / failure など更新対象ケースは、同じ粒度で raw request / response / stream event / history snapshot を残す
- 観測結果だけでは設計判断を確定できない場合は、その不足理由を残す
- 保留判断には必ず `保留時のデフォルト判断` を添える
- あるフェーズの更新対象に含めた項目は、未観測のまま完了扱いにしない

## 7. ドキュメント更新ルール

- 作業前に対象フェーズ文書を読み、そのフェーズが更新責務を持つ項目だけを更新する
- `docs/...checklist` の section 名だけで更新範囲を広げず、各フェーズ文書に書かれた担当項目だけを更新する
- 判定は `採用 / 不採用 / 保留だが先行可 / 未完了` のいずれかで残す
- 保留時は `保留時のデフォルト判断` を同時に記録する
- 1 つの checklist 項目を更新する前に、対応するケース・証跡・判定欄が揃っていることを確認する
- 後続フェーズへ持ち越す判断は、`未観測` と `保留だが先行可` を混同しない
- `条件付き必須ケース` が未観測なら、そのケースに依存する checklist 項目は更新せず、判定欄を `未完了` として持ち越す

## 8. レビューサイクル

`tasks/` の見直しや新規追加を行った後は、少なくとも次の 3 段階でセルフレビューする。

1. 構造レビュー
   - 各 Phase の責務、依存関係、更新対象が矛盾していないか確認する
2. 網羅性レビュー
   - 更新対象の各項目に対して、ケース・確認項目・証跡・判定欄・完了条件の裏付けがあるか確認する
3. 運用レビュー
   - 実作業者が迷う表現、未観測でも完了扱いできる穴、複数解釈できる語が残っていないか確認する

レビューで finding が出た場合は、修正後に同じ観点で再レビューする。
`tasks/` を完了状態と呼ぶのは、最新レビューで finding が 0 件になったときだけとする。

## 9. フェーズ完了時に残すもの

### Phase 1

- 観測スパイク仕様メモ
- ケース一覧
- ログ保存ルール

### Phase 2

- 基本ケース観測ログ
- ID 一次判定メモ
- session / message 系の仮確定メモ

### Phase 3

- approval / terminal 観測ログ
- approval 取得元一覧
- status 判定メモ

### Phase 4

- 再構築観測ログ
- 最終判定メモ
- spec 差分候補メモ
