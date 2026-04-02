# No Stream Capture

- case_name: `p4-initial-history-only-load`
- reason: connection B では stream を購読せず、初回 `thread/read(includeTurns=true)` のみを観測対象にした。
- setup_note: connection A で pending approval の thread を作成したが、その通知群はこのケースの正本 stream として保存しない。
- consequence: approval request payload と event sequence は history-only load から再構築できる範囲だけを判定対象にする。
