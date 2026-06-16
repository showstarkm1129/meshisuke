/**
 * 会話状態から「今ターンで送るべきセクション一覧」を決定し、プロンプトを合成する。
 *
 * 設計判断:
 * - `core` は常時含める（命令・ペルソナ・セルフチェック・失敗パターン集）
 * - `initial` は onboarding 未完了時のみ含める（履歴クリア後でも onboarding 済みなら含めない: 計画書 §9-A の (b)）
 * - `continuing` は onboarding 完了済みで会話が始まっている時に含める
 * - `backside` は明示トリガー or 直近の裏側活動が検出された時のみ含める
 */

import type { ParsedSections, SectionId } from './promptSections';

export interface ConversationState {
  /** 現在のセッション内のターン数（user/assistant 含む） */
  turnsCount: number;
  /** profile.onboarding_completed の値 */
  onboardingCompleted: boolean;
  /** 今送ろうとしているユーザー発話。session 開始判定にも使う */
  lastUserText: string | null;
  /** 直近5ターンに裏側応答（裏側モード継続）があったか */
  recentBacksideActivity: boolean;
}

export interface ComposeResult {
  /** 合成後のシステムプロンプト（マーカーは含まない） */
  prompt: string;
  /** 実際に含めたセクションID */
  includedSections: SectionId[];
  /** 元プロンプト全文の行数 */
  baselineLines: number;
  /** 合成後の行数 */
  composedLines: number;
  /** 行数ベースの削減率 (0.0〜1.0) */
  savingsRatio: number;
}

/** 裏側モードに切り替わるトリガー語 */
const BACKSIDE_TRIGGER_REGEX =
  /(裏側|うらがわ|裏モード|データ見せ|データ確認|スキーマ|JSON|デバッグ|中身確認|設定確認)/i;

export function isBacksideTrigger(text: string | null | undefined): boolean {
  if (!text) return false;
  return BACKSIDE_TRIGGER_REGEX.test(text);
}

/**
 * 会話状態から「含めるべきセクション一覧」を決定する。
 * 順序: core → initial / continuing → backside（出力時の自然な並び）。
 */
export function decideSections(state: ConversationState): SectionId[] {
  const ids: SectionId[] = ['core'];

  if (!state.onboardingCompleted) {
    ids.push('initial');
  } else {
    // 計画書 §9-A: onboarding 済みなら履歴クリア直後（turnsCount=0）でも continuing を使う
    ids.push('continuing');
  }

  if (isBacksideTrigger(state.lastUserText) || state.recentBacksideActivity) {
    ids.push('backside');
  }

  return ids;
}

/**
 * セクション辞書 + 会話状態 + データ要約 から最終プロンプトを組み立てる。
 */
export function composePrompt(
  parsed: ParsedSections,
  state: ConversationState,
  dataSection: string,
  baselineRaw: string
): ComposeResult {
  const ids = decideSections(state);
  const parts: string[] = [];
  for (const id of ids) {
    const body = parsed.sections[id];
    if (body && body.length > 0) parts.push(body);
  }
  const promptBody = parts.join('\n\n---\n\n');
  const prompt = `${promptBody}\n\n---\n\n${dataSection}`;

  const baselineLines = countLines(baselineRaw);
  const composedLines = countLines(prompt);
  const savingsRatio = baselineLines > 0 ? 1 - composedLines / baselineLines : 0;

  return {
    prompt,
    includedSections: ids,
    baselineLines,
    composedLines,
    savingsRatio,
  };
}

function countLines(text: string): number {
  if (text.length === 0) return 0;
  return text.split('\n').length;
}
