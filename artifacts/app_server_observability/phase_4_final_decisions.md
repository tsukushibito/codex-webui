# Phase 4 Final Decisions

## Summary

Phase 2-4 の観測結果を統合し、公開設計へ持ち込む最終判断を以下に固定する。

- `session_id` は native `thread_id` を採用する
- `message_id` に native item ID は採用しない
- `approval_id` に native request ID は採用しない
- `turn_id` は internal/debug 用として保持価値がある
- `event_id` は app-owned とする
- `sequence` は app-owned とする
- `session start` は App-owned facade action とする
- messages は history 主体で再構築できる
- approvals は history-only では再構築できない

## Final ID Policy

### `session_id`

- 判定: 採用
- 取得元: native `thread_id`
- 根拠: follow-up turn、disconnect reload、initial history-only load で同一性が維持された
- 補足: public / internal ともに同じ source を使ってよい

### `message_id`

- 判定: 不採用
- 取得元候補: native item ID
- 根拠: stream 側 item id と history 側 item id が一致しない
- 補足: 公開用には app-owned stable key を使う

### `approval_id`

- 判定: 不採用
- 取得元候補: native server request id
- 根拠: stream 上では安定するが history 再取得では消える
- 補足: debug 相関には使えるが、公開安定 ID には runtime stable key が必要

### `turn_id`

- 判定: 採用
- 用途: internal/debug only
- 根拠: response / stream / history / reload で一致した
- 補足: 公開 API の primary ID にはしない

### `event_id`

- 判定: 不採用
- 取得元候補: native event identity
- 根拠: native `event_id` は未観測で、history からも event identity を復元できない
- 補足: app-owned event stable key を使う

## Final Signal And Status Mapping

### Message Events

- `message.user`: `item/completed` with `userMessage`
- `message.assistant.delta`: `item/agentMessage/delta`
- `message.assistant.completed`: non-empty `item/completed` with `agentMessage` または history materialization
- 補足: empty `agentMessage` は公開 projection から除外候補

### Approval Events

- `approval.requested`: server request `item/commandExecution/requestApproval`
- `approval.resolved`: `serverRequest/resolved` 単体では不十分。client reply/raw correlation が必要
- 補足: history-only では approval resource も resolution metadata も再構築できない

### Error Events

- `error.raised`: `item/completed` with `commandExecution.status = failed`
- 補足: terminal session `failed` とは切り分ける

### Status Mapping

- `running`: `thread.status = active` with empty `activeFlags`
- `waiting_input`: completed turn 後の `thread.status = idle`
- `waiting_approval`: `thread.status = active[waitingOnApproval]`
- `stopped`: `turn.status = interrupted` だけでは不十分。stop 系 raw request との相関が必要
- `failed`: native terminal session status ではなく runtime 投影前提
- `completed`: native session terminal status としては採用しない

## History Reconstruction Limits

### Reconstructable From History

- completed user/assistant messages
- in-progress commentary message
- latest `thread.status`
- latest `turn.status`
- thread / turn identity

### Not Reconstructable From History Alone

- approval request payload
- native approval request id
- approval item id
- approval resolution metadata
- event sequence
- event identity

### Timestamp Conclusion

- thread-level `updatedAt` は latest state の再読込確認には使える
- 同一状態内の event / item 順序判定には使えない
- item / approval / event 専用 timestamp は未観測

## App-Owned Required Fields

- `sequence`
- `active_approval_id`
- approval payload snapshot
- approval stable key
- event stable key
- message stable key
- session overlay
- idempotency key
- `workspace_id`

## Spec Delta Candidates

- approval public resource は native history 再構築前提にせず、runtime snapshot を正本にする
- message public resource は history 主体、stream は delta 補助に寄せる
- `session start` は native primitive と切り離して facade action と明記する
- `sequence` と `event_id` は native 由来ではなく app-owned と明記する
- `completed` / `failed` は native session terminal status と混同しない

## Cross References

- [p2-normal-turn-complete](/workspace/repos/codex-webui/artifacts/app_server_observability/observations/p2-normal-turn-complete/2026-04-01T06-39-35.575874Z-r01/judgment.md)
- [p3-approval-approve](/workspace/repos/codex-webui/artifacts/app_server_observability/observations/p3-approval-approve/2026-04-01T11-29-50.497538Z-r01/judgment.md)
- [p3-transient-failure](/workspace/repos/codex-webui/artifacts/app_server_observability/observations/p3-transient-failure/2026-04-01T14-48-00.993Z-r01/judgment.md)
- [p4-stream-disconnect-reload](/workspace/repos/codex-webui/artifacts/app_server_observability/observations/p4-stream-disconnect-reload/2026-04-01T15-02-49.912Z-r01/judgment.md)
- [p4-initial-history-only-load](/workspace/repos/codex-webui/artifacts/app_server_observability/observations/p4-initial-history-only-load/2026-04-01T17-37-18.207745Z-r01/judgment.md)
