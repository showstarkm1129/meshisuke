import { describe, it, expect } from 'vitest';
import {
  decideSections,
  isBacksideTrigger,
  composePrompt,
  type ConversationState,
} from './promptComposer';
import type { ParsedSections } from './promptSections';

const baseState: ConversationState = {
  turnsCount: 0,
  onboardingCompleted: false,
  lastUserText: null,
  recentBacksideActivity: false,
};

describe('isBacksideTrigger', () => {
  it('明示的な裏側キーワードに反応する', () => {
    expect(isBacksideTrigger('裏側見せて')).toBe(true);
    expect(isBacksideTrigger('うらがわ確認')).toBe(true);
    expect(isBacksideTrigger('裏モード入りたい')).toBe(true);
    expect(isBacksideTrigger('データ見せて')).toBe(true);
    expect(isBacksideTrigger('スキーマ確認したい')).toBe(true);
    expect(isBacksideTrigger('JSON出して')).toBe(true);
    expect(isBacksideTrigger('デバッグしたい')).toBe(true);
  });

  it('普通の会話には反応しない', () => {
    expect(isBacksideTrigger('カレー食べたい')).toBe(false);
    expect(isBacksideTrigger('卵買ってきた')).toBe(false);
    expect(isBacksideTrigger('')).toBe(false);
    expect(isBacksideTrigger(null)).toBe(false);
    expect(isBacksideTrigger(undefined)).toBe(false);
  });
});

describe('decideSections', () => {
  it('onboarding 未完了 (turnsCount=0) → core + initial', () => {
    const ids = decideSections({ ...baseState, turnsCount: 0, onboardingCompleted: false });
    expect(ids).toEqual(['core', 'initial']);
  });

  it('onboarding 未完了 + 会話継続中 → core + initial', () => {
    const ids = decideSections({ ...baseState, turnsCount: 3, onboardingCompleted: false });
    expect(ids).toEqual(['core', 'initial']);
  });

  it('onboarding 完了 + 通常会話 → core + continuing', () => {
    const ids = decideSections({
      ...baseState,
      turnsCount: 5,
      onboardingCompleted: true,
      lastUserText: 'カレーが食べたい',
    });
    expect(ids).toEqual(['core', 'continuing']);
  });

  it('§9-A: onboarding 完了 + 履歴クリア直後 (turnsCount=0) → continuing のまま (initial は出さない)', () => {
    const ids = decideSections({
      ...baseState,
      turnsCount: 0,
      onboardingCompleted: true,
    });
    expect(ids).toEqual(['core', 'continuing']);
    expect(ids).not.toContain('initial');
  });

  it('裏側トリガー検出時は backside が末尾に追加される', () => {
    const ids = decideSections({
      ...baseState,
      turnsCount: 5,
      onboardingCompleted: true,
      lastUserText: '裏側見せて',
    });
    expect(ids).toEqual(['core', 'continuing', 'backside']);
  });

  it('recentBacksideActivity が true なら backside が含まれる', () => {
    const ids = decideSections({
      ...baseState,
      turnsCount: 5,
      onboardingCompleted: true,
      lastUserText: 'ありがとう', // 今ターンには裏側語なし
      recentBacksideActivity: true,
    });
    expect(ids).toContain('backside');
  });

  it('onboarding 未完了でも裏側トリガーがあれば backside が含まれる', () => {
    const ids = decideSections({
      ...baseState,
      turnsCount: 0,
      onboardingCompleted: false,
      lastUserText: 'JSON 確認したい',
    });
    expect(ids).toEqual(['core', 'initial', 'backside']);
  });
});

describe('composePrompt', () => {
  const parsed: ParsedSections = {
    sections: {
      core: 'CORE_BODY',
      initial: 'INITIAL_BODY',
      continuing: 'CONTINUING_BODY',
      backside: 'BACKSIDE_BODY',
    },
    unknownSections: [],
    warnings: [],
  };
  const baselineRaw = 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj'; // 10 行

  it('選ばれたセクションのみが本文に含まれる', () => {
    const res = composePrompt(
      parsed,
      { ...baseState, turnsCount: 3, onboardingCompleted: true, lastUserText: 'やあ' },
      'DATA_SECTION',
      baselineRaw
    );
    expect(res.prompt).toContain('CORE_BODY');
    expect(res.prompt).toContain('CONTINUING_BODY');
    expect(res.prompt).not.toContain('INITIAL_BODY');
    expect(res.prompt).not.toContain('BACKSIDE_BODY');
    expect(res.prompt).toContain('DATA_SECTION');
    expect(res.includedSections).toEqual(['core', 'continuing']);
  });

  it('裏側トリガーで backside が含まれる', () => {
    const res = composePrompt(
      parsed,
      { ...baseState, turnsCount: 3, onboardingCompleted: true, lastUserText: '裏側' },
      'DATA',
      baselineRaw
    );
    expect(res.prompt).toContain('BACKSIDE_BODY');
    expect(res.includedSections).toEqual(['core', 'continuing', 'backside']);
  });

  it('baselineLines と composedLines と savingsRatio が一貫している', () => {
    const res = composePrompt(
      parsed,
      { ...baseState, turnsCount: 3, onboardingCompleted: true, lastUserText: 'やあ' },
      'DATA',
      baselineRaw
    );
    expect(res.baselineLines).toBe(10);
    expect(res.composedLines).toBeGreaterThan(0);
    // 数値整合
    const expectedRatio = 1 - res.composedLines / res.baselineLines;
    expect(Math.abs(res.savingsRatio - expectedRatio)).toBeLessThan(1e-9);
  });

  it('空文字セクションは含めない', () => {
    const partial: ParsedSections = {
      sections: { core: 'CORE', initial: '', continuing: 'CONT', backside: '' },
      unknownSections: [],
      warnings: [],
    };
    const res = composePrompt(
      partial,
      { ...baseState, turnsCount: 3, onboardingCompleted: true, lastUserText: 'やあ' },
      'DATA',
      baselineRaw
    );
    expect(res.prompt).toContain('CORE');
    expect(res.prompt).toContain('CONT');
    // initial は空なので結合されない
    expect(res.prompt.split('---').length).toBeGreaterThan(1);
  });
});
