# Phase 1 観測スパイク仕様メモ

## 1. 目的

`codex app-server` の挙動観測を、後続 Phase 2-4 で同じ形式の証跡として再実行できるように固定する。  
この文書は app-server の意味論を確定するものではなく、観測スパイクの責務、入出力、ケース実行単位、比較手順を固定するための仕様とする。

## 2. 観測スパイクの責務

- app-server と直接やり取りし、raw request / response / stream / history を保存する
- case 名、UTC 実行時刻、`session_key`、native ID の対応を同じケース単位で残す
- stream と history を同一ケースで比較できる粒度にそろえる
- 後続判断のための判定メモをテンプレートに沿って残す

次は責務に含めない。

- session / message / approval の意味論を Phase 1 だけで確定すること
- UI / public API 向けの整形
- runtime 実装への反映

## 3. 入力仕様

各ケース実行時に最低限そろえる入力は次とする。

- `case_name`
- `observed_in_tasks_phase`
- `run_key`
- `executed_at_utc`
- `session_key`
- `case_description`
- `input_summary`
- `operator_notes`

`executed_at_utc` は UTC の RFC 3339 形式で、少なくともマイクロ秒精度まで残す。  
例: `2026-04-01T15:04:05.123456Z`

`run_key` はケース配下の一意ディレクトリ名とし、`<executed_at_utc_pathsafe>-<nonce>` 形式にする。  
`executed_at_utc_pathsafe` は `YYYY-MM-DDTHH-mm-ss.ffffffZ` を使い、同一時刻衝突を避けるため `nonce` を必須とする。  
例: `2026-04-01T15-04-05.123456Z-r01`

## 4. 出力仕様

各ケース実行は、[artifacts/app_server_observability/observations/README.md](./observations/README.md) に定義した保存構造へ出力する。  
最低限の出力物は次とする。

- `metadata.md`
- `ids.md`
- `requests/`
- `responses/`
- `server_requests/`
- `server_responses/`
- `stream/`
- `history/`
- `judgment.md`

`requests/`、`responses/`、`history/` は client initiated request または turn の観測順に `0001` から採番する。
同一番号の client initiated request / response / history snapshot を比較単位とする。
approval や user input request のような server initiated JSON-RPC は `server_requests/` と `server_responses/` に分離し、同一番号で request / reply を対応付ける。

保存パスは `observations/<case_name>/<run_key>/` を正本とする。  
`observed_in_tasks_phase` は metadata に残し、保存パスには使わない。

## 5. 1 ケースの実行単位

### 開始条件

- case 名、`session_key`、入力要約を確定した時点
- まだそのケース用の raw request を送っていない時点

### 終了条件

- 期待した操作が完了している
- そのケースで発生した raw stream event を保存済みである
- 少なくとも 1 回、対応する history snapshot を保存済みである
- `judgment.md` に一次判断または `未完了` を記録済みである

### 再実行単位

- 再実行はケース全体をやり直す
- case 名は維持し、`run_key` を新しくする
- 同じ case を後続 phase で再観測しても保存先は同じ `case_name` 配下に置く
- 途中で失敗しても既存ケース結果を上書きしない

## 6. ケース命名と `session_key`

### case 名

- `p<tasks phase>-<purpose>-<shape>` を基本形とする
- 後続 Phase で予約済みの case 名を変更しない
- case 名は実装判断ではなく観測意図を表す

### `session_key`

- 観測者が付与する grouping key とする
- native `session_id` / `thread_id` / `request_id` と同一視しない
- 同じ観測セッションとして比較したいケース群で再利用する
- 書式は `sk-<YYYYMMDD>-<slug>-<nn>` とする

例:

- `sk-20260401-baseline-01`
- `sk-20260401-approval-01`

## 7. 実行メタデータの最小集合

`metadata.md` には最低限次を残す。

- `case_name`
- `observed_in_tasks_phase`
- `run_key`
- `executed_at_utc`
- `session_key`
- `app_server_version`
- `runtime_version`
- `case_description`
- `input_summary`
- `thread_id` または `unknown`
- `request_id` または `unknown`
- `operator_notes`

`app_server_version` は app-server 固有の source から記録する。
例: initialize response の `userAgent`、app-server health endpoint、server build metadata。CLI version と同一視しない。取得不能なら `unknown` と取得不能理由を書く。
`runtime_version` は `codex --version`、Docker image tag、container digest、または実行環境バージョンを記録し、取得不能なら取得不能理由を書く。`result.thread.cliVersion` は runtime / CLI version として扱う。

## 8. stream と history の比較手順

1. request または turn ごとに観測順を `0001`, `0002` と採番する
2. 対応する raw request / response を同じ番号で保存する
3. server initiated request が発生した場合は `server_requests/` と `server_responses/` を別系列で採番する
4. stream event はケース単位で時系列保存し、必要なら request 番号を注記する
5. 各 request または turn の完了後に history snapshot を取得し、同じ番号で保存する
6. `ids.md` に `session_key` / `thread_id` / `request_id` の対応を書く
7. `judgment.md` に stream と history の一致点、不一致点、保留理由を書く
8. prior phase のケース再観測時は `observed_in_tasks_phase` に実施 phase を記録する

差分が出た場合は観測失敗として消さず、そのまま証跡として残した上で判定欄に反映する。

## 9. 保留時デフォルト判断の書き方

- `未観測` と `保留だが先行可` を混同しない
- `未完了` の場合は、何が未観測かを必ず書く
- `保留だが先行可` の場合は、先に進むための暫定判断を必ず書く
- 再観測先が決まっている場合は、対象の `tasks Phase` と case 名を書く

## 10. Phase 1 の成果物

- [ケース一覧](./phase_1_case_registry.md)
- [ログ保存ルール](./observations/README.md)
- [判定メモ雛形](./phase_1_judgment_template.md)
