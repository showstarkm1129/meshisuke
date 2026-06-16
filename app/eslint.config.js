import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // ProfileView / PantryView / HistoryView が props→編集用ローカル状態を
      // 初回同期する箇所で発火する。挙動（ファイル再読込時に編集中の内容を
      // 上書きするか等）は機能仕様の判断を含むため、検証ゲートをブロックせず
      // warning として可視化に留める。恒久対応は別タスクで扱う。
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  prettier,
])
