---
name: code-intelligence
description: "Provides semantic code search, LSP-based code understanding, and safe refactoring support. Automatically activates for: (1) Code navigation requests, (2) Refactoring tasks, (3) Code review and understanding tasks."
---

# Code Intelligence

## 概要

このスキルは Serena MCP と IDE MCP を活用した包括的なコードインテリジェンス機能を提供します。プログラミング言語に依存しない汎用的なアプローチで、セマンティック検索、LSP ベースの正確なコード理解、安全なリファクタリング支援を実現します。

主要機能:

* セマンティック検索: プロジェクト全体を横断した関連コードの探索
* 定義ジャンプと参照追跡: LSP ベースの正確なシンボル解析
* 安全なリファクタリング: 段階的変更の提案と実施
* 知識の永続化: Serena メモリ機能による調査結果の蓄積

サポート言語: TypeScript, JavaScript, Python, Go, Java など LSP 対応言語全般

## ワークフロー判断

### 自動起動の判断基準

このスキルは以下のユーザー要求時に自動的に起動します:

* コードナビゲーション要求
	* 「この関数の定義を探して」
	* 「この変数がどこで使われているか調べて」
	* 「このクラスの実装を確認して」
	* 「モジュール間の依存関係を教えて」
* リファクタリング要求
	* 「関数を抽出して」
	* 「このクラスを別ファイルに移動して」
	* 「変数名を変更して」
	* 「コードを整理して」
* コードレビューと理解
	* 「このコードベースの構造を教えて」
	* 「この機能の実装を調査して」
	* 「設計パターンを確認して」
	* 「アーキテクチャを理解したい」

### ワークフロー開始時の必須動作

1. SKILL.md 全体読み取り
	* このスキル自身の SKILL.md ファイルを必ず最初に読み取る
	* 他の関連スキルの SKILL.md も必要に応じて読み取る
	* ガイドラインに従ってツール選択と実行順序を決定
2. Serena メモリの確認
	* `list_memories` で利用可能なメモリを確認
	* タスクに関連するメモリがあれば `read_memory` で読み取る
	* 既存知識を活用してトークン使用量を削減

## Serena メモリ活用ルール

### 基本原則

Serena ツールで調べた情報は **必ず** `write_memory` で保存します。これにより:

* 同じコードの再調査を回避
* プロジェクト知識の蓄積による精度向上
* チーム全体での知見共有
* トークン使用量の大幅削減

### メモリファイル命名規則

メモリファイル名は以下の形式で作成します:

* `architecture_overview.md`: プロジェクト全体構造
* `module_{name}_structure.md`: 各モジュールのシンボル構成
* `component_{name}_dependencies.md`: コンポーネント間依存関係
* `refactoring_{feature}_{date}.md`: リファクタリング履歴
* `pattern_{pattern_name}.md`: 発見された設計パターン
* `symbol_{name}_references.md`: 重要シンボルの参照関係

日付形式: YYYYMMDD（例: `refactoring_auth_20250108.md`）

### 保存タイミング

以下のタイミングで必ず memorize します:

* シンボル探索完了時
	* `find_symbol` で重要なシンボル構造を発見した時
	* `get_symbols_overview` でモジュール構造を理解した時
* 参照追跡完了時
	* `find_referencing_symbols` で依存関係を把握した時
	* モジュール間の関連性が明らかになった時
* リファクタリング実施後
	* 変更内容と理由を記録
	* 影響範囲と検証結果を記録
	* 成功・失敗に関わらず記録
* 設計パターン発見時
	* Factory, Singleton, Strategy などのパターンを識別した時
	* アーキテクチャ上の重要な設計判断を発見した時
* 初回コードベース探索完了時
	* プロジェクト全体の構造を初めて理解した時
	* 主要なディレクトリ構成とモジュール分割を把握した時

### メモリ内容の構成

メモリファイルには以下の情報を含めます:

* 調査日時
* 調査対象（ファイルパス、シンボル名）
* 発見した構造と関係性
* 重要な設計判断や実装パターン
* 今後の作業で参照すべきポイント

例:

```markdown
# モジュール auth の構造

## 調査日時
2025-01-08

## 対象ファイル
* src/auth/index.ts
* src/auth/middleware.ts
* src/auth/validators.ts

## シンボル構成
* AuthService クラス (class)
	* login() メソッド
	* logout() メソッド
	* validateToken() メソッド
* authMiddleware 関数 (function)
* TokenValidator クラス (class)

## 依存関係
* database モジュールに依存
* config モジュールから設定を読み込み
* utils/crypto モジュールを使用

## 設計パターン
* Singleton パターン (AuthService)
* Middleware パターン (authMiddleware)

## 参照ポイント
* ユーザー認証のエントリポイントは AuthService.login()
* トークン検証は全て TokenValidator を経由
```

## SKILL.md 読み取りルール

### 必須読み取りタイミング

* スキル起動時: 必ず最初にこのスキルの SKILL.md 全体を読み取る
* 他スキル連携時: 連携する他スキルの SKILL.md も読み取る
* ガイドライン確認時: 実装方針や判断基準が不明な時に再読み取り

