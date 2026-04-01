# Phase 1 ケース一覧

Phase 1 完了時点で予約する case 名と責務を以下に固定する。  
各ケースの raw 証跡は [artifacts/app_server_observability/observations/README.md](./observations/README.md) の構造で保存する。

## tasks Phase 2

| case_name | 目的 | 最低限残すもの |
| --- | --- | --- |
| `p2-normal-turn-complete` | 通常 1 turn 完了時の item / signal / status を観測する | request, response, stream, history, judgment |
| `p2-no-assistant-message` | assistant message が出ない turn を観測する | request, response, stream, history, judgment |
| `p2-multi-turn-follow-up` | follow-up turn の thread 再利用と status 戻りを観測する | request, response, stream, history, judgment |
| `p2-create-start-semantics` | create / start の初期意味論を観測する | request, response, history, judgment |

## tasks Phase 3

| case_name | 目的 | 最低限残すもの |
| --- | --- | --- |
| `p3-approval-approve` | approval request と approve 後変化を観測する | request, response, stream, history, judgment |
| `p3-approval-deny` | approval request と deny 後変化を観測する | request, response, stream, history, judgment |
| `p3-approval-stop` | approval 中 stop の差分を観測する | request, response, stream, history, judgment |
| `p3-stop-during-running` | 通常実行中 stop の差分を観測する | request, response, stream, history, judgment |
| `p3-transient-failure` | 一時失敗と終端失敗の切り分け根拠を観測する | request, response, stream, history, judgment |
| `p3-stop-close-to-approval-resolve` | stop と approval resolve 近接時の競合を観測する | request, response, stream, history, judgment |

## tasks Phase 4

| case_name | 目的 | 最低限残すもの |
| --- | --- | --- |
| `p4-stream-disconnect-reload` | SSE 切断後の再取得整合を観測する | request, response, stream, history, judgment |
| `p4-initial-history-only-load` | stream 未接続の初回復元を観測する | request, response, history, judgment |

## 共通ルール

- case 名はこの一覧を正本とする
- 再実行しても case 名は変えない
- 派生ケースを追加する場合は、既存 case 名を流用せず新しい case 名を採番する
- 各ケースの判定メモは [artifacts/app_server_observability/phase_1_judgment_template.md](./phase_1_judgment_template.md) を起点にする
