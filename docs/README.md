# docs

このディレクトリは、要件・仕様・検証計画などの正本ドキュメントを置くための領域とする。

## 配置方針

- `requirements/`: 何を作るかを定義する文書を置く
- `specs/`: どう作るかを定義する仕様書を置く
- `validation/`: 検証計画、確認観点、設計判断の正本を置く
- `docs/` 直下: まだ分類先を確定していない文書、またはカテゴリ横断の案内文書だけを置く

## 現在の構成

- `requirements/codex_webui_mvp_requirements_v0_8.md`
- `specs/codex_webui_common_spec_v0_8.md`
- `specs/codex_webui_public_api_v0_8.md`
- `specs/codex_webui_internal_api_v0_8.md`
- `validation/app_server_behavior_validation_plan_checklist.md`
- `codex_webui_mvp_roadmap_v0_1.md`

## 関連ディレクトリとの責務分離

- `tasks/`: 実施手順、フェーズ分割、更新責務などの作業指示書を置く
- `artifacts/`: 観測ログ、証跡、判定メモなどの実行結果を置く
- `docs/`: 実行結果を受けて維持される正本ドキュメントを置く

## 命名ルール

- 既存文書との整合を優先し、当面は現在のファイル名を維持する
- 新規追加時は、文書種別ではなく内容が属するカテゴリに応じて配置する
- 1 つのファイルが複数カテゴリの責務を持つ場合は、必要に応じて分割を検討する