### 読み取り対象

* 現在起動中のスキルの SKILL.md: **必須**
* タスクに関連する他スキルの SKILL.md: 必要に応じて
	* 例: Markdown ドキュメント作成を伴う場合は markdown-skills の SKILL.md

### 活用方法

SKILL.md から以下の情報を取得して活用します:

* ツール選択基準: どのツールをどの順序で使用するか
* 実装方針: セマンティック検索やリファクタリングの具体的手順
* 制約事項: 禁止事項や注意点（ファイル全体読み込み禁止など）
* ベストプラクティス: トークン効率や安全性の確保方法

## セマンティック検索ガイドライン

### 基本戦略

コードを理解する際は **段階的に情報を取得** し、トークン使用量を最小化します。

重要原則:

* ファイル全体の読み込みは **絶対に禁止**
* 必ずシンボル単位で読み取る
* `include_body=false` から始め、必要な時のみ `include_body=true`

### 検索ワークフロー

段階的な探索アプローチ:

1. **ファイル概要の取得**: `get_symbols_overview` でトップレベルシンボルのリストを把握
2. **特定シンボルの探索**: `find_symbol` で目的のシンボルを詳細調査
	* `relative_path` で検索範囲を限定（推奨）
	* `depth` パラメータで子シンボル取得を制御
	* 初回は `include_body=false`、詳細確認時のみ `include_body=true`
3. **参照追跡**: `find_referencing_symbols` でシンボルの使用箇所を確認
	* 依存関係の把握
	* 影響範囲の見積もり

### ツール選択の判断基準

* シンボル名が明確: `find_symbol` を使用
* シンボル名が不明確: `substring_matching=true` で部分一致検索
* シンボル名が全く不明: `search_for_pattern` を補助的に使用（最終手段）
* 特定の種別のみ: `include_kinds` / `exclude_kinds` でフィルタリング

### 調査完了時の memorize

セマンティック検索完了時は必ず `write_memory`:

* 発見したシンボル構造
* モジュール間の関係性
* 重要な実装パターン
* 今後参照すべきポイント

メモリファイル名例: `module_{name}_structure.md`, `component_{name}_dependencies.md`, `pattern_{pattern_name}.md`

## リファクタリング支援ガイドライン

### 基本方針

リファクタリングは **安全性を最優先** し、段階的に実施します。

実行モード: **自動実行** (ユーザー設定に基づく)

### 安全性チェック

リファクタリング実施前に必ず確認:

#### 1. 診断情報の確認

```markdown
ツール: `mcp__ide__getDiagnostics`
目的: 現在のエラーや警告を把握
パラメータ:
* uri: 対象ファイル URI (オプション)

確認項目:
* 既存のエラーがないか
* 警告の内容
* リファクタリング対象のシンボルに関連する問題
```

#### 2. 対象シンボルのスコープ分析

```markdown
実施内容:
* シンボルの定義位置を確認
* 参照箇所を全て追跡 (find_referencing_symbols)
* 依存関係を把握
* 影響範囲を見積もり
```

### リファクタリング操作

#### シンボルのリネーム

```markdown
ツール: `rename_symbol`
用途: シンボル名をコードベース全体で変更
パラメータ:
* name_path: 対象シンボルの名前パス
* relative_path: シンボルを含むファイル
* new_name: 新しい名前

注意:
* メソッドオーバーロードがある言語 (Java など) では署名を含む
* 自動的に全参照箇所が更新される
* 実施後に診断情報を再確認
```

#### シンボル本体の置換

```markdown
ツール: `replace_symbol_body`
用途: シンボルの定義全体を置換
パラメータ:
* name_path: 対象シンボルの名前パス
* relative_path: シンボルを含むファイル
* body: 新しいシンボル本体 (署名含む)

重要:
* body には署名行を含む完全な定義を指定
* docstring / コメント / import は含まない
* 事前に include_body=true でシンボルを読み取っておく
```

#### コードの挿入

```markdown
ツール: `insert_after_symbol` または `insert_before_symbol`
用途: シンボルの前後にコードを挿入
パラメータ:
* name_path: 基準となるシンボルの名前パス
* relative_path: シンボルを含むファイル
* body: 挿入するコード

使用例:
* クラスへのメソッド追加: insert_after_symbol (最後のメソッド)
* import 文の追加: insert_before_symbol (最初のトップレベルシンボル)
* ファイル末尾への追加: insert_after_symbol (最後のトップレベルシンボル)
```

### 段階的変更の実施

大規模なリファクタリングは以下の手順で段階的に実施:

1. 小さな変更単位に分割
	* 1 つのシンボル変更
	* 1 つのファイル内の変更
	* 関連性の高い変更のグループ化
2. 各ステップで検証
	* 診断情報の確認
	* 参照の整合性チェック
	* 必要に応じてテスト実行
3. 問題発生時は即座に停止
	* エラー内容をユーザーに報告
	* ロールバック手順を提示
	* 代替アプローチを検討

