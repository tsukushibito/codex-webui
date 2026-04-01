# Phase 4: 再構築・最終判断

## 1. 目的

stream に依存せず履歴再取得だけでどこまで状態を復元できるかを確認し、app-owned 項目と保留時デフォルト判断を最終確定する。  
このフェーズは「観測完了」ではなく「設計判断の終了」を目的とする。

## 2. このフェーズで確定する設計判断

- stream なしで messages を再構築できるか
- stream なしで approvals を再構築できるか
- latest status 推定の材料が履歴にあるか
- `session_id` / `message_id` / `approval_id` / `turn_id` の最終方針を確定できるか
- `session start` を App-owned façade action とするか最終確定できるか
- `sequence = app-owned` を最終確定できるか
- `event_id` を native 流用するか app-owned にするか
- Phase 2-3 で観測した ID / signal / status / create-start semantics 候補を最終確定できるか
- app-owned 必須項目一覧
- 保留時のデフォルト判断

## 3. 対象ケース

- `p4-stream-disconnect-reload`: stream 切断 -> 履歴再取得
- `p4-initial-history-only-load`: stream 未接続の初回ロード -> 履歴再取得のみ
- 必要に応じて prior phase のケース再観測

## 4. 事前条件

- Phase 3 までの主要観測が完了している
- 比較対象となる stream ログと history snapshot が揃っている
- Phase 2-3 の一次判断メモが参照できる

## 5. 実施タスク

- [ ] `p4-stream-disconnect-reload` を実行する
- [ ] `p4-initial-history-only-load` を実行する
- [ ] messages を履歴だけで再構築できるか確認する
- [ ] approvals を履歴だけで再構築できるか確認する
- [ ] latest status を履歴だけで再推定できるか確認する
- [ ] timestamp だけで安定順序を補助できるか確認する
- [ ] Phase 2-3 の ID / signal / status / create-start semantics 一次判断を最終統合する
- [ ] Phase 2-3 の timestamp 観測を Phase 4 の順序判断へ統合する
- [ ] `session_id` / `message_id` / `approval_id` / `turn_id` の最終方針を確認する
- [ ] `session start` の最終方針を確認する
- [ ] `approval.requested` / `approval.resolved` / `error.raised` の最終対応を確認する
- [ ] `sequence` と `event_id` の最終判断を行う
- [ ] app-owned 必須項目一覧を確定する
- [ ] 最終成果物テンプレート 1-8 を埋める
- [ ] 不足根拠がある項目は prior phase へ差し戻し、未観測のまま最終確定しない

## 6. 確認項目

### 再構築

- [ ] stream なしで messages を再構築できる
- [ ] stream なしで approvals を再構築できる
- [ ] pending / resolved を区別できる
- [ ] latest status 推定の材料が履歴にある
- [ ] stream 未接続の初回ロードでも復元できる

### 順序

- [ ] `sequence` は app-owned にすべきと判断できる
- [ ] event ID は native 流用か app-owned か判断できる
- [ ] 履歴再取得時に時刻で安定順序が取りやすいか確認した
- [ ] 同一 thread / 同一 request 内で時刻が順序判定の補助として信頼できるか確認した

### app-owned

- [ ] app-owned 必須項目を列挙した
- [ ] 最低限 `workspace_id`、`sequence`、`active_approval_id`、session overlay、idempotency key を評価した
- [ ] 必要なら approval stable key / event stable key を app-owned とする条件を列挙した
- [ ] 保留時のデフォルト判断を列挙した
- [ ] spec 更新に必要な差分論点を列挙した

### 最終統合

- [ ] `session_id` / `message_id` / `approval_id` / `turn_id` の最終方針を確定した
- [ ] `session start` の最終方針を確定した
- [ ] `message.user` / `message.assistant.*` の最終対応を確定した
- [ ] `approval.requested` / `approval.resolved` / `error.raised` の最終対応を確定した
- [ ] `session.status_changed` の扱いを最終確定した
- [ ] `running` / `waiting_input` / `waiting_approval` / `stopped` / `failed` / `completed` の判定を整合させた
- [ ] `event_id` の最終方針が Phase 2-3 の観測根拠と結び付いている
- [ ] 未観測項目を誤って最終確定していない

## 7. 記録すべき証跡

- stream 切断前後の raw event
- 同一ケースの history snapshot
- 復元時に使った判定手順メモ
- `sequence` / `event_id` / app-owned 項目の判断根拠
- Phase 2-3 の一次判断を最終判断へ昇格または差し戻しした理由

## 8. 判定欄

```md
### <判断項目名>
- 判定:
- 根拠:
- 補足:
- 保留時のデフォルト判断:
```

最低限、以下の判断項目を残す。

- `messages 再構築`
- `approvals 再構築`
- `latest status 推定`
- `ID 安定性一覧`
- `create / start semantics`
- `sequence`
- `event_id`
- `signal / event 対応最終表`
- `app-owned 必須項目`

## 9. 完了条件

- [ ] 履歴再構築セクションが埋まっている
- [ ] 順序セクションの timestamp 観点が埋まっている
- [ ] Phase 2-3 と Phase 4 の timestamp 観測が統合されている
- [ ] ID / create-start semantics の最終統合が記録されている
- [ ] approval / error を含む signal 最終統合が記録されている
- [ ] 最終成果物テンプレート 1-8 が埋まっている
- [ ] app-owned 必須項目一覧が明示されている
- [ ] 保留時デフォルト判断が記録されている
- [ ] internal spec 更新論点が列挙されている
- [ ] 未観測項目が最終確定に紛れ込んでいない

## 10. 成果物

- 再構築観測ログ
- 最終判定メモ
- spec 差分候補メモ

## 11. `docs/...checklist` 更新対象

完了時に [docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) の以下を更新する。

- `G. signal / event 対応確認` の message / approval / error を含む最終判断
- `H. status マッピング確認` の最終判断
- `I. 履歴再構築確認`
- `J. timestamp 確認`
- `K. 最終判定`
- `最終成果物テンプレート（修正版）`
