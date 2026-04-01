# Phase 2: 基本 turn 観測

## 1. 目的

approval を含まない基本ケースを先に観測し、session / message の基礎判断を固める。  
このフェーズ完了時点で、approval 依存のない先行実装判断ができる状態を目指す。

## 2. このフェーズで確定する設計判断

- `session_id = native thread ID` の採用可否
- `message_id = native item ID` の採用可否
- `turn_id` の取得可否と internal 利用価値
- `event_id` の取得可否と安定 contract としての一次評価
- `message.user` の対応候補
- `message.assistant.delta` と `message.assistant.completed` の対応候補
- `running` の根拠
- `running -> waiting_input` の判定根拠
- `session.status_changed` を native から直接取るか runtime で生成するかの一次候補
- create / start の基本 semantics
- `created` 状態を app 側で安全に持てるかの一次判断

## 3. 対象ケース

- 通常 1 turn 完了
- assistant テキスト無し turn
- 複数 turn 継続

## 4. 事前条件

- Phase 1 の観測基盤が定義済みである
- 各ケースを同じ保存形式で実行できる

## 5. 実施タスク

- [ ] 通常 1 turn 完了ケースを実行する
- [ ] assistant テキスト無し turn を実行する
- [ ] 複数 turn 継続ケースを実行する
- [ ] follow-up user message で既存 thread が再利用されるか確認する
- [ ] follow-up turn で `waiting_input -> running` に戻る根拠を確認する
- [ ] 各ケースで stream と history を比較する
- [ ] 同一 turn 内の item 発生パターンを整理する
- [ ] message projection 対象外 item を整理する
- [ ] basic signal / status / event ID の初期観測を記録する
- [ ] create / start の初期挙動を記録する

## 6. 確認項目

### ID

- [ ] thread ID が取得できる
- [ ] thread ID は再取得後も同一
- [ ] user item ID が取得できる
- [ ] assistant item ID が取得できる
- [ ] turn ID が取得できるか確認した
- [ ] turn ID が完了判定や request 紐付けに使えるか確認した
- [ ] event ID が取得できるか確認した
- [ ] event ID は安定 contract として使う価値があるか初期観測した

### message / event

- [ ] user message 送信で何が生成されるか確認した
- [ ] `message.user` の signal / event を確認した
- [ ] assistant delta の signal / event を確認した
- [ ] assistant completed の signal / event を確認した
- [ ] delta と completed が同じ message に結び付くか確認した
- [ ] 同一 turn で assistant item が複数生成されうるか確認した
- [ ] message projection に含めない item を切り分けられるか確認した
- [ ] `session.status_changed` の基礎候補を確認した

### status / semantics

- [ ] `running` の根拠を確認した
- [ ] turn 完了を示す signal を確認した
- [ ] `running -> waiting_input` に戻す根拠を確認した
- [ ] follow-up user message で既存 thread が再利用されるか確認した
- [ ] follow-up turn で `waiting_input -> running` に戻る根拠を確認した
- [ ] native thread 作成だけで idle に置けるか初期観測した
- [ ] `start without input` 的な安定操作の有無を初期観測した
- [ ] `created` 状態を app 側で安全に持てるか初期観測した

### timestamp

- [ ] item に時刻が付くか確認した
- [ ] event に時刻が付くか確認した
- [ ] history 再取得時に時刻が見えるか確認した

## 7. 記録すべき証跡

- 各ケースの raw request / response
- turn ごとの raw stream event
- ケース実行後の history snapshot
- item / turn / event / timestamp の対応メモ

## 8. 判定欄

```md
### <判断項目名>
- 判定:
- 根拠:
- 補足:
- 保留時のデフォルト判断:
```

最低限、以下の判断項目を残す。

- `session_id`
- `message_id`
- `turn_id`
- `event_id`
- `message.user`
- `message.assistant.delta`
- `message.assistant.completed`
- `running`
- `waiting_input`
- `session.status_changed`
- `session create / start` の基本 semantics
- `created`

## 9. 完了条件

- [ ] ID 安定性の thread / item / turn 項目が埋まっている
- [ ] event ID の一次評価が記録されている
- [ ] message event 対応候補が記録されている
- [ ] basic status / signal の一次候補が記録されている
- [ ] `running -> waiting_input` の根拠が記録されている
- [ ] 複数 turn 継続時の thread 再利用と `waiting_input -> running` 復帰根拠が記録されている
- [ ] approval を除く session / message 実装の仮前提が固まっている

## 10. 成果物

- 基本ケース観測ログ
- ID 一次判定メモ
- session / message 仮確定メモ

## 11. `docs/...checklist` 更新対象

完了時に [docs/app_server_behavior_validation_plan_checklist.md](../docs/app_server_behavior_validation_plan_checklist.md) の以下を更新する。

- `B. ID 安定性確認` の `thread ID / user item ID / assistant item ID / turn ID / event ID` 該当部分
- `C. 通常 turn 確認`
- `D. assistant テキスト無し turn 確認`
- `E. create / start 確認` の `native thread 作成だけで idle に置けるか`、`start without input 的な安定操作があるか`、`created 状態を app 側で安全に持てるか` 該当部分
- `G. signal / event 対応確認` の `message.user`、`message.assistant.delta`、`message.assistant.completed`、`session.status_changed` 該当部分
- `H. status マッピング確認` の `running`、`waiting_input` 該当部分
- `J. timestamp 確認` の `item`、`event`、`history 再取得時の時刻観測` 該当部分

request ID 系の `B. ID 安定性確認` 項目はこのフェーズでは更新せず、Phase 3 で更新する。
