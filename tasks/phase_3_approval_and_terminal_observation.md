# Phase 3: approval / stop / 終端観測

## 1. 目的

approval 系と terminal status 系の判定根拠をまとめて観測し、runtime が補完すべき情報を切り分ける。  
このフェーズで、approval / stop / 異常 / 終端を含む実装判断を可能にする。

## 2. このフェーズで確定する設計判断

- `approval_id = native request ID` の採用可否
- request ID の pending / resolved 再取得時同一性
- approval 最低確認情報 5 項目の native 取得元
- `resolved_at` の native 取得元
- pending / resolved の履歴再検出可否
- `approval.requested` / `approval.resolved` の対応候補
- `waiting_approval` の根拠
- 通常 stop と approval 中 stop の観測差分
- `stopped` / `completed` の根拠
- `session start` を App-owned façade action にすべきか
- `error.raised` の対応候補
- `failed` の根拠
- 一時失敗と終端失敗の区別可否

## 3. 対象ケース

必須ケース:

- `p3-approval-approve`: approval 発生 -> approve
- `p3-approval-deny`: approval 発生 -> deny
- `p3-approval-stop`: approval 発生中 -> stop
- `p3-stop-during-running`: approval を伴わない通常実行中 -> stop

条件付き必須ケース:

- `p3-transient-failure`: `failed` / `error.raised` / 一時失敗と終端失敗の区別を更新する場合に必須

任意ケース:

- `p3-stop-close-to-approval-resolve`: stop と approval resolve が近接するケース

`p3-transient-failure` を観測しない場合、`failed` / `error.raised` / `一時失敗 / 終端失敗の区別` は Phase 3 の未完了項目として残し、`docs/...checklist` の該当項目は更新しない。
`p3-stop-close-to-approval-resolve` を保留にする場合は、保留理由と当面のデフォルト判断を残す。

## 4. 事前条件

- Phase 2 までの session / message 基礎判断が記録済みである
- approval を安定して発生させる入力または操作が定義されている
- 通常実行中に stop を打てるケースが定義されている

## 5. 実施タスク

- [ ] approval 発生手順を固定する
- [ ] `p3-approval-approve` を実行する
- [ ] `p3-approval-deny` を実行する
- [ ] `p3-approval-stop` を実行する
- [ ] `p3-stop-during-running` を実行する
- [ ] `failed` / `error.raised` を更新する場合は `p3-transient-failure` を実行する
- [ ] 余力があれば `p3-stop-close-to-approval-resolve` を実行する
- [ ] 全ケースで stream と history を比較する
- [ ] request ID が pending / resolved 再取得時も同一か確認する
- [ ] approval request / resolution の取得元を整理する
- [ ] approval signal の対応候補を整理する
- [ ] 通常 stop と approval 中 stop の差分を整理する
- [ ] `p3-transient-failure` を観測した場合は error signal の対応候補を整理する
- [ ] `p3-transient-failure` を観測した場合は 一時失敗と終端失敗を区別できるか整理する
- [ ] `stopped` / `completed` の terminal status 判定根拠を整理する
- [ ] `p3-transient-failure` を観測した場合は `failed` の terminal status 判定根拠を整理する
- [ ] `session start` の判断を Phase 2 の create / start 一次判断から接続する

## 6. 確認項目

### approval

- [ ] approval request を発生させた
- [ ] request ID が取得できるか確認した
- [ ] request ID が stable か確認した
- [ ] request ID が pending / resolved 再取得時も同一か確認した
- [ ] approval の最低確認情報 5 項目が native から取れるか確認した
- [ ] approve 後の native 変化を確認した
- [ ] deny 後の native 変化を確認した
- [ ] approval 中 stop 後の native 変化を確認した
- [ ] pending approval を履歴再取得で再検出できるか確認した
- [ ] resolved approval を履歴から判定できるか確認した
- [ ] `requested_at` 相当の取得元を記録した
- [ ] `resolved_at` 相当の取得元を記録した
- [ ] `approval.requested` の signal / event を確認した
- [ ] `approval.resolved` の signal / event を確認した

