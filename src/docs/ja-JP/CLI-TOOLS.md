# eCL CLI ツールリファレンス

> `ecl-tools` CLI（`evolv-coder-lite/bin/ecl-tools.cjs`）のリファレンスです。スラッシュコマンドとユーザーフローについては [コマンドリファレンス](COMMANDS.md) を参照してください。[docs インデックス](README.md) に戻る。

---

## 概要

`ecl-tools.cjs` は、設定の解析、モデル解決、フェーズ検索、git コミット、サマリー検証、状態管理、テンプレート操作を eCL コマンド・ワークフロー・エージェント全体で一元化します。


|                    |                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **配置パス**       | `evolv-coder-lite/bin/ecl-tools.cjs`                                                                                                                                                                      |
| **実装**           | `evolv-coder-lite/bin/lib/` 配下の 20 個のドメインモジュール（ディレクトリが正式）                                                                                                                        |
| **ステータス**     | オーケストレーション・ワークフロー・自動化処理のための主要ランタイムコマンドサーフェス。 |


**使い方（CJS）:**

```bash
node ecl-tools.cjs <command> [args] [--raw] [--cwd <path>]
```

**グローバルフラグ（CJS）:**


| フラグ         | 説明                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| `--raw`        | 機械可読な出力（JSON またはプレーンテキスト、フォーマットなし）              |
| `--cwd <path>` | 作業ディレクトリの上書き（サンドボックス化されたサブエージェント向け）       |
| `--ws <name>`  | `.planning/workstreams/<name>` パス用のワークストリームコンテキスト |


---

## State コマンド

`.planning/STATE.md` を管理します — プロジェクトの生きた記憶です。

```bash
# プロジェクトの全設定 + 状態を JSON として読み込む
node ecl-tools.cjs state load

# STATE.md のフロントマターを JSON として出力
node ecl-tools.cjs state json

# 単一フィールドを更新
node ecl-tools.cjs state update <field> <value>

# STATE.md の内容または特定セクションを取得
node ecl-tools.cjs state get [section]

# 複数フィールドの一括更新
node ecl-tools.cjs state patch --field1 val1 --field2 val2

# プランカウンターをインクリメント
node ecl-tools.cjs state advance-plan

# 実行メトリクスを記録
node ecl-tools.cjs state record-metric --phase N --plan M --duration Xmin [--tasks N] [--files N]

# プログレスバーを再計算
node ecl-tools.cjs state update-progress

# 決定事項を追加
node ecl-tools.cjs state add-decision --summary "..." [--phase N] [--rationale "..."]
# ファイルから追加する場合:
node ecl-tools.cjs state add-decision --summary-file path [--rationale-file path]

# ブロッカーの追加・解決
node ecl-tools.cjs state add-blocker --text "..."
node ecl-tools.cjs state resolve-blocker --text "..."

# セッション継続性を記録
node ecl-tools.cjs state record-session --stopped-at "..." [--resume-file path]

# フェーズ開始 — 新しいフェーズの STATE.md Status/Last activity を更新
node ecl-tools.cjs state begin-phase --phase N --name SLUG --plans COUNT

# エージェント検出可能なブロッカーシグナル送信（discuss-phase / UI フローで使用）
node ecl-tools.cjs state signal-waiting --type TYPE --question "..." --options "A|B" --phase P
node ecl-tools.cjs state signal-resume
```

### State スナップショット

STATE.md 全体の構造化パース:

```bash
node ecl-tools.cjs state-snapshot
```

現在位置、フェーズ、プラン、ステータス、決定事項、ブロッカー、メトリクス、最終アクティビティを含む JSON を返します。

---

## Phase コマンド

フェーズを管理します — ディレクトリ、番号付け、ロードマップとの同期。

