# .claude/agents/ と .claude/commands/ 同期機能実装

## 概要

* 既存の `.claude/skills/` 同期パターンを拡張し、`.claude/agents/` と `.claude/commands/` ディレクトリもテンプレートリポジトリから自動同期する機能を追加します
* 既存のディレクトリ同期機能（`syncDirectory`）を再利用し、設定ファイルへのエントリ追加のみで実現します
* これにより、複数プロジェクト間で Claude Code のエージェント定義とカスタムコマンドを統一管理できます

## 背景

* 現状の課題
	* Claude Code では `.claude/agents/` と `.claude/commands/` ディレクトリでプロジェクト固有のエージェントとコマンドを定義可能
	* テンプレートリポジトリ (K-shir0/docs-boilerplate-llm) に定義ファイルを管理したい
	* 既存の同期ツールは `.claude/skills/` のみ対応
* 技術的背景
	* `.claude/skills/` 同期で実装済みの `syncDirectory` 関数を再利用可能
	* 設定ファイル `FILES_TO_SYNC` への追加のみで対応可能
* スコープ
	* 対象: `.claude/agents/` と `.claude/commands/` ディレクトリの同期
	* 対象外: 新規コード実装、エージェント/コマンドの自動登録機能

## ゴールと非ゴール

* ゴール
	* `.claude/agents/` と `.claude/commands/` ディレクトリの自動同期機能を追加
	* `.claude/skills/` と同じパターンでの統一管理
	* 既存機能との完全互換性維持
	* テンプレートリポジトリとの一元管理
* 非ゴール
	* エージェント/コマンドの自動検出・登録機能
	* `.claude/settings.local.json` の自動更新
	* 差分同期やキャッシング機能の追加
	* 新規コード実装（既存機能を活用）

## 詳細設計

### アーキテクチャ

* 既存のディレクトリ同期機構を活用
* 処理フロー
	* ユーザーが `bunx github:K-shir0/llm-docs-manager` を実行
	* `FILES_TO_SYNC` を走査
	* `.claude/agents/` エントリを検出
		* `syncDirectory` でディレクトリ全体を同期
		* `fetchDirectoryTree` で GitHub Contents API からディレクトリ構造取得
		* 各ファイルをループ処理して同期
	* `.claude/commands/` エントリを検出
		* 同様に `syncDirectory` で同期

### ディレクトリ構造

* `.claude/agents/` の構造
	* skills と同じパターンを採用
	* 各エージェントはサブディレクトリに定義ファイルを配置
	* 例: `.claude/agents/example-agent/AGENT.md`
* `.claude/commands/` の構造
	* 同様のパターン
	* 例: `.claude/commands/example-command/COMMAND.md`
* サンプル構造

```
.claude/
├── skills/
│   ├── markdown-skills/
│   │   └── SKILL.md
│   └── code-intelligence/
│       └── SKILL.md
├── agents/
│   └── example-agent/
│       └── AGENT.md
└── commands/
    └── example-command/
        └── COMMAND.md
```

### 実装詳細

* 同期対象の追加
	* `FILES_TO_SYNC` 配列に 2 つのエントリを追加

```typescript
const FILES_TO_SYNC: FileConfig[] = [
	{
		path: "CLAUDE.md",
		destination: "CLAUDE.md",
	},
	{
		path: "docs/design.md.sample",
		destination: "docs/design.md.sample",
	},
	{
		path: ".claude/skills",
		destination: ".claude/skills",
		isDirectory: true,
	},
	{
		path: ".claude/agents",
		destination: ".claude/agents",
		isDirectory: true,
	},
	{
		path: ".claude/commands",
		destination: ".claude/commands",
		isDirectory: true,
	},
];
```

* 既存関数の活用
	* `syncDirectory`: そのまま再利用
	* `fetchDirectoryTree`: そのまま再利用
	* `ensureDirectoryExists`: そのまま再利用
	* `fetchFile`: そのまま再利用
	* `updateFile`: そのまま再利用
* 新規実装: なし（設定追加のみ）

### テンプレートリポジトリの準備

* K-shir0/docs-boilerplate-llm リポジトリに以下を追加
	* `.claude/agents/` ディレクトリ
	* `.claude/commands/` ディレクトリ
	* 各ディレクトリにサンプル定義ファイルを配置

### エージェント定義ファイル例

* `.claude/agents/example-agent/AGENT.md`

```markdown
---
name: example-agent
description: "サンプルエージェント - 複雑なタスクを自律的に処理"
---

# Example Agent

## 概要 (Overview)

このエージェントは、複数ステップのタスクを自律的に実行するサンプルです。

## 用途 (Use Cases)

* 複雑な検索・分析タスクの実行
* コードベースの探索と情報収集

## ツールアクセス (Available Tools)

* Read, Write, Edit
* Grep, Glob
* Bash
```

### コマンド定義ファイル例

* `.claude/commands/example-command/COMMAND.md`

```markdown
---
name: example
description: "サンプルコマンド - カスタムワークフローの実行"
---

# Example Command

## 概要 (Overview)

頻繁に実行するタスクをショートカットとして登録するサンプルです。

## 使用方法 (Usage)

```bash
/example [引数]
```
```

### エラーハンドリング

* 既存のエラーケースと同じ処理
	* ディレクトリが見つからない（404）: エラーメッセージ表示、処理継続
	* ディレクトリが空（ファイル数 0）: 警告表示、処理スキップ
	* ディレクトリ作成失敗: エラーメッセージ表示、終了
	* GitHub API レート制限（403）: レート制限メッセージ表示、終了

### GitHub API レート制限への配慮

* 現状
	* 認証なしの GitHub API: 60 リクエスト/時間
	* skills 同期後: 3-4 リクエスト/実行
