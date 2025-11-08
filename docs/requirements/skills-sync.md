# .claude/skills/ 同期機能実装

## 概要

* 既存の GitHub テンプレート同期ツールを拡張し、`.claude/skills/` ディレクトリをテンプレートリポジトリから自動同期する機能を追加します
* 現在はファイル単位の同期（`CLAUDE.md`、`docs/design.md.sample`）のみ対応していますが、ディレクトリ全体の同期機能を実装します
* これにより、複数プロジェクト間で Claude Code のスキル定義を統一管理できます

## 背景

* 現状の課題
	* Claude Code では `.claude/skills/` ディレクトリでプロジェクト固有のスキルを定義可能
	* テンプレートリポジトリ (K-shir0/docs-boilerplate-llm) にスキルファイルが管理されている
	* 既存の同期ツールは個別ファイルのみ対象で、ディレクトリ構造を持つスキルファイルに未対応
* 技術的背景
	* GitHub Contents API を使用したディレクトリツリー取得が必要
	* GitHub Raw Content API によるファイル取得は既存実装を活用可能
* スコープ
	* 対象: `.claude/skills/` ディレクトリ全体の同期
	* 対象外: 他のディレクトリ同期、差分同期の最適化

## ゴールと非ゴール

* ゴール
	* `.claude/skills/` ディレクトリを自動同期する機能の実装
	* 既存のファイル同期機能との完全互換性維持
	* GitHub API レート制限内での実装
	* 将来的なスキル追加への自動対応
* 非ゴール
	* 他のディレクトリの同期対応
	* 差分同期やキャッシング機能の実装
	* GitHub 認証機能の追加
	* 自動実行やスケジューリング機能

## 詳細設計

### アーキテクチャ

* 現在のファイルベース同期にディレクトリベース同期機能を追加
* 処理フロー
	* ユーザーが `bunx github:K-shir0/llm-docs-manager` を実行
	* CLI エントリーポイントで同期タイプ（ファイル/ディレクトリ）を判定
	* ファイルの場合: 既存の `fetchFile` を使用
	* ディレクトリの場合: 新規実装の `syncDirectory` を使用
		* `fetchDirectoryTree` で GitHub Contents API からディレクトリ構造取得
		* 各ファイルをループ処理
		* `ensureDirectoryExists` で親ディレクトリ作成
		* `fetchFile` でファイル取得
		* `updateFile` で書き込み

### データフロー

* ディレクトリ同期処理
	* ユーザーが bun run index.ts を実行
	* GitHub Contents API に GET /repos/.../contents/.claude/skills をリクエスト
	* レスポンス: [{type: "dir", name: "markdown-skills"}]
	* 再帰的に GET /repos/.../contents/.claude/skills/markdown-skills をリクエスト
	* レスポンス: [{type: "file", name: "SKILL.md", path: "..."}]
	* ファイルリスト: [".claude/skills/markdown-skills/SKILL.md"]
	* 各ファイルをループ
		* GitHub Raw API で .claude/skills/markdown-skills/SKILL.md を取得
		* mkdir -p .claude/skills/markdown-skills を実行
		* Bun.write で .claude/skills/markdown-skills/SKILL.md を書き込み
	* 結果を表示

### 実装詳細

* 型定義の拡張
	* `FileConfig` インターフェースに `isDirectory?: boolean` を追加
	* 既存エントリとの後方互換性を維持

```typescript
interface FileConfig {
  path: string;
  destination: string;
  isDirectory?: boolean;
}
```

