# app-server 挙動確認タスク

## 1. このディレクトリの目的

`tasks/` は、`codex app-server` 挙動確認を段階的に進めるための作業指示書を置くディレクトリとする。  
設計判断の正本は [docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) に置き、`tasks/` は「どう進めるか」を定義する。

## 2. フェーズ一覧

このディレクトリで使う `Phase` は、`tasks/` 内の作業単位を指す。  
[docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) に書かれた正本の `Phase` 番号とは一致しない。  
以後、曖昧さを避けるために次のように呼び分ける。

- `tasks Phase N`: `tasks/` 配下の作業指示書の区切り
- `正本 Phase N`: [docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) の `## 5. 実施フェーズ` にある区切り

1. [Phase 1: 観測基盤定義](./phase_1_observability_setup.md)
2. [Phase 2: 基本 turn 観測](./phase_2_basic_turn_observation.md)
3. [Phase 3: approval / stop / 終端観測](./phase_3_approval_and_terminal_observation.md)
4. [Phase 4: 再構築・最終判断](./phase_4_reconstruction_and_final_decisions.md)

## 3. フェーズ依存関係

- Phase 1 完了前に Phase 2 以降へ進まない
- Phase 2 は message / session の基礎判断を先に固めるため、approval 系より先に実施する
- Phase 3 は approval / terminal status の判断を扱う
- Phase 4 は stream 非依存の復元可否と app-owned 項目の最終確定を扱う

## 4. 正本との対応

`tasks Phase` は実作業しやすい単位に畳み替えているため、`正本 Phase` とは 1 対 1 では対応しない。  
会話や進捗報告で `Phase` という語を使う場合は、必要に応じて `tasks Phase` か `正本 Phase` を明示する。

- `tasks Phase 1` は正本の `## 4. 実施方法` と `## A. 基本ログ準備` を実行に落としたもの
- `tasks Phase 2` は正本の `Phase 1: 基本ケース観測` と `Phase 2: create / start semantics 観測` をまとめて扱い、basic signal / status / event ID の初期観測も担当する
- `tasks Phase 3` は正本の `Phase 3: approval ケース観測` と `Phase 4: stop / 異常 / 終端観測` をまとめて扱い、approval / error / terminal signal の確定観測も担当する
- `tasks Phase 4` は正本の `Phase 5: 再取得・再構築観測` と `## K. 最終判定` をまとめて扱う

更新責務の原則は次の通りとする。

- `tasks Phase 2` は `thread / item / turn / event` と basic message / status の一次観測を更新する
- `tasks Phase 3` は request ID / approval / terminal status の一次観測を更新する
- `tasks Phase 4` は Phase 2-3 の一次判断を `G. signal / event 対応確認`、`H. status マッピング確認`、`K. 最終判定`、最終成果物テンプレートへ統合して最終確定する

## 5. 共通ルール

- raw request / response / stream event / history snapshot を残す
- 各ケースに case 名を付ける
- 実行時刻を UTC で残す
- thread / session 単位で後追いできる形にする
- 保留判断には必ずデフォルト判断を添える
- 観測結果だけでは設計判断を確定できない場合は、その不足理由も残す

## 6. ドキュメント更新ルール

- 作業前に対象フェーズ文書を読む
- 作業中はフェーズ文書のチェック項目に沿って証跡を集める
- 作業後は [docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) の該当項目を更新する
- `docs/...checklist` の section 名だけで更新範囲を広げず、各フェーズ文書に書かれた担当項目だけを更新する
- 判定は `採用 / 不採用 / 保留だが先行可` のいずれかで残す
- 保留時は `保留時のデフォルト判断` を同時に記録する

## 7. フェーズ完了時に残すもの

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
