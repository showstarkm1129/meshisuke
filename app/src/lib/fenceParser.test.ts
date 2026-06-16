import { describe, it, expect } from 'vitest';
import { parseFenceBlocks } from './fenceParser';

describe('parseFenceBlocks', () => {
  it('プレーンテキストは単一の markdown ブロックになる', () => {
    const result = parseFenceBlocks('こんにちは🍳');
    expect(result).toEqual([{ kind: 'markdown', payload: 'こんにちは🍳' }]);
  });

  it(':::choices フェンスを抽出し選択肢配列に分割する', () => {
    const text = `今日の気分は？

:::choices
さっぱり|がっつり|おまかせ
:::`;
    const result = parseFenceBlocks(text);
    expect(result.length).toBe(2);
    expect(result[0].kind).toBe('markdown');
    expect(result[1]).toEqual({
      kind: 'choices',
      payload: ['さっぱり', 'がっつり', 'おまかせ'],
    });
  });

  it(':::pantry フェンスを抽出する', () => {
    const text = `在庫だよ

:::pantry
玉ねぎ 3個
鶏もも 200g
:::`;
    const result = parseFenceBlocks(text);
    const pantryBlock = result.find((b) => b.kind === 'pantry');
    expect(pantryBlock).toBeDefined();
    expect(pantryBlock?.kind === 'pantry' && pantryBlock.payload).toContain('玉ねぎ');
  });

  /**
   * 重要な回帰テスト:
   * AI が 1 応答に :::choices フェンスを 2 つ並べる違反を犯したとき、
   * parser はすべてのブロックを順序を保ったまま返さなくてはならない。
   * これによりレンダラ側で「末尾だけ採用」が成立する。
   */
  it('複数の :::choices フェンスを順序を保って全て返す', () => {
    const text = `今はどんな気分？

:::choices
さっぱり|がっつり|おまかせ
:::

時間はどれくらいかけられる？

:::choices
15分以内|30分以内|60分以内|それ以上
:::`;
    const result = parseFenceBlocks(text);
    const choices = result.filter((b) => b.kind === 'choices');
    expect(choices.length).toBe(2);
    expect(choices[0].kind === 'choices' && choices[0].payload).toEqual([
      'さっぱり',
      'がっつり',
      'おまかせ',
    ]);
    expect(choices[1].kind === 'choices' && choices[1].payload).toEqual([
      '15分以内',
      '30分以内',
      '60分以内',
      'それ以上',
    ]);
  });

  it(':::choices と :::pantry が混在しても順序通り取れる', () => {
    const text = `はじめに

:::pantry
卵 5個
:::

つぎに

:::choices
A|B
:::`;
    const result = parseFenceBlocks(text);
    const kinds = result.map((b) => b.kind);
    // markdown -> pantry -> markdown -> choices の順
    expect(kinds).toEqual(['markdown', 'pantry', 'markdown', 'choices']);
  });

  it('選択肢の前後の空白を trim する', () => {
    const text = `:::choices
  はい  |  いいえ
:::`;
    const result = parseFenceBlocks(text);
    const choicesBlock = result.find((b) => b.kind === 'choices');
    expect(choicesBlock?.kind === 'choices' && choicesBlock.payload).toEqual(['はい', 'いいえ']);
  });
});
