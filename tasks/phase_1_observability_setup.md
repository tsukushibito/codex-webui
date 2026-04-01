# Phase 1: 観測基盤定義

## 1. 目的

後続フェーズで必要になる観測証跡を、同じ形式で再実行可能に残せるようにする。  
このフェーズでは app-server の挙動そのものを確定するのではなく、観測方法とログ構成を固定する。

## 2. このフェーズで確定する設計判断

- 観測スパイクの責務
- ケース実行単位
- 保存対象の最小集合
- ログ保存粒度
- 判定記録方式
- 後続フェーズが依存する共通実行ルール

## 3. 事前条件

- `codex app-server` を起動・操作できること
- 観測対象の app-server version / runtime version を記録できること
- 観測ログを repo 配下または別管理領域に保存できること

## 4. 実施タスク

- [ ] 観測スパイクの入出力仕様を定義する
- [ ] ケース実行の単位を定義する
- [ ] case 名の命名規則を定義する
- [ ] request / response / stream event / history snapshot の保存形式を定義する
- [ ] 実行メタデータの保存項目を定義する
- [ ] thread / session 単位で追跡できる保存構造を定義する
- [ ] 後続フェーズで使うケース ID 一覧を予約する
- [ ] 判定メモの書式を定義する
- [ ] 保留時デフォルト判断の書き方を定義する

## 5. 確認項目

- [ ] request / response / event / history を分けて残せる
- [ ] case 名と実行時刻を紐付けられる
- [ ] thread / session 単位で出来事を追える
- [ ] stream と history を同一ケースで比較できる
- [ ] 後続フェーズで ID / status / approval 判定に使える粒度になっている

## 6. 記録すべき証跡

- raw request
- raw response
- raw stream event
- raw history snapshot
- 実行日時
- case 名
- app-server version
- 補足メモ

## 7. 判定メモ書式

以下の書式を各判断点で使う。

```md
- 判定:
- 根拠:
- 補足:
- 保留時のデフォルト判断:
```

## 8. 完了条件

- [ ] 観測方法が固定されている
- [ ] ログ保存ルールが固定されている
- [ ] ケース単位で再実行可能な前提が整っている
- [ ] Phase 2-4 の各ケースで何を保存するか明文化されている

## 9. 成果物

- 観測基盤仕様メモ
- ケース一覧
- ログ保存ルール

## 10. `docs/...checklist` 更新対象

完了時に [docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) の以下を更新する。

- `A. 基本ログ準備`
- 実施方法に相当する部分の運用メモ
