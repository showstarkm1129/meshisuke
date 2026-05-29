/**
 * LLM プロバイダーから返ってきた HTTP エラーを、
 * ユーザーが次に取るべき行動が分かる文言に整形する。
 *
 * 開発者向けの生レスポンス body は呼び出し元で `console.error` に流す前提。
 * ここで作る文字列は ErrorBanner にそのまま載る短い案内のみ。
 */

/** プロバイダーの REST API からエラー body を読み取った時の最小限の形 */
export type ProviderErrorBody = {
  /** OpenRouter / Gemini どちらも `error.message` 形式で返してくる */
  message?: string;
  /** Gemini が 429 のときに含めてくる "30s" 等 */
  retryDelay?: string;
};

/**
 * ステータスコード + エラー body から、UI 表示用のメッセージを作る。
 *
 * @param providerLabel 「OpenRouter」「Gemini Direct」など、UI に出す表示名
 * @param status HTTP ステータスコード
 * @param body 解釈済みの最小限のエラー情報
 */
export function formatProviderError(
  providerLabel: string,
  status: number,
  body: ProviderErrorBody = {}
): string {
  const upstreamMsg = body.message?.trim();
  const upstreamSuffix = upstreamMsg ? `（${truncate(upstreamMsg, 200)}）` : '';

  if (status === 400) {
    return `${providerLabel} がリクエストを拒否しました${upstreamSuffix}。設定画面のモデル ID や入力内容を見直してください。`;
  }
  if (status === 401) {
    return `${providerLabel} の API キーが認証されませんでした。設定画面でキーを再登録してください。`;
  }
  if (status === 402) {
    return `${providerLabel} のクレジット残高が不足しています。ダッシュボードで残高を確認してください。`;
  }
  if (status === 403) {
    return `${providerLabel} の API キーに、このモデルへのアクセス権がありません。キーの権限・プランを確認してください。`;
  }
  if (status === 404) {
    return `${providerLabel} に指定モデルが見つかりませんでした${upstreamSuffix}。モデル ID のタイポや、\`-it\` / \`:free\` などの suffix を確認してください。`;
  }
  if (status === 408 || status === 504) {
    return `${providerLabel} の応答がタイムアウトしました。少し時間を置いて再送してください。`;
  }
  if (status === 429) {
    const waitHint = body.retryDelay ? `（${body.retryDelay}後に再試行可能）` : '';
    return `${providerLabel} がレート制限中です${waitHint}。アクセスが集中している可能性があります。30 秒ほど待つか、別モデル（例: \`deepseek/deepseek-chat\` や \`openai/gpt-oss-20b:free\`）に切替えてください。`;
  }
  if (status >= 500 && status <= 599) {
    return `${providerLabel} 側で一時的なエラーが発生しています (HTTP ${status})。少し待って再送してください。`;
  }

  // それ以外: 生メッセージは付けるが、汎用文言で逃がす
  return `${providerLabel} がエラーを返しました (HTTP ${status})${upstreamSuffix}。`;
}

/**
 * fetch() 自体が throw してきた（DNS 失敗・オフライン・CORS など）場合のメッセージ。
 * 呼び出し元は `catch` の中で error.name === 'TypeError' 等を見て使い分ける。
 */
export function formatNetworkError(providerLabel: string): string {
  return `${providerLabel} に接続できませんでした。インターネット接続や API エンドポイントの到達性を確認してください。`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}
