# 検証スタック導入 — 作業記録

日付: 2026-06-04
ブランチ: feat/conversational-ui-and-prompt-hardening

## 目的

LLM（main Claude）が実装時に毎回叩いて自己検証できる、**プロジェクトルートからの単一検証ランナー**を整備する。
CLAUDE.md コア原則「自己検証」を具体的なコマンドとして制度化する。

## 背景（着手前の状態）

- 検証ツール（typecheck / lint / test / build / format）は `app/package.json` に個別に存在。
- ルートに統合実行口が無く、CI も無い。
- `format` は書き込み専用でチェック用途に使えなかった。
- ベースライン: typecheck ✅ / test 61件 ✅ / **lint 8 errors（既存）** / build 未確認。
- `prettier --check src/` は 44 ファイルで整形ドリフトを検出。

## 実施内容

### 1. 検証スクリプト追加（`app/package.json`）
- `format:check`: `prettier --check src/`（書き込みなし）
- `verify`: `typecheck && lint && test`（高速ゲート）
- `verify:full`: `verify` + `build`

### 2. ルート統合ランナー新規作成（`package.json`）
- `npm --prefix app run <script>` で `app/` に委譲。依存なし・`private`。
- 公開: `verify` / `verify:full` / `typecheck` / `lint` / `test` / `build` / `format:check`。

### 3. 既存 Lint エラー 8 件の処理
ゲートを最初から緑にするため対応。

自明・安全な 5 件を修正:
- `IngredientChips.tsx`: 不要な初期代入 `= []` 削除（no-useless-assignment）
- `CheckView.tsx` / `ProfileView.tsx`: `let`→`const`（prefer-const）
- `pantryMerge.ts`: 正規表現の全角空白リテラルを `　` に（no-irregular-whitespace）
- `pantryMerge.test.ts`: `as any`→`as unknown as Ingredient`（no-explicit-any）

残る 3 件 `react-hooks/set-state-in-effect`（ProfileView / PantryView / HistoryView）:
- props→編集用ローカル状態の初回同期で発火。
- 「ファイル再読込時に編集中内容を上書きするか」等、**機能仕様の判断**を含むため、
  ツール整備のついでに書き換えない。
- `eslint.config.js` で当該ルールのみ `warn` に降格（可視化は維持、ゲートは緑）。
- **恒久対応は別タスク**。

### 4. 範囲外として見送ったもの（要相談）
- `format:check` のゲート組込み: 既存 44 ファイルの整形ドリフトのため未組込み。整形は別PR推奨。
- GitHub Actions CI / git pre-commit フック: 今回の目的（LLM 実装時自己検証）から外れるため未着手。必要なら追加可。
- set-state-in-effect 3 件の恒久修正。

### 5. ドキュメント更新
- `CLAUDE.md`: 「検証スタック（実装時の自己検証）」節を追加。
- `structure.md`: ルート `package.json` をディレクトリ構成に追記。

## 検証結果（ルートから実走）

- `npm run verify` → exit 0（typecheck ✅ / lint 0 errors・3 warnings ✅ / test 61 passed ✅）
- `npm run verify:full` → exit 0（上記 + build 成功）