### リファクタリング実施後の memorize

リファクタリング完了時は **必ず** `write_memory`:

```markdown
保存内容:
* 変更内容の概要
* 変更理由 (なぜこのリファクタリングを実施したか)
* 影響範囲 (変更したファイルとシンボル)
* 検証結果 (診断情報、テスト結果)
* 学んだ教訓や注意点

メモリファイル名:
* refactoring_{feature}_{YYYYMMDD}.md

例:
* refactoring_auth_20250108.md
* refactoring_database_migration_20250108.md
```

成功・失敗に関わらず記録することで、今後の参考とします。

## コード理解ワークフロー

### プロジェクト構造の段階的探索

新しいコードベースを理解する際の推奨手順:

#### ステップ 1: メモリ確認

```markdown
1. `list_memories` で既存知識を確認
2. 関連するメモリがあれば `read_memory`
3. 既知の情報を元に探索範囲を絞る
```

#### ステップ 2: ディレクトリ構造の把握

```markdown
ツール: `list_dir`
パラメータ:
* relative_path: "." (プロジェクトルート)
* recursive: true

確認項目:
* 主要ディレクトリの役割
* ソースコードの配置
* テストコードの配置
* 設定ファイルの場所
```

#### ステップ 3: エントリポイントの特定

```markdown
方法:
* package.json の "main" フィールド確認
* index.ts / main.ts / app.ts などを探索
* get_symbols_overview でエントリポイントファイルを調査
```

#### ステップ 4: モジュール構造の理解

```markdown
各主要モジュールに対して:
1. get_symbols_overview でトップレベルシンボルを取得
2. 主要なクラス・関数を find_symbol で詳細調査
3. find_referencing_symbols で依存関係を追跡
4. write_memory でモジュール構造を保存
```

#### ステップ 5: アーキテクチャの可視化

```markdown
発見した情報を統合:
* モジュール間の依存関係
* レイヤー構造 (UI, Business Logic, Data Access など)
* 設計パターンの識別
* 重要な設計判断

write_memory で architecture_overview.md に保存
```

### 依存関係の追跡

モジュール間の依存関係を理解する手順:

1. 対象モジュールのエクスポートを確認
	* `get_symbols_overview` でエクスポートされるシンボルを特定
2. 各エクスポートの参照を追跡
	* `find_referencing_symbols` で使用箇所を確認
3. import 文のパターン検索
	* `search_for_pattern` で import 文を検索（補助的に使用）
4. 依存グラフの構築
	* モジュール A → モジュール B の関係を整理
	* 循環依存がないか確認
5. 結果を memorize
	* `write_memory` で component_{name}_dependencies.md に保存

### 設計パターンの識別

コードベースから設計パターンを見つける:

#### 検出すべきパターン

* Creational Patterns
	* Singleton: getInstance() メソッドを持つクラス
	* Factory: create() / build() メソッドを持つクラス
	* Builder: チェーン可能なメソッドを持つクラス
* Structural Patterns
	* Adapter: インターフェース変換を行うクラス
	* Decorator: 既存オブジェクトを拡張するクラス
	* Proxy: 元のオブジェクトへの参照を保持するクラス
* Behavioral Patterns
	* Strategy: アルゴリズムを入れ替え可能にするインターフェース
	* Observer: subscribe / notify メソッドを持つクラス
	* Command: execute() メソッドを持つクラス

#### 識別方法

1. シンボル名からパターンを推測
	* "Factory", "Builder", "Adapter" などの接尾辞
	* "create", "build", "execute" などのメソッド名
2. `find_symbol` で候補を詳細調査
	* include_body=true でメソッド構造を確認
3. `find_referencing_symbols` で使用パターンを確認
	* 実際にどう使われているか
4. パターンを memorize
	* `write_memory` で pattern_{pattern_name}.md に保存
	* 例: pattern_singleton_auth_service.md

## コードスタイルガイドライン

### プロジェクト規則の遵守

リファクタリングや新規コード追加時は既存のコーディング規則に従います:

* インデント: プロジェクトの設定に従う (タブ or スペース)
* 命名規則: 既存コードのパターンを踏襲
	* camelCase, PascalCase, snake_case など
* コメントスタイル: 既存のドキュメンテーション方式
	* JSDoc, docstring など

### 一貫性の保持

既存コードとの一貫性を重視:

* ファイル構成: 既存の構造を維持
	* import 文の順序
	* export の配置
	* セクション分け
* エラーハンドリング: 既存のパターンを使用
	* try-catch, Result 型, Either 型など
* 型定義: 既存の型システムに準拠
	* interface vs type
	* any の使用ポリシー

### リファクタリング品質基準

実施したリファクタリングは以下を満たす必要があります:

* 後方互換性: 既存の API を壊さない
* テスト通過: 既存テストが全て通る
* 診断クリーン: 新しいエラーや警告を導入しない
* 可読性向上: コードが理解しやすくなる
* 保守性向上: 将来の変更が容易になる

品質基準を満たさない場合は変更を差し戻し、代替アプローチを検討します。
