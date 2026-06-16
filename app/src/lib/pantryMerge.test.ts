import { describe, it, expect } from 'vitest';
import { mergePantryItems, mergeSeasonings } from './pantryMerge';
import type { Ingredient, Seasoning } from '../types/data.types';

function ing(overrides: Partial<Ingredient>): Ingredient {
  return {
    name: '玉ねぎ',
    quantity: 3,
    unit: '個',
    purchased_at: '2026-05-20',
    expires_at: '2026-06-05',
    storage: '野菜室',
    note: '',
    ...overrides,
  };
}

function sea(overrides: Partial<Seasoning>): Seasoning {
  return {
    name: '醤油',
    amount_current: 200,
    amount_full: 500,
    unit: 'ml',
    note: '',
    ...overrides,
  };
}

describe('mergePantryItems', () => {
  it('1品 delta 更新で他品目は完全に保持される（消滅防止の中核）', () => {
    const current: Ingredient[] = [
      ing({ name: '玉ねぎ', quantity: 3 }),
      ing({ name: '鶏もも', quantity: 200, unit: 'g', storage: '冷蔵' }),
      ing({ name: '卵', quantity: 5, unit: '個', storage: '冷蔵' }),
    ];
    const { next } = mergePantryItems(current, [{ name: '玉ねぎ', delta: -1 }]);
    expect(next).toHaveLength(3);
    expect(next.find((x) => x.name === '玉ねぎ')?.quantity).toBe(2);
    expect(next.find((x) => x.name === '鶏もも')?.quantity).toBe(200);
    expect(next.find((x) => x.name === '卵')?.quantity).toBe(5);
  });

  it('remove 省略では消えない（quantity=0 になっても残る）', () => {
    const current: Ingredient[] = [ing({ name: '玉ねぎ', quantity: 1 })];
    const { next } = mergePantryItems(current, [{ name: '玉ねぎ', delta: -1 }]);
    expect(next).toHaveLength(1);
    expect(next[0].quantity).toBe(0);
  });

  it('remove: true のときだけ削除される', () => {
    const current: Ingredient[] = [ing({ name: '玉ねぎ' }), ing({ name: '卵', unit: '個' })];
    const { next } = mergePantryItems(current, [{ name: '玉ねぎ', remove: true }]);
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe('卵');
  });

  it('負数クランプ: delta で 0 未満になるなら 0', () => {
    const current: Ingredient[] = [ing({ name: '玉ねぎ', quantity: 1 })];
    const { next } = mergePantryItems(current, [{ name: '玉ねぎ', delta: -5 }]);
    expect(next[0].quantity).toBe(0);
  });

  it('set による絶対値上書き', () => {
    const current: Ingredient[] = [ing({ name: '玉ねぎ', quantity: 3 })];
    const { next } = mergePantryItems(current, [{ name: '玉ねぎ', set: 10 }]);
    expect(next[0].quantity).toBe(10);
  });

  it('既存品目の未指定フィールドは保持される', () => {
    const current: Ingredient[] = [
      ing({
        name: '玉ねぎ',
        quantity: 3,
        purchased_at: '2026-05-20',
        expires_at: '2026-06-05',
        note: '甘い',
      }),
    ];
    const { next } = mergePantryItems(current, [{ name: '玉ねぎ', delta: -1 }]);
    expect(next[0].purchased_at).toBe('2026-05-20');
    expect(next[0].expires_at).toBe('2026-06-05');
    expect(next[0].note).toBe('甘い');
    expect(next[0].storage).toBe('野菜室');
  });

  it('新規追加: unit があれば追加される', () => {
    const current: Ingredient[] = [];
    const { next } = mergePantryItems(current, [
      { name: 'バター', unit: 'g', set: 200, storage: '冷蔵', expires_at: '2026-07-01' },
    ]);
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe('バター');
    expect(next[0].quantity).toBe(200);
    expect(next[0].unit).toBe('g');
    expect(next[0].storage).toBe('冷蔵');
  });

  it('新規追加: unit 欠落はスキップして warning', () => {
    const current: Ingredient[] = [];
    const { next, warnings } = mergePantryItems(current, [
      { name: 'バター', set: 200 } as unknown as Ingredient,
    ]);
    expect(next).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('既存に無い名前への delta/set は no-op + warning（表記揺れ二重登録防止）', () => {
    const current: Ingredient[] = [
      ing({ name: '鶏もも', unit: 'g', quantity: 200, storage: '冷蔵' }),
    ];
    const { next, warnings } = mergePantryItems(current, [{ name: '鶏もも肉', delta: -100 }]);
    expect(next).toHaveLength(1);
    expect(next[0].quantity).toBe(200);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('既存に無い名前への remove は no-op（警告も不要）', () => {
    const current: Ingredient[] = [ing({ name: '玉ねぎ' })];
    const { next } = mergePantryItems(current, [{ name: '存在しない', remove: true }]);
    expect(next).toHaveLength(1);
  });

  it('name の前後空白・大文字小文字・全半角空白の差は吸収される', () => {
    const current: Ingredient[] = [ing({ name: '玉ねぎ', quantity: 3 })];
    const { next } = mergePantryItems(current, [{ name: '  玉ねぎ  ', delta: -1 }]);
    expect(next[0].quantity).toBe(2);
  });

  it('入力 current は破壊されない（純関数）', () => {
    const current: Ingredient[] = [ing({ name: '玉ねぎ', quantity: 3 })];
    mergePantryItems(current, [{ name: '玉ねぎ', delta: -1 }]);
    expect(current[0].quantity).toBe(3);
  });
});

describe('mergeSeasonings', () => {
  it('delta_ml_or_g で amount_current が減る・他の調味料は不変', () => {
    const current: Seasoning[] = [
      sea({ name: '醤油', amount_current: 200, amount_full: 500 }),
      sea({ name: '味噌', amount_current: 300, amount_full: 500, unit: 'g' }),
    ];
    const { next } = mergeSeasonings(current, [{ name: '醤油', delta_ml_or_g: -15 }]);
    expect(next.find((x) => x.name === '醤油')?.amount_current).toBe(185);
    expect(next.find((x) => x.name === '味噌')?.amount_current).toBe(300);
  });

  it('refill_full で amount_full に戻る', () => {
    const current: Seasoning[] = [sea({ name: '醤油', amount_current: 50, amount_full: 500 })];
    const { next } = mergeSeasonings(current, [{ name: '醤油', refill_full: true }]);
    expect(next[0].amount_current).toBe(500);
  });

  it('amount_full を超えるクランプ', () => {
    const current: Seasoning[] = [sea({ name: '醤油', amount_current: 490, amount_full: 500 })];
    const { next } = mergeSeasonings(current, [{ name: '醤油', delta_ml_or_g: 100 }]);
    expect(next[0].amount_current).toBe(500);
  });

  it('0 未満のクランプ', () => {
    const current: Seasoning[] = [sea({ name: '醤油', amount_current: 10, amount_full: 500 })];
    const { next } = mergeSeasonings(current, [{ name: '醤油', delta_ml_or_g: -50 }]);
    expect(next[0].amount_current).toBe(0);
  });

  it('既存に無い調味料は no-op + warning（新規追加しない）', () => {
    const current: Seasoning[] = [sea({ name: '醤油' })];
    const { next, warnings } = mergeSeasonings(current, [
      { name: '存在しない', delta_ml_or_g: -10 },
    ]);
    expect(next).toHaveLength(1);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
