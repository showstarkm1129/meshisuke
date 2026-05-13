# めし助 — app

めし助 Web アプリのフロントエンドコードです。
バックエンドサーバー不要、ブラウザ完結型のローカル Web アプリです。

## 必要環境

- Node.js 22 LTS（`.nvmrc` で固定）
- npm 10 以上
- 対応ブラウザ: Chrome / Edge（最新版）
  - File System Access API を使用するため、Firefox / Safari は非対応

## 開発手順

```bash
# 依存パッケージのインストール（初回 or package.json 更新後に実行）
npm install

# 開発サーバーの起動（http://localhost:5173 で起動）
npm run dev

# 型チェック + 本番ビルド
npm run build

# Lint チェック
npm run lint

# Prettier でフォーマット
npm run format
```

## ディレクトリ構成

```
src/
├── components/   # 再利用可能な UI コンポーネント
├── hooks/        # カスタム React フック
├── lib/          # ユーティリティ・ビジネスロジック（フレームワーク非依存）
├── providers/    # LLM プロバイダー実装・コンテキストプロバイダー
├── types/        # TypeScript 型定義
└── pages/        # ページ単位のトップレベルコンポーネント
```

## 主要技術スタック

| 技術 | バージョン | 用途 |
|---|---|---|
| React | 19.x | UI フレームワーク |
| Vite | 8.x | ビルドツール / 開発サーバー |
| TypeScript | 6.x | 型安全な JavaScript |
| File System Access API | ブラウザ標準 | ローカルファイルの読み書き |

## ライセンス

MIT (2026 showstarkm1129)
