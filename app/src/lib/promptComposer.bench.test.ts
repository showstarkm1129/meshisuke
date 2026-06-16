/**
 * 削減率の実測（テスト形式で記録）。
 * 各シナリオで composedLines / baselineLines を計算してログ出力する。
 * test として実行することで CI で常に値が確認できる。
 */
import { describe, it, expect } from 'vitest';
import systemPromptRaw from '../../../システムプロンプト.md?raw';
import { parseSections } from './promptSections';
import { composePrompt, type ConversationState } from './promptComposer';

const parsed = parseSections(systemPromptRaw);
const dummyData = '## 現在のユーザーデータ（要約）\n(本計測ではデータ部はダミー)';

function measure(label: string, state: ConversationState) {
  const res = composePrompt(parsed, state, dummyData, systemPromptRaw);
  const pct = Math.round(res.savingsRatio * 100);
  console.log(
    `[bench] ${label.padEnd(30)} ` +
      `sections=[${res.includedSections.join(',')}] ` +
      `${res.composedLines}/${res.baselineLines} lines (${pct}% saved)`
  );
  return res;
}

describe('PromptComposer: トークン削減実測', () => {
  it('パースが警告なしで成功すること（前提条件）', () => {
    expect(parsed.warnings).toEqual([]);
    expect(parsed.sections.core.length).toBeGreaterThan(0);
    expect(parsed.sections.initial.length).toBeGreaterThan(0);
    expect(parsed.sections.continuing.length).toBeGreaterThan(0);
    expect(parsed.sections.backside.length).toBeGreaterThan(0);
  });

  it('シナリオ1: 初回起動（オンボーディング未完了）', () => {
    const res = measure('初回起動', {
      turnsCount: 0,
      onboardingCompleted: false,
      lastUserText: null,
      recentBacksideActivity: false,
    });
    expect(res.includedSections).toEqual(['core', 'initial']);
    expect(res.savingsRatio).toBeGreaterThan(0);
  });

  it('シナリオ2: 通常会話（オンボ済み・中盤）', () => {
    const res = measure('通常会話・中盤', {
      turnsCount: 6,
      onboardingCompleted: true,
      lastUserText: 'カレー食べたい',
      recentBacksideActivity: false,
    });
    expect(res.includedSections).toEqual(['core', 'continuing']);
    expect(res.savingsRatio).toBeGreaterThan(0);
  });

  it('シナリオ3: 裏側モード起動', () => {
    const res = measure('裏側モード', {
      turnsCount: 6,
      onboardingCompleted: true,
      lastUserText: '裏側見せて',
      recentBacksideActivity: false,
    });
    expect(res.includedSections).toEqual(['core', 'continuing', 'backside']);
  });

  it('シナリオ4: 履歴クリア直後（オンボ済み）→ continuing のまま', () => {
    const res = measure('履歴クリア直後', {
      turnsCount: 0,
      onboardingCompleted: true,
      lastUserText: null,
      recentBacksideActivity: false,
    });
    expect(res.includedSections).toEqual(['core', 'continuing']);
  });
});