```bash
# 番号でフェーズディレクトリを検索
node ecl-tools.cjs find-phase <phase>

# 挿入用の次の小数フェーズ番号を計算
node ecl-tools.cjs phase next-decimal <phase>

# ロードマップに新しいフェーズを追加 + ディレクトリを作成
node ecl-tools.cjs phase add <description>

# 既存フェーズの後に小数フェーズを挿入
node ecl-tools.cjs phase insert <after> <description>

# フェーズを削除し、後続を振り直し
node ecl-tools.cjs phase remove <phase> [--force]

# フェーズを完了としてマークし、状態 + ロードマップを更新
node ecl-tools.cjs phase complete <phase>

# ウェーブとステータス付きでプランをインデックス化
node ecl-tools.cjs phase-plan-index <phase>

# フィルタリング付きでフェーズを一覧表示
node ecl-tools.cjs phases list [--type planned|executed|all] [--phase N] [--include-archived]
```

---

## Roadmap コマンド

`ROADMAP.md` の解析と更新。

```bash
# ROADMAP.md からフェーズセクションを抽出
node ecl-tools.cjs roadmap get-phase <phase>

# ディスク状態を含む完全なロードマップ解析
node ecl-tools.cjs roadmap analyze

# ディスクからプログレステーブル行を更新
node ecl-tools.cjs roadmap update-plan-progress <N>
```

---

## Config コマンド

`.planning/config.json` の読み書き。

```bash
# デフォルト値で config.json を初期化
node ecl-tools.cjs config-ensure-section

# 設定値をセット（ドット記法）
node ecl-tools.cjs config-set <key> <value>

# 設定値を取得
node ecl-tools.cjs config-get <key>

# モデルプロファイルを設定
node ecl-tools.cjs config-set-model-profile <profile>
```

---

## モデル解決

```bash
# 現在のプロファイルに基づいてエージェント用モデルを取得
node ecl-tools.cjs resolve-model <agent-name>
# --raw 出力では選択されたモデル ID/ティアを返します。
# JSON 出力ではプロファイルも含み、アクティブなランタイムがサポートしている場合は
# reasoning_effort も含まれます。
```

エージェント名: `ecl-planner`, `ecl-executor`, `ecl-phase-researcher`, `ecl-project-researcher`, `ecl-research-synthesizer`, `ecl-verifier`, `ecl-plan-checker`, `ecl-integration-checker`, `ecl-roadmapper`, `ecl-debugger`, `ecl-codebase-mapper`, `ecl-nyquist-auditor`

---

## Verification コマンド

プラン、フェーズ、参照、コミットを検証します。

```bash
# SUMMARY.md ファイルを検証
node ecl-tools.cjs verify-summary <path> [--check-count N]

# PLAN.md の構造 + タスクをチェック
node ecl-tools.cjs verify plan-structure <file>

# 全プランにサマリーがあるか確認
node ecl-tools.cjs verify phase-completeness <phase>

# @参照 + パスが解決可能か確認
node ecl-tools.cjs verify references <file>

# コミットハッシュの一括検証
node ecl-tools.cjs verify commits <hash1> [hash2] ...

# must_haves.artifacts をチェック
node ecl-tools.cjs verify artifacts <plan-file>

# must_haves.key_links をチェック
node ecl-tools.cjs verify key-links <plan-file>
```

---

## Validation コマンド

プロジェクトの整合性をチェックします。

```bash
# フェーズ番号、ディスク/ロードマップの同期を確認
node ecl-tools.cjs validate consistency

# .planning/ の整合性チェック、任意で修復
node ecl-tools.cjs validate health [--repair]

# ステータスライン / フック呼び出し元向けのコンテキストウィンドウ使用率をプローブ（v1.40.0）
node ecl-tools.cjs validate context

# 型付き JSON サーフェスとしてのコンテキスト使用率（#455）
node ecl-tools.cjs validate context --json
```

`validate context` は `utilization`、`status`（60% / 70% の閾値で `ok` / `warn` / `critical`）、および `suggestion` 文字列を含む構造化エンベロープを出力します。同じデータが `/ecl-health --context` を支えます。
型付き IR を直接受け取るには `--json` を渡してください（スクリプトやテストアサーションで有用）。

---

## Template コマンド

テンプレートの選択と穴埋め。

```bash
# 粒度に基づいてサマリーテンプレートを選択
node ecl-tools.cjs template select <type>

# 変数でテンプレートを穴埋め
node ecl-tools.cjs template fill <type> --phase N [--plan M] [--name "..."] [--type execute|tdd] [--wave N] [--fields '{json}']
```

