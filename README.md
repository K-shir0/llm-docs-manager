# llm-docs-manager

GitHub テンプレートリポジトリから最新のプロジェクト規約と設計書テンプレートを自動同期するツールです。

## 概要

このツールは [K-shir0/docs-boilerplate-llm](https://github.com/K-shir0/docs-boilerplate-llm) リポジトリから以下のファイルを取得し、プロジェクトに反映します：

- `CLAUDE.md` - プロジェクト規約
- `docs/design.md.sample` - 設計書テンプレート

## クイックスタート

### GitHubから直接実行（推奨）

プロジェクトのルートディレクトリで以下を実行してください：

```bash
bunx --bun github:K-shir0/llm-docs-manager
```

この方法のメリット：
- インストール不要
- 常に最新版を実行
- どこからでも実行可能

### 最新版の実行を保証する

```bash
# キャッシュをクリア
bun pm cache rm && bunx --bun github:K-shir0/llm-docs-manager

# または --force フラグを使用
bunx --force --bun github:K-shir0/llm-docs-manager
```

## 機能

- GitHub API からテンプレートファイルを自動取得
- ローカルファイルへの自動書き込み
- デバッグモード対応
- タイムアウト処理（30秒）
- エラーハンドリング（404、403 レート制限など）
- 書き込み検証機能

## 使い方

### 方法1: GitHubから直接実行（bunx）

```bash
bunx --bun github:K-shir0/llm-docs-manager
```

### 方法2: ローカルで開発用に実行

このリポジトリをクローンして実行：

```bash
git clone https://github.com/K-shir0/llm-docs-manager.git
cd llm-docs-manager
bun run update
```

### デバッグモード

詳細情報を表示：

```bash
DEBUG=1 bunx --bun github:K-shir0/llm-docs-manager
```

デバッグモードで表示される情報：
- 現在の作業ディレクトリ
- ツールのバージョン
- プロジェクトルート
- ソースURL
- ファイルのバイト数
- コンテンツの差分
- 書き込み検証結果

## トラブルシューティング

### 古いバージョンが実行される

**症状**: GitHub を更新しても古いバージョンが実行される

**解決方法**:
```bash
# キャッシュをクリア
bun pm cache rm && bunx --bun github:K-shir0/llm-docs-manager

# デバッグモードでバージョンを確認
DEBUG=1 bunx --force --bun github:K-shir0/llm-docs-manager
```

### ファイルが更新されない

**解決方法**:
```bash
# デバッグモードで詳細を確認
DEBUG=1 bunx --bun github:K-shir0/llm-docs-manager

# パーミッションを確認
ls -la CLAUDE.md docs/design.md.sample
```

### ネットワークエラー

**症状**: `Network error` または `Request timed out`

**解決方法**:
- インターネット接続を確認
- GitHub へのアクセスが可能か確認
- プロキシ設定を確認

### レート制限エラー

**症状**: `GitHub API rate limit exceeded`

**原因**: 認証なしの GitHub API は 60 リクエスト/時間に制限されています

**解決方法**: 1時間待ってから再試行

## 技術仕様

### 依存関係

- **ランタイム**: Bun 1.0 以降
- **外部依存**: なし（Bun の標準 API のみ使用）

### 使用API

- Bun 組み込み `fetch()` - HTTP リクエスト
- `Bun.write()` / `Bun.file()` - ファイル I/O
- `process.cwd()` - カレントディレクトリ取得

### プロジェクト構造

```
llm-docs-manager/
├── index.ts                       # メインロジック
├── package.json                   # プロジェクト設定
├── tsconfig.json                  # TypeScript 設定
├── docs/
│   ├── requirements/
│   │   └── template-sync.md      # 要件定義書
│   └── design.md.sample          # 設計書テンプレート（同期対象）
├── CLAUDE.md                      # プロジェクト規約（同期対象）
└── README.md                      # このファイル
```

## 開発

### ローカル開発での実行

```bash
# 通常実行
bun run update

# または直接実行
bun run index.ts

# デバッグモード
DEBUG=1 bun run update
```

### コミット前チェック

```bash
# TypeScript 型チェック
bun run index.ts

# テストとして実際にファイル同期
DEBUG=1 bun run update
```

## ライセンス

このプロジェクトは個人利用向けです。

## 関連リンク

- [K-shir0/docs-boilerplate-llm](https://github.com/K-shir0/docs-boilerplate-llm) - テンプレートリポジトリ
- [Bun](https://bun.sh) - JavaScript ランタイム
- [要件定義書](./docs/requirements/template-sync.md) - 詳細仕様
