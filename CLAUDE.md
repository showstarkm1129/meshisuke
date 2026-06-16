# めし助プロジェクト — Claude 開発指針

## コア原則

- **実装計画と作業範囲**: 実装前に作業範囲を明確化し、.md 形式で計画を残す。曖昧点は実装前に解消することを厳守。
- **Claude活用方針**: 原則として Claude での直接実装は避ける。ユーザーの壁打ち、実装計画書の作成を主目標とする。

---

## 禁止事項（簡略）

- `profile.json` / `pantry.json` / `meal_history.jsonl` の内容を、ユーザーが明示的に指定したエンドポイント以外へ送信しない。
- API キーや個人情報をログ、エラーメッセージ、例外スタックに出力しない。
- File System Access API 以外の保存先を v1 で導入しない。
- `data/*.json` と型定義の同期を保たずに構造を変更しない。

---

## データ規約（要点）

- `data/*.json` を Source of Truth とする。型と齟齬がある場合は実例を優先し型を更新する。
- アレルギー / 嫌い物 / 好み物は `null` / `[]` / 値あり の三値を厳密に扱う（詳細は [README.md](./README.md) 参照）。
- LLM API キーは `localStorage` に保存（BYO 前提）。OpenRouter 等の中継を利用する場合は、利用理由と取り扱いを UI/README で明示する。

---
---

## データ規約

- `data/*.json` は構造の実例 (Source of Truth)。型定義との乖離があれば、
  まず実例側が正しいか確認した上で、型を実例に合わせるのを優先する。
- アレルギー / 嫌い物 / 好み物の三値セマンティクス（`null` = 未確認 / `[]` = 確認済み該当なし
  / 値あり = 確認済み該当あり）を厳密に区別する。詳細は [README.md](./README.md) 参照。
LLM API キーは `localStorage` に保存（BYO 前提）。OpenRouter 等の中継を利用する場合は、その取り扱いを README/UI で明示する。

---

## 検証スタック（実装時の自己検証）

実装・編集を行ったら、**プロジェクトルートから** 以下を必ず実行し、緑になることを確認してから完了とする（コア原則の自己検証の具体化）。

```bash
npm run verify        # typecheck → lint → format:check → test（高速。実装ループの基本ゲート）
npm run verify:full   # 上記 + build（PR 相当の区切り前に実行）
```

- 実体は `app/` に存在し、ルート `package.json` が `npm --prefix app` で委譲する。`app/` 配下でも `npm run verify` で同じ。
- 個別実行も可: `npm run typecheck` / `lint` / `test` / `build` / `format:check`。
- **ゲートは常に緑が前提**。`verify` が赤になる変更は未完成とみなす。新規にエラーを出さない。
- `lint` は error=0 を必須とする。`react-hooks/set-state-in-effect` のみ既知の未対応として `warn` に降格済み（ProfileView / PantryView / HistoryView。恒久対応は別タスク）。
- 整形は `format:check`（`prettier --check`、書き込みなし）で確認。`verify` ゲートに組込み済み。整形崩れを直すときは `npm run format` を使う。

---

## 参照ドキュメント

- [structure.md](./structure.md) — プロジェクト構造・サブエージェント運用ルール
- [README.md](./README.md) — 対外向け仕様説明