### stop / failure / terminal status

- [ ] 通常実行中 stop 後の native 変化を確認した
- [ ] approval 中 stop と通常 stop の差分を確認した
- [ ] `waiting_approval` の根拠を確認した
- [ ] `stopped` の根拠を確認した
- [ ] `completed` を native だけで置けるか確認した
- [ ] native だけで足りない場合、runtime 判定が必要と判断した
- [ ] `p3-transient-failure` を観測した場合は `failed` の根拠を確認した
- [ ] `p3-transient-failure` を観測した場合は 一時失敗と終端失敗を区別できるか確認した
- [ ] `p3-transient-failure` を観測した場合は `error.raised` の signal / event を確認した

### semantics

- [ ] `session start` を App-owned façade action にすべきか判断できた
- [ ] approval 解決後に `waiting_input` へ戻す根拠を確認した
- [ ] approval 中 stop 時に approval を `canceled` と扱える根拠を確認した
- [ ] 通常 stop を approval `canceled` と混同しない方針を確認した

## 7. 記録すべき証跡

- approval request 発生時の raw request / response / event
- approve / deny / approval 中 stop 後の raw event と history snapshot
- 通常 stop 後の raw event と history snapshot
- `p3-transient-failure` 観測時の raw request / response / event / history snapshot
- request ID と resolution 事実の対応メモ
- request ID の再取得同一性メモ
- 一時失敗と終端失敗の切り分けメモ
- terminal status 判定に使った event / history 項目
- stop 種別ごとの差分メモ

## 8. 判定欄

```md
### <判断項目名>
- 判定:
- 根拠:
- app 補完要否:
- 補足:
- 保留時のデフォルト判断:
```

`p3-transient-failure` 未観測のまま failure 系を持ち越す場合、`failed` / `error.raised` / `一時失敗 / 終端失敗の区別` の `判定` は `未完了` と明記する。

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
- `通常 stop と approval 中 stop の差分`
- `stopped`
- `failed`
- `一時失敗 / 終端失敗の区別`
- `completed`
- `error.raised`
- `session start`

## 9. 完了条件

- [ ] approval 確認セクションが埋まっている
- [ ] request ID の再取得同一性が記録されている
- [ ] approval 最低確認情報の取得元一覧が記録されている
- [ ] `requested_at` / `resolved_at` の取得元が記録されている
- [ ] approval signal の対応候補が記録されている
- [ ] 通常 stop と approval 中 stop の差分が記録されている
- [ ] `stopped` / `completed` の terminal status 判定方針が記録されている
- [ ] `p3-transient-failure` を観測した場合は raw request / response / event / history snapshot が保存され、`failed` / `error.raised` / `一時失敗 / 終端失敗の区別` が更新可能である
- [ ] `p3-transient-failure` を観測していない場合は、その理由、再観測条件、保留時デフォルト判断、`判定: 未完了` が記録されている
- [ ] `session start` を含む approval / stop 実装前提が固まっている

## 10. 成果物

- approval / terminal 観測ログ
- approval 取得元一覧
- status 判定メモ

## 11. `docs/...checklist` 更新対象

完了時に [docs/validation/app_server_behavior_validation_plan_checklist.md](../docs/validation/app_server_behavior_validation_plan_checklist.md) の以下を更新する。

- `B. ID 安定性確認` の request ID 該当部分
- `F. approval 確認`
- `G. signal / event 対応確認` の approval 該当部分
- `G. signal / event 対応確認` の `error.raised` 該当部分 (`p3-transient-failure` 観測時のみ)
- `H. status マッピング確認` の `waiting_approval`、`stopped`、`completed`、`runtime 判定要否` 該当部分
- `H. status マッピング確認` の `failed` 該当部分 (`p3-transient-failure` 観測時のみ)
- `E. create / start 確認` の `session start を App-owned façade action にすべきか` 該当部分
- `J. timestamp 確認` の request / resolution 該当部分
