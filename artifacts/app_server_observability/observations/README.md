# app-server 観測成果物保存ルール

このディレクトリは app-server 観測成果物の raw 証跡正本とする。  
Phase 1 完了後は、`tasks/` ではなくこの配下に同じ構造で成果物を残す。

## 1. ルート構造

```text
artifacts/app_server_observability/
  phase_1_observability_spike_spec.md
  phase_1_case_registry.md
  phase_1_judgment_template.md
  observations/
    <case_name>/
      <run_key>/
        metadata.md
        ids.md
        judgment.md
        requests/
        responses/
        server_requests/
        server_responses/
        stream/
        history/
```

例:

```text
artifacts/app_server_observability/
  observations/
    p2-normal-turn-complete/
      2026-04-01T15-04-05.123456Z-r01/
        metadata.md
        ids.md
        judgment.md
        requests/request-0001.json
        responses/response-0001.json
        server_requests/server-request-0001.json
        server_responses/server-response-0001.json
        stream/events.ndjson
        history/history-0001.json
```

## 2. ディレクトリ命名

- `<case_name>` は [artifacts/app_server_observability/phase_1_case_registry.md](../phase_1_case_registry.md) の予約名を使う
- `<run_key>` は `<executed_at_utc_pathsafe>-<nonce>` とする
- `executed_at_utc_pathsafe` は `YYYY-MM-DDTHH-mm-ss.ffffffZ` を使う
- `nonce` は同一時刻衝突を避けるため必須とし、`r01`, `r02` のような短い連番でよい
- どの tasks Phase で再観測したかはパスに入れず、`metadata.md` の `observed_in_tasks_phase` に残す

## 3. ファイル責務

- `metadata.md`: ケース説明、入力要約、バージョン、実行メタデータ
- `ids.md`: `session_key` / `thread_id` / `request_id` の対応
- `judgment.md`: 判定欄、保留理由、先行用デフォルト判断
- `requests/`: client initiated raw request
- `responses/`: client initiated raw response
- `server_requests/`: server initiated raw request
- `server_responses/`: client reply to server initiated request
- `stream/`: raw stream event
- `history/`: raw history snapshot

## 4. 採番ルール

- client initiated request / response / history snapshot は観測順に `0001` から採番する
- 対応する client initiated raw request / response / history は同じ番号にそろえる
- server initiated request / response があるケースでは `server-request-0001.json` と `server-response-0001.json` のように別系列で採番する
- server initiated request とその reply は同じ番号でそろえる
- stream はケース単位の時系列保存を基本とし、必要なら request 番号を行メモで補う

命名例:

- `requests/request-0001.json`
- `responses/response-0001.json`
- `server_requests/server-request-0001.json`
- `server_responses/server-response-0001.json`
- `history/history-0001.json`
- `stream/events.ndjson`

JSON に落としにくい raw payload は `.txt` で保存してよいが、番号とファイル責務は変えない。

## 5. ケース完了時の必須ファイル

最低限、次がそろっていれば Phase 1 の保存ルールを満たす。

- `metadata.md`
- `ids.md`
- `judgment.md`
- `requests/` 内の 1 件以上の raw request
- `responses/` 内の対応する raw response
- approval や user input request を含むケースでは `server_requests/` 内の 1 件以上の raw server request
- approval や user input request に reply したケースでは `server_responses/` 内の対応する raw client reply
- `stream/` 内の raw stream event または空である理由のメモ
- `history/` 内の 1 件以上の history snapshot

## 6. 比較ルール

- 同一ケース内では request または turn 番号で比較する
- 同一ケースの全実行は常に `observations/<case_name>/` 配下で辿る
- ケース間では `session_key` を共通キーとして比較する
- 差分や欠落があっても raw 証跡を削除せず、`judgment.md` に反映する

## 7. テンプレート参照

- `metadata.md` は [artifacts/app_server_observability/phase_1_observability_spike_spec.md](../phase_1_observability_spike_spec.md) のメタデータ項目に従う
- `judgment.md` は [artifacts/app_server_observability/phase_1_judgment_template.md](../phase_1_judgment_template.md) を起点に作る