* agents と commands 追加後
	* agents ディレクトリツリー取得: 1-2 リクエスト
	* commands ディレクトリツリー取得: 1-2 リクエスト
	* 合計: 5-8 リクエスト/実行
* 結論: レート制限の範囲内で十分実行可能

## その他の関心事

### 実装計画

* Phase 1: テンプレートリポジトリの準備
	* K-shir0/docs-boilerplate-llm に `.claude/agents/` を追加
	* サンプル定義ファイル `example-agent/AGENT.md` を作成
	* K-shir0/docs-boilerplate-llm に `.claude/commands/` を追加
	* サンプル定義ファイル `example-command/COMMAND.md` を作成
* Phase 2: 同期設定の追加
	* `index.ts` の `FILES_TO_SYNC` に 2 エントリ追加
	* コード変更は 8 行のみ（エントリ追加のみ）
* Phase 3: 設計書の作成
	* `docs/feat/agents-commands-sync.md` を作成（本ドキュメント）
	* skills 同期設計書をベースに作成
* Phase 4: 動作確認
	* テンプレートリポジトリへのプッシュ
	* `bun run update` コマンドで同期テスト
	* `.claude/agents/` と `.claude/commands/` が正しく同期されることを確認

### 影響範囲

* 変更されるファイル
	* `index.ts`: `FILES_TO_SYNC` 配列に 2 エントリ追加（8 行）
	* `docs/feat/agents-commands-sync.md`: 本設計書（新規作成）
* テンプレートリポジトリ
	* `.claude/agents/example-agent/AGENT.md`: 新規作成
	* `.claude/commands/example-command/COMMAND.md`: 新規作成
* 互換性
	* 既存機能との完全互換: 変更なし
	* 後方互換性: 問題なし（設定追加のみ）
* 同期されるファイル（実装後）
	* `CLAUDE.md`: プロジェクト規約書（既存）
	* `docs/design.md.sample`: 設計書テンプレート（既存）
	* `.claude/skills/`: スキル定義（既存）
	* `.claude/agents/`: エージェント定義（新規）
	* `.claude/commands/`: コマンド定義（新規）

### テスト計画

* 統合テスト
	* テストケース 1: 既存機能のリグレッションテスト
		* 実行前: CLAUDE.md、docs/design.md.sample、.claude/skills/ を削除
		* 実行: bun run update
		* 検証: すべてのファイルが同期されることを確認
	* テストケース 2: agents ディレクトリ同期
		* 実行前: .claude/agents/ を削除
		* 実行: bun run update
		* 検証: .claude/agents/example-agent/AGENT.md が同期されることを確認
	* テストケース 3: commands ディレクトリ同期
		* 実行前: .claude/commands/ を削除
		* 実行: bun run update
		* 検証: .claude/commands/example-command/COMMAND.md が同期されることを確認
	* テストケース 4: デバッグモード
		* 実行: DEBUG=1 bun run update
		* 検証: agents と commands のデバッグログが表示されることを確認
* エラーケーステスト
	* テストケース 1: テンプレートリポジトリに agents が未作成
		* 期待結果: "Directory not found: .claude/agents" エラー、処理継続
	* テストケース 2: 空のディレクトリ
		* 期待結果: 警告メッセージ表示、処理スキップ

### セキュリティ考慮事項

* 既存実装と同じセキュリティレベル
	* パストラバーサル対策: 実装済み
	* HTTPS 通信: すべて暗号化済み
	* 権限管理: プロジェクトルート配下に限定
* 追加リスク: なし（設定追加のみのため）

### パフォーマンス

* 実行時間の見積もり
	* 既存同期（CLAUDE.md、design.md.sample、skills）: 2-4 秒
	* agents ツリー取得: 0.5-1 秒
	* agents ファイル取得: 0.5-1 秒
	* commands ツリー取得: 0.5-1 秒
	* commands ファイル取得: 0.5-1 秒
	* 合計: 4-8 秒（現在: 2-4 秒）
* 結論: パフォーマンスへの影響は軽微（+2-4 秒程度）

### トラブルシューティング

* 問題: `.claude/agents/` が同期されない
	* 原因の確認
		* デバッグモードで実行: DEBUG=1 bun run update
		* "Syncing directory .claude/agents..." が表示されるか確認
		* エラーメッセージがないか確認
	* 解決策
		* テンプレートリポジトリに `.claude/agents/` が存在するか確認
		* GitHub リポジトリ (K-shir0/docs-boilerplate-llm) にアクセス可能か確認
* 問題: `.claude/commands/` が同期されない
	* 原因・解決策: agents と同様
* 問題: "Directory not found" エラー
	* 原因: テンプレートリポジトリにディレクトリが未作成
	* 解決策
		* テンプレートリポジトリを確認
		* Phase 1 が完了しているか確認
		* 完了していない場合はテンプレート側を先に準備

### エージェント・コマンドの利用方法

* エージェントの登録
	* 同期後、`.claude/settings.local.json` で permissions を設定
	* 例: `"Task(example-agent)"`
* カスタムコマンドの登録
	* Claude Code が `.claude/commands/` を自動検出
	* `/example` のように利用可能
* サンプルファイルのカスタマイズ
	* 同期されたサンプルファイルを編集
	* プロジェクト固有のエージェント・コマンドを定義
	* 次回同期時に上書きされるため、独自ファイルは別名で作成推奨

## 関連リンク

* [親設計書: .claude/skills/ 同期機能実装](./skills-sync.md)
* [親要件定義: GitHub テンプレート同期ツール](../requirements/template-sync.md)
* [K-shir0/docs-boilerplate-llm](https://github.com/K-shir0/docs-boilerplate-llm)
* [GitHub Contents API](https://docs.github.com/en/rest/repos/contents)
* [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