* 同期対象の追加
	* `FILES_TO_SYNC` 配列に `.claude/skills` エントリを追加

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
];
```

* 新規関数の実装
	* `fetchDirectoryTree(dirPath: string): Promise<string[]>`
		* 目的: GitHub Contents API でディレクトリ構造を再帰取得
		* エンドポイント: https://api.github.com/repos/K-shir0/docs-boilerplate-llm/contents/{dirPath}
		* type === "file" の場合: パスをリストに追加
		* type === "dir" の場合: 再帰的に `fetchDirectoryTree` を呼び出し
		* タイムアウト: 30 秒
		* エラーハンドリング: 404、403、タイムアウトに対応
	* `ensureDirectoryExists(filePath: string): Promise<void>`
		* 目的: 親ディレクトリが存在しない場合に再帰作成
		* Node.js の `mkdir()` を使用
		* `recursive: true` で親ディレクトリも自動作成
		* 既存ディレクトリの場合はエラーにしない
	* `syncDirectory(projectRoot: string, dirConfig: FileConfig): Promise<void>`
		* 目的: ディレクトリ全体を同期するメイン処理
		* 手順
			* `fetchDirectoryTree` でファイルリスト取得
			* 各ファイルに対して
				* `ensureDirectoryExists` で親ディレクトリ作成
				* `fetchFile` でコンテンツ取得
				* `updateFile` で書き込み
			* 空ディレクトリの場合は警告を表示

* main 関数の修正
	* ファイル/ディレクトリを判別して適切な同期処理を実行
	* `fileConfig.isDirectory` が true の場合: `syncDirectory` を呼び出し
	* false または undefined の場合: 既存のファイル同期処理を実行

* デバッグログの拡張
	* ディレクトリツリー取得時の URL を表示
	* 発見されたファイル数とパスリストを表示
	* 作成されたディレクトリパスを表示
	* 各ファイルのダウンロード進捗を表示

### エラーハンドリング

* 既存のエラーケースに加え、以下を追加
	* ディレクトリが見つからない（404）: エラーメッセージ表示、処理継続
	* ディレクトリが空（ファイル数 0）: 警告表示、処理スキップ
	* ディレクトリ作成失敗（権限エラー等）: エラーメッセージ表示、終了
	* GitHub API レート制限（403）: レート制限メッセージ表示、終了

### GitHub API レート制限への配慮

* 現状
	* 認証なしの GitHub API: 60 リクエスト/時間
	* 現在は 2 ファイル取得のみ（2 リクエスト）
* `.claude/skills/` 追加後
	* ディレクトリツリー取得: 1-2 リクエスト（ディレクトリの深さに依存）
	* ファイル取得: 0 リクエスト（GitHub Raw Content API 使用）
	* 合計: 3-4 リクエスト/実行
* 結論: レート制限の範囲内で十分実行可能
* 注意事項
	* `fetchDirectoryTree` は GitHub Contents API を使用（レート制限対象）
	* `fetchFile` は GitHub Raw Content API を使用（レート制限対象外）
	* 現在の `.claude/skills/` 構造（1 ディレクトリ、1 ファイル）では問題なし

## その他の関心事

### 実装計画

* Phase 1: 既存機能の確認（完了）
	* 現在の同期ツールの動作確認
	* コードベースの理解
	* テンプレートリポジトリの構造確認
* Phase 2: ディレクトリ同期機能の実装（本フェーズ）
	* ステップ 1: 型定義と設定の拡張
		* `FileConfig` インターフェースに `isDirectory?: boolean` を追加
		* `FILES_TO_SYNC` に `.claude/skills` エントリを追加
		* 定数定義の追加
	* ステップ 2: 新規関数の実装
		* `fetchDirectoryTree` の実装とテスト
		* `ensureDirectoryExists` の実装とテスト
		* `syncDirectory` の実装とテスト
	* ステップ 3: メイン処理の修正
		* `main` 関数のファイル/ディレクトリ判別ロジック追加
		* デバッグログの拡張
		* エラーメッセージの改善
	* ステップ 4: 動作確認とテスト
		* 既存 2 ファイル同期の正常動作確認（リグレッションテスト）
		* `.claude/skills/` ディレクトリ同期の動作確認
		* 空ディレクトリのエラーハンドリング確認
		* デバッグモード（`DEBUG=1`）でのログ確認
* Phase 3: ドキュメント整備（オプション）
	* `README.md` の使用例を更新
	* `docs/requirements/template-sync.md` に Phase 2 の記載を追加

### 影響範囲

* 変更されるファイル
	* `index.ts`: メインロジック（約 50-80 行追加）
	* `docs/feat/skills-sync.md`: 本実装計画書（新規作成）
* 互換性
	* 既存機能との完全互換: ファイルベース同期（`CLAUDE.md`、`docs/design.md.sample`）は変更なし
	* 後方互換性: `isDirectory` は optional フィールドのため、既存の `FILES_TO_SYNC` エントリに影響なし
* 同期されるファイル（実装後）
	* `CLAUDE.md`: プロジェクト規約書（既存）
	* `docs/design.md.sample`: 設計書テンプレート（既存）
	* `.claude/skills/markdown-skills/SKILL.md`: マークダウンスキル（新規）

### テスト計画

* 単体テスト（手動）
	* `fetchDirectoryTree` のテスト
		* テストケース 1: 正常系（期待結果: [".claude/skills/markdown-skills/SKILL.md"]）
		* テストケース 2: 存在しないディレクトリ（期待結果: 404 エラー）
		* テストケース 3: 空ディレクトリ（期待結果: 空配列 []）
	* `ensureDirectoryExists` のテスト
		* テストケース 1: 新規ディレクトリ作成（期待結果: ディレクトリが作成される）
		* テストケース 2: 既存ディレクトリ（期待結果: エラーなし）
		* テストケース 3: 深い階層（期待結果: 親ディレクトリも含めて作成される）
	* `syncDirectory` のテスト
		* テストケース 1: 正常系（期待結果: 全ファイルが同期される）
		* テストケース 2: 空ディレクトリ（期待結果: 警告が表示され、処理がスキップされる）
* 統合テスト
	* テストケース 1: 既存機能のリグレッションテスト
		* 実行前: CLAUDE.md と docs/design.md.sample を削除
		* 実行: bun run index.ts
		* 検証: ファイルが同期されることを確認
	* テストケース 2: ディレクトリ同期
		* 実行前: .claude/skills/ を削除
		* 実行: bun run index.ts
		* 検証: .claude/skills/markdown-skills/SKILL.md が同期されることを確認
	* テストケース 3: デバッグモード
		* 実行: DEBUG=1 bun run index.ts
		* 検証: デバッグログが表示されることを確認
* エラーケーステスト
	* テストケース 1: ネットワークエラー（期待結果: エラーメッセージ表示、終了コード 1）
	* テストケース 2: レート制限（期待結果: "GitHub API rate limit exceeded" メッセージ）

### セキュリティ考慮事項

* パストラバーサル対策
	* ディレクトリパスは GitHub API のレスポンスから取得
	* プロジェクトルート外への書き込みは発生しない
	* `ensureDirectoryExists` でパス検証を実施
* HTTPS 通信
	* すべての GitHub API 通信は HTTPS で暗号化
	* 中間者攻撃のリスクを軽減
* 権限管理
	* 書き込み先はプロジェクトルート配下の `.claude/skills/` に限定
	* システムディレクトリへの影響なし

### パフォーマンス

* 実行時間の見積もり
	* CLAUDE.md 取得: 0.5-1 秒（既存）
	* docs/design.md.sample 取得: 0.5-1 秒（既存）
	* .claude/skills/ ツリー取得: 0.5-1 秒（新規、1-2 リクエスト）
	* .claude/skills/*/SKILL.md 取得: 0.5-1 秒/ファイル（新規）
	* 合計: 2-4 秒（現在: 1-2 秒）
* 結論: パフォーマンスへの影響は軽微（+1-2 秒程度）
* 最適化の可能性
	* 現時点では不要だが、将来的にスキルファイルが大幅に増加した場合の最適化案
	* 並列ダウンロード: `Promise.all()` で複数ファイルを同時取得
	* キャッシング: ローカルにメタデータをキャッシュし、変更があった場合のみダウンロード
	* 差分同期: ファイルハッシュを比較して変更分のみ更新

### トラブルシューティング

* 問題: `.claude/skills/` が同期されない
	* 原因の確認
		* デバッグモードで実行: DEBUG=1 bun run index.ts
		* "Syncing directory .claude/skills..." が表示されるか確認
		* "Found N file(s) in .claude/skills" が表示されるか確認
		* エラーメッセージがないか確認
	* 解決策
		* ネットワーク接続を確認
		* GitHub リポジトリ (K-shir0/docs-boilerplate-llm) が公開されているか確認
		* `.claude/skills/` ディレクトリに書き込み権限があるか確認
* 問題: "Directory not found" エラー
	* 原因: テンプレートリポジトリに `.claude/skills/` が存在しない
	* 解決策
		* テンプレートリポジトリの URL を確認
		* `.claude/skills/` ディレクトリが存在することを確認
		* 存在しない場合は、`FILES_TO_SYNC` から該当エントリを削除
* 問題: "Failed to create directory" エラー
	* 原因: ディレクトリ作成の権限不足
	* 解決策: 親ディレクトリの権限を確認し、必要に応じて修正

## 関連リンク

* [親要件定義: GitHub テンプレート同期ツール](../requirements/template-sync.md)
* [K-shir0/docs-boilerplate-llm](https://github.com/K-shir0/docs-boilerplate-llm)
* [GitHub Contents API](https://docs.github.com/en/rest/repos/contents)
* [GitHub Raw Content API](https://docs.github.com/en/rest/repos/contents#get-repository-content)
* [Bun File I/O](https://bun.sh/docs/api/file-io)
* [Node.js fs.mkdir](https://nodejs.org/api/fs.html#fspromisesmkdirpath-options)