`fill` のテンプレートタイプ: `summary`, `plan`, `verification`

---

## Frontmatter コマンド

任意の Markdown ファイルに対する YAML フロントマターの CRUD 操作。

```bash
# フロントマターを JSON として抽出
node ecl-tools.cjs frontmatter get <file> [--field key]

# 単一フィールドを更新
node ecl-tools.cjs frontmatter set <file> --field key --value jsonVal

# JSON をフロントマターにマージ
node ecl-tools.cjs frontmatter merge <file> --data '{json}'

# 必須フィールドを検証
node ecl-tools.cjs frontmatter validate <file> --schema plan|summary|verification
```

---

## Scaffold コマンド

事前構造化されたファイルとディレクトリを作成します。

```bash
# CONTEXT.md テンプレートを作成
node ecl-tools.cjs scaffold context --phase N

# UAT.md テンプレートを作成
node ecl-tools.cjs scaffold uat --phase N

# VERIFICATION.md テンプレートを作成
node ecl-tools.cjs scaffold verification --phase N

# フェーズディレクトリを作成
node ecl-tools.cjs scaffold phase-dir --phase N --name "phase name"
```

---

## Init コマンド（複合コンテキスト読み込み）

特定のワークフローに必要なすべてのコンテキストを一度に読み込みます。プロジェクト情報、設定、状態、ワークフロー固有のデータを含む JSON を返します。

```bash
node ecl-tools.cjs init execute-phase <phase>
node ecl-tools.cjs init plan-phase <phase>
node ecl-tools.cjs init new-project
node ecl-tools.cjs init new-milestone
node ecl-tools.cjs init quick <description>
node ecl-tools.cjs init resume
node ecl-tools.cjs init verify-work <phase>
node ecl-tools.cjs init phase-op <phase>
node ecl-tools.cjs init todos [area]
node ecl-tools.cjs init milestone-op
node ecl-tools.cjs init map-codebase
node ecl-tools.cjs init progress

# ワークストリームスコープ付き init（`--ws` フラグ）
node ecl-tools.cjs init execute-phase <phase> --ws <name>
node ecl-tools.cjs init plan-phase <phase> --ws <name>
```

**大容量ペイロードの処理:** 出力が約 50KB を超える場合、CLI は一時ファイルに書き出し、`@file:/tmp/ecl-init-XXXXX.json` を返します。ワークフローは `@file:` プレフィックスを確認し、ディスクから読み込みます:

```bash
INIT=$(node ecl-tools.cjs init execute-phase "1")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

---

## Milestone コマンド

```bash
# マイルストーンをアーカイブ
node ecl-tools.cjs milestone complete <version> [--name <name>] [--archive-phases]

# 要件を完了としてマーク
node ecl-tools.cjs requirements mark-complete <ids>
# 受け付ける形式: REQ-01,REQ-02 または REQ-01 REQ-02 または [REQ-01, REQ-02]
```

---

## エージェントスキル

指定されたエージェントタイプのスキルブロックを出力します。

```bash
# 生の XML スキルブロックを出力（デフォルト — シェル展開に安全）
node ecl-tools.cjs agent-skills <agent-type>

# 型付き JSON サーフェス（#455）を出力 — { agent_type, block, skills_count }
node ecl-tools.cjs agent-skills <agent-type> --json
```

`--json` フラグは構造化消費やテストアサーションに適した型付き IR オブジェクトを返します。デフォルト（フラグなし）はワークフローのシェル展開が依存する生の XML 出力を維持します。

---

## スキルマニフェスト

コマンド読み込みを高速化するためのスキル検出の事前計算とキャッシュ。

```bash
# スキルマニフェストを生成（.claude/skill-manifest.json に書き込む）
node ecl-tools.cjs skill-manifest

