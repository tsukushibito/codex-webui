# Phase 3: approval / stop / 終端観測

## 1. 目的

approval 系と terminal status 系の判定根拠をまとめて観測し、runtime が補完すべき情報を切り分ける。  
このフェーズで、approval / stop を含む実装判断を可能にする。

## 2. このフェーズで確定する設計判断

- `approval_id = native request ID` の採用可否
- request ID の pending / resolved 再取得時同一性
- approval 最低確認情報 5 項目の native 取得元
- `resolved_at` の native 取得元
- pending / resolved の履歴再検出可否
- `approval.requested` / `approval.resolved` / `error.raised` の対応候補
- `waiting_approval` の根拠
- `stopped` / `failed` / `completed` の根拠
- 一時失敗と終端失敗の区別可否
- `session start` を App-owned façade action にすべきか

## 3. 対象ケース

- approval 発生 -> approve
- approval 発生 -> deny
- approval 発生中 -> stop
- 一時失敗ケース
- stop と approval resolve が近接するケース

余力がなければ最後の 1 ケースは保留でもよいが、保留理由を残す。  
一時失敗ケースを観測しない場合、`failed` / `error.raised` の判断は完了扱いにしない。

## 4. 事前条件

- Phase 2 までの session / message 基礎判断が記録済みである
- approval を安定して発生させる入力または操作が定義されている

## 5. 実施タスク

- [ ] approval 発生手順を固定する
- [ ] approve ケースを実行する
- [ ] deny ケースを実行する
- [ ] approval 中 stop ケースを実行する
- [ ] 一時失敗ケースを実行する
- [ ] 余力があれば resolve / stop 近接ケースを実行する
- [ ] 各ケースで stream と history を比較する
- [ ] request ID が pending / resolved 再取得時も同一か確認する
- [ ] approval request / resolution の取得元を整理する
- [ ] approval / error signal の対応候補を整理する
- [ ] 一時失敗と終端失敗を区別できるか整理する
- [ ] terminal status 判定根拠を整理する

## 6. 確認項目

### approval

- [ ] approval request を発生させた
- [ ] request ID が取得できるか確認した
- [ ] request ID が stable か確認した
- [ ] request ID が pending / resolved 再取得時も同一か確認した
- [ ] approval の最低確認情報 5 項目が native から取れるか確認した
- [ ] approve 後の native 変化を確認した
- [ ] deny 後の native 変化を確認した
- [ ] stop 後の native 変化を確認した
- [ ] pending approval を履歴再取得で再検出できるか確認した
- [ ] resolved approval を履歴から判定できるか確認した
- [ ] `resolved_at` 相当の取得元を記録した
- [ ] `approval.requested` の signal / event を確認した
- [ ] `approval.resolved` の signal / event を確認した

### status

- [ ] `waiting_approval` の根拠を確認した
- [ ] `stopped` の根拠を確認した
- [ ] `failed` の根拠を確認した
- [ ] 一時失敗と終端失敗を区別できるか確認した
- [ ] `completed` を native だけで置けるか確認した
- [ ] native だけで足りない場合、runtime 判定が必要と判断した
- [ ] `error.raised` の signal / event を確認した

### semantics

- [ ] `session start` を App-owned façade action にすべきか判断できた
- [ ] approval 解決後に `waiting_input` へ戻す根拠を確認した
- [ ] stop 時に approval を `canceled` と扱える根拠を確認した

## 7. 記録すべき証跡

- approval request 発生時の raw request / response / event
- approve / deny / stop 後の raw event と history snapshot
- request ID と resolution 事実の対応メモ
- request ID の再取得同一性メモ
- 一時失敗と終端失敗の切り分けメモ
- terminal status 判定に使った event / history 項目

## 8. 判定欄

```md
### <判断項目名>
- 判定:
- 根拠:
- app 補完要否:
- 補足:
- 保留時のデフォルト判断:
```

最低限、以下の判断項目を残す。

- `approval_id`
- `approval_category`
- `title / summary`
- `description / reason`
- `operation_summary`
- `requested_at`
- `resolved_at`
- `approval.requested`
- `approval.resolved`
- `waiting_approval`
- `stopped`
- `failed`
- `一時失敗 / 終端失敗の区別`
- `completed`
- `error.raised`
- `session start`

## 9. 完了条件

- [ ] approval 確認セクションが埋まっている
- [ ] error / failed 観測セクションが埋まっている
- [ ] request ID の再取得同一性が記録されている
- [ ] approval 最低確認情報の取得元一覧が記録されている
- [ ] 一時失敗 / 終端失敗の区別方針が記録されている
- [ ] terminal status 判定方針が記録されている
- [ ] approval / stop を含む実装前提が固まっている

## 10. 成果物

- approval / terminal 観測ログ
- approval 取得元一覧
- status 判定メモ

## 11. `docs/...checklist` 更新対象

完了時に [docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) の以下を更新する。

- `B. ID 安定性確認` の request ID 該当部分
- `F. approval 確認`
- `G. signal / event 対応確認` の approval / error 該当部分
- `H. status マッピング確認` の `waiting_approval`、`stopped`、`failed`、`completed`、`runtime 判定要否` 該当部分
- `E. create / start 確認` の `session start を App-owned façade action にすべきか` 該当部分
- `J. timestamp 確認` の request / resolution 該当部分
