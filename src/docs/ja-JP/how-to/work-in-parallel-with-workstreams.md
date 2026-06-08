# ワークストリームを使って複数の領域を並行して進める方法

**目標:** バックエンド API、フロントエンドダッシュボード、インフラなど、異なるマイルストーン領域を並行して作業する際に、各領域の計画状態が互いに干渉しないようにする。

**前提条件:** eCL Core プロジェクトが有効な状態（`.planning/ROADMAP.md` が存在する）であること。存在しない場合は、まず `/ecl-new-project` を実行してください。

---

## ワークストリームとは

ワークストリームは、単一のコードベース内で独立した計画コンテキストを持つ仕組みです。各ワークストリームには専用の `.planning/workstreams/<name>/` サブツリーが作成され、独立した `STATE.md`、`ROADMAP.md`、`REQUIREMENTS.md`、`phases/` ディレクトリが含まれます。コードベース本体（ソースコード、git 履歴、ブランチ）はすべてのワークストリームで共有されます。

```
.planning/
├── PROJECT.md          ← 共有
├── config.json         ← 共有
├── codebase/           ← 共有
└── workstreams/
    ├── backend-api/
    │   ├── STATE.md
    │   ├── ROADMAP.md
    │   ├── REQUIREMENTS.md
    │   └── phases/
    └── frontend-dash/
        ├── STATE.md
        ├── ROADMAP.md
        ├── REQUIREMENTS.md
        └── phases/
```

ワークストリームがアクティブな間、すべての eCL コマンド（`/ecl-progress`、`/ecl-discuss-phase`、`/ecl-plan-phase`、`/ecl-execute-phase`）はそのワークストリームのディレクトリを読み書き対象とします。ワークストリームを切り替えると、ソースツリーに触れることなく、これらすべてのコマンドが別のサブツリーを対象とするようになります。

---

## ワークストリームを作成する

```bash
/ecl-workstreams create backend-api
```

eCL は `.planning/workstreams/backend-api/` 以下にワークストリームディレクトリを作成し、`STATE.md` と `ROADMAP.md` の雛形を生成します。ワークストリームは自動的にアクティブ化されません。明示的に切り替えを行う必要があります。

---

## ワークストリームを一覧表示する

```bash
/ecl-workstreams list
```

すべてのワークストリームと、現在のセッションでアクティブなワークストリームを表示します。

---

## ワークストリームに切り替える

```bash
/ecl-workstreams switch backend-api
```

これ以降、すべての eCL ワークフローコマンドは `backend-api` コンテキストで動作します。切り替えはセッションスコープで行われます。同じリポジトリで複数の Claude Code ターミナルが開いている場合、各セッションで異なるアクティブワークストリームを保持でき、互いに干渉しません。

切り替え後は、通常のフェーズワークフローを進めてください。

```bash
/ecl-discuss-phase 1
/ecl-plan-phase 1
/ecl-execute-phase 1
/ecl-verify-work 1
```

別の領域を作業する場合は、2 つ目のターミナルでワークストリームを切り替えます。

```bash
/ecl-workstreams switch frontend-dash
/ecl-discuss-phase 1
/ecl-plan-phase 1
```

---

## すべてのワークストリームの進捗を確認する

```bash
/ecl-workstreams progress
```

すべてのワークストリームのフェーズ状態、現在位置、残作業をクロスワークストリームでまとめて表示します。切り替えなしで確認できます。

特定のワークストリームの詳細なステータスを確認する場合は：

```bash
/ecl-workstreams status backend-api
```

---

## ワークストリームの作業を再開する

コンテキストリセットや新しいセッションの後に、作業位置を復元します。

```bash
/ecl-workstreams resume backend-api
```

このコマンドはワークストリームをアクティブ化し、最後の既知の位置を復元します。手動で切り替えてから `/ecl-resume-work` を実行するのと同等です。

---

## 完了したワークストリームをアーカイブする

ワークストリームのマイルストーン作業が完了したら：

```bash
/ecl-workstreams complete backend-api
```

eCL はワークストリームをアーカイブ済みとしてマークし、アクティブ一覧から除外します。計画成果物は監査目的のため `.planning/workstreams/backend-api/` 以下に保持されます。

---

## セッションのアクティブコンテキストを変更せずに特定のワークストリームにコマンドを実行する

セッションのアクティブコンテキストを変更せず、特定のワークストリームに対して 1 つのコマンドだけを実行したい場合は、`--ws` フラグを使用します。

```bash
/ecl-progress --ws frontend-dash
/ecl-plan-phase 2 --ws backend-api
```

`--ws` は解決順序で最高優先度を持ち、セッションスコープのポインタは変更しません。

---

## ワークスペースではなくワークストリームを選ぶ場面

ワークストリームを選ぶべき場合：

- すべての作業が**同一リポジトリ**内にあり、同じ git 履歴を共有している
- API、UI、インフラなど異なる関心領域を**並行して**計画・議論したいが、各ワークストリームの `STATE.md` が互いに上書きされないようにしたい
- 作成時にワークストリームごとの別ブランチが不要（各ワークストリームの実行中に通常どおりブランチを切ることは可能）
- 完全な git ワークツリーを作成するオーバーヘッドが、必要な分離に対して割に合わない

代わりに[ワークスペース](isolate-work-with-workspaces.md)を選ぶべき場合：

- **複数のリポジトリ**（例：`hr-ui` と `ZeymoAPI`）にまたがって作業している
- フィーチャーごとに**独立した git ワークツリー**やクローンが必要（独立したブランチ、ロックファイル、ビルド成果物）
- 各ワークスペースで `/ecl-new-project` を独立して実行し、メインリポジトリの `.planning/` のサブディレクトリではなく、完全に独立した `.planning/` ルートを持ちたい

---

## Related

- [ワークスペースで作業を分離する](isolate-work-with-workspaces.md)
- [フェーズループ](../explanation/the-phase-loop.md)
- [コマンドリファレンス](../COMMANDS.md)
- [ドキュメント一覧](../README.md)