# カスタム出力パスで生成
node ecl-tools.cjs skill-manifest --output <path>
```

利用可能なすべての eCL スキルとそのメタデータ（名前、説明、ファイルパス、引数ヒント）の JSON マッピングを返します。インストーラとセッション開始フックが繰り返しのファイルシステムスキャンを避けるために使用します。

---

## ユーティリティコマンド

```bash
# テキストを URL セーフなスラッグに変換
node ecl-tools.cjs generate-slug "Some Text Here"
# → some-text-here

# タイムスタンプを取得
node ecl-tools.cjs current-timestamp [full|date|filename]

# 保留中の TODO をカウントして一覧表示
node ecl-tools.cjs list-todos [area]

# ファイル/ディレクトリの存在確認
node ecl-tools.cjs verify-path-exists <path>

# 全 SUMMARY.md データを集約
node ecl-tools.cjs history-digest

# SUMMARY.md から構造化データを抽出
node ecl-tools.cjs summary-extract <path> [--fields field1,field2]

# プロジェクト統計
node ecl-tools.cjs stats [json|table]

# 進捗表示（人間が読める形式）
node ecl-tools.cjs progress [json|table|bar]

# 型付き JSON サーフェスとしての進捗（#455）
node ecl-tools.cjs progress --json

# TODO を完了にする
node ecl-tools.cjs todo complete <filename>

# UAT 監査 — 全フェーズの未解決項目をスキャン
node ecl-tools.cjs audit-uat

# クロスアーティファクト監査キュー — `.planning/` の未解決監査項目をスキャン
node ecl-tools.cjs audit-open [--json]

# eCL-2 プロジェクトを現在の構造にリバースマイグレーション（`/ecl-import --from-ecl2` のバックエンド）
node ecl-tools.cjs from-ecl2 [--path <dir>] [--force] [--dry-run]

# 設定チェック付き git コミット
node ecl-tools.cjs commit <message> [--files f1 f2] [--amend] [--no-verify] [--respect-staged]
```

> `--no-verify`: プリコミットフックをスキップします。ウェーブベース実行時に並列エグゼキューターエージェントがビルドロックの競合（例: Rust プロジェクトでの cargo ロック競合）を避けるために使用します。オーケストレーターは各ウェーブ完了後にフックを一度実行します。順次実行時には `--no-verify` を使用せず、フックを通常通り実行してください。
> `--files <paths>` **ステージング動作**: デフォルトでは、`--files` はコミット前に各指定ファイルに対して `git add -- <path>` を実行します。これにより `git add -p` で設定したハンク単位のステージングが上書きされます。`git add` ステップをスキップして指定パス内のステージング済みファイルのみをコミットするには `--respect-staged` を渡してください。そのスコープ内でステージングされたファイルがない場合、コマンドはエラーなしで `{ committed: false, reason: 'nothing staged' }` を返します。コミット時の末尾 `-- <paths>` パス指定は両モードで適用されるため、`--files` スコープ外でステージングされたファイルは決して含まれません（#3061 不変条件）。

# Web 検索（Brave API キーが必要）
node ecl-tools.cjs websearch <query> [--limit N] [--freshness day|week|month]
```

---

## Graphify

