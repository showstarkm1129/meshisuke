/**
 * 不明なエラーオブジェクトから UI / ログ表示安全な「種別名」を取り出す。
 * DOMException.message / Error.message は OS パスやファイル内部情報を含むことがあるため使わない。
 */
export function formatErrorDetail(err: unknown): string {
  if (err instanceof DOMException) return err.name;
  if (err instanceof Error) return err.name;
  return '不明なエラー';
}