`.planning/graphs/` 内のプロジェクトナレッジグラフをビルド、クエリ、検査します。`config.json` で `graphify.enabled: true` が必要です（[設定リファレンス](CONFIGURATION.md#graphify-settings) を参照）。

```bash
# ナレッジグラフをビルドまたは再ビルド
node ecl-tools.cjs graphify build

# グラフで用語を検索
node ecl-tools.cjs graphify query <term>

# グラフの鮮度と統計を表示
node ecl-tools.cjs graphify status

# 前回のビルドからの変更を表示
node ecl-tools.cjs graphify diff

# 現在のグラフの名前付きスナップショットを書き込む
node ecl-tools.cjs graphify snapshot [name]
```

ユーザー向けエントリーポイント: `/ecl-graphify`（[コマンドリファレンス](COMMANDS.md#ecl-graphify) を参照）。

---

## モジュールアーキテクチャ

| モジュール | ファイル | エクスポート |
|------------|----------|--------------|
| Core | `lib/core.cjs` | `error()`, `output()`, `parseArgs()`、共通ユーティリティ、互換性再エクスポート |
| State | `lib/state.cjs` | すべての `state` サブコマンド、`state-snapshot` |
| Phase | `lib/phase.cjs` | フェーズ CRUD、`find-phase`、`phase-plan-index`、`phases list` |
| Planning Workspace | `lib/planning-workspace.cjs` | プランニングシーム: `planningDir`、`planningPaths`、アクティブワークストリームルーティング、`.planning/.lock` |
| Roadmap | `lib/roadmap.cjs` | ロードマップ解析、フェーズ抽出、進捗更新 |
| Config | `lib/config.cjs` | 設定の読み書き、セクション初期化 |
| Verify | `lib/verify.cjs` | すべての検証・バリデーションコマンド |
| Template | `lib/template.cjs` | テンプレート選択と変数の穴埋め |
| Frontmatter | `lib/frontmatter.cjs` | YAML フロントマター CRUD |
| Init | `lib/init.cjs` | 全ワークフロー向け複合コンテキスト読み込み |
| Milestone | `lib/milestone.cjs` | マイルストーンアーカイブ、要件マーキング |
| Commands | `lib/commands.cjs` | その他: slug、タイムスタンプ、TODO、scaffold、統計、Web 検索 |
| Model Profiles | `lib/model-profiles.cjs` | プロファイル解決テーブル |
| UAT | `lib/uat.cjs` | 全フェーズ横断 UAT/検証監査 |
| Profile Output | `lib/profile-output.cjs` | 開発者プロファイルのフォーマット |
| Profile Pipeline | `lib/profile-pipeline.cjs` | セッション分析パイプライン |
| Graphify | `lib/graphify.cjs` | ナレッジグラフのビルド/クエリ/ステータス/差分/スナップショット（`/ecl-graphify` のバックエンド） |
| Learnings | `lib/learnings.cjs` | フェーズ/SUMMARY アーティファクトからの学習抽出（`/ecl-extract-learnings` のバックエンド） |
| Audit | `lib/audit.cjs` | フェーズ/マイルストーン監査キューハンドラ; `audit-open` ヘルパー |
| GSD2 Import | `lib/ecl2-import.cjs` | eCL-2 プロジェクトからのリバースマイグレーションインポーター（`/ecl-import --from-ecl2` のバックエンド） |
| Intel | `lib/intel.cjs` | クエリ可能なコードベースインテリジェンスインデックス（`/ecl-map-codebase --query` のバックエンド） |

---

## レビュアー CLI ルーティング

`review.models.<cli>` はレビュアーフレーバーをコードレビューワークフローが呼び出すシェルコマンドにマッピングします。[`/ecl-config --integrations`](COMMANDS.md#ecl-config) または直接設定できます:

```bash
node ecl-tools.cjs config-set review.models.codex    "codex exec --model gpt-5"
node ecl-tools.cjs config-set review.models.gemini   "gemini -m gemini-2.5-pro"
node ecl-tools.cjs config-set review.models.opencode "opencode run --model claude-sonnet-4"
node ecl-tools.cjs config-set review.models.claude   ""   # クリア — セッションモデルにフォールバック
```

スラッグは `[a-zA-Z0-9_-]+` に対してバリデーションされます。空またはパスを含むスラッグは拒否されます。完全なフィールドリファレンスは [`docs/CONFIGURATION.md`](CONFIGURATION.md#code-review-cli-routing) を参照してください。

## シークレット処理

`/ecl-settings` で設定された API キー（`brave_search`、`firecrawl`、`exa_search`）は `.planning/config.json` に平文で書き込まれますが、`config-set` / `config-get` のすべての出力、確認テーブル、インタラクティブプロンプトでは（`****<last-4>` として）マスクされます。マスキングの実装は `evolv-coder-lite/bin/lib/secrets.cjs` を参照してください。`config.json` ファイル自体がセキュリティ境界です — ファイルシステムのパーミッションで保護し、git には含めないようにしてください（`.planning/` はデフォルトで gitignore されます）。

---

## Related

- [Commands](COMMANDS.md)
- [Configuration](CONFIGURATION.md)
- [Architecture](ARCHITECTURE.md)
- [docs index](README.md)
