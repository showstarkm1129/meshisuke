/**
 * pantry 差分マージ
 *
 * `update_pantry` の全置換セマンティクスは、弱いモデル（gpt-oss-20b:free 等）が
 * 配列再構築で品目を落とすと「省略＝削除」になり消滅事故を起こす。
 * 差分（delta）ベースに切り替え、指定された品目だけをマージする。
 *
 * 不変条件:
 * - 入力 items に出てこない品目は絶対に変更されない
 * - 削除は `remove: true` の明示が必須。`quantity` が 0 になっても自動削除しない
 * - 負数は 0 にクランプ
 * - name の正規化はコード側では trim 系のみ。意味的揺れ（鶏もも ≒ 鶏もも肉等）は LLM 側責任
 */

import type { Ingredient, Seasoning, StorageType } from '../types/data.types';

const STORAGE_TYPES: ReadonlyArray<StorageType> = ['冷蔵', '冷凍', '常温', '野菜室'];

/** name 比較用の軽い正規化: 前後空白・全半角空白除去・小文字化のみ */
function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/[\s\u3000]+/g, '')
    .toLowerCase();
}

function findByName<T extends { name: string }>(arr: T[], name: string): number {
  const target = normalizeName(name);
  return arr.findIndex((x) => normalizeName(x.name) === target);
}

function clampNonNegative(n: number): number {
  return n < 0 ? 0 : n;
}

function clampRange(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export interface IngredientItemDelta {
  name: string;
  delta?: number;
  set?: number;
  remove?: boolean;
  unit?: string;
  purchased_at?: string;
  expires_at?: string;
  storage?: StorageType;
  note?: string;
}

export interface MergeResult<T> {
  next: T[];
  warnings: string[];
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isValidStorage(s: unknown): s is StorageType {
  return typeof s === 'string' && (STORAGE_TYPES as ReadonlyArray<string>).includes(s);
}

/**
 * 食材の差分マージ。
 * 既存配列の参照は変更せず、新しい配列を返す。
 */
export function mergePantryItems(
  current: Ingredient[],
  items: IngredientItemDelta[]
): MergeResult<Ingredient> {
  const next: Ingredient[] = current.map((x) => ({ ...x }));
  const warnings: string[] = [];

  for (const item of items) {
    if (!item.name || typeof item.name !== 'string') {
      warnings.push('name 欠落の項目をスキップ');
      continue;
    }

    const idx = findByName(next, item.name);

    if (idx >= 0) {
      // 既存品目
      if (item.remove === true) {
        next.splice(idx, 1);
        continue;
      }

      const cur = next[idx];
      let quantity = cur.quantity;
      if (typeof item.set === 'number' && Number.isFinite(item.set)) {
        quantity = clampNonNegative(item.set);
      } else if (typeof item.delta === 'number' && Number.isFinite(item.delta)) {
        quantity = clampNonNegative(cur.quantity + item.delta);
      }

      next[idx] = {
        ...cur,
        quantity,
        // 未指定フィールドは保持。指定されたものだけ上書き
        ...(item.unit !== undefined ? { unit: item.unit } : {}),
        ...(item.purchased_at !== undefined ? { purchased_at: item.purchased_at } : {}),
        ...(item.expires_at !== undefined ? { expires_at: item.expires_at } : {}),
        ...(item.storage !== undefined && isValidStorage(item.storage)
          ? { storage: item.storage }
          : {}),
        ...(item.note !== undefined ? { note: item.note } : {}),
      };
    } else {
      // 既存なし
      if (item.remove === true) {
        // no-op（消すべき対象がそもそも無い）
        continue;
      }

      // delta のみ指定で既存に無い場合 → 表記揺れの可能性大。
      // 新規追加せず警告だけ出すことで「鶏もも」と「鶏もも肉」の二重登録を防ぐ
      const hasDelta = typeof item.delta === 'number' && Number.isFinite(item.delta);
      const hasSet = typeof item.set === 'number' && Number.isFinite(item.set);
      if (hasDelta && !hasSet) {
        warnings.push(
          `「${item.name}」は既存在庫に見つかりません。delta 指定は no-op としました（表記揺れの可能性）`
        );
        continue;
      }

      // 新規追加（unit があるときだけ）
      if (!item.unit) {
        warnings.push(`「${item.name}」: 新規追加には unit が必須です。スキップ`);
        continue;
      }
      const today = todayISO();
      const quantity = hasSet ? clampNonNegative(item.set as number) : 0;
      next.push({
        name: item.name,
        quantity,
        unit: item.unit,
        purchased_at: item.purchased_at ?? today,
        expires_at: item.expires_at ?? '',
        storage: isValidStorage(item.storage) ? item.storage : '冷蔵',
        note: item.note ?? '',
      });
    }
  }

  return { next, warnings };
}

export interface SeasoningItemDelta {
  name: string;
  delta_ml_or_g?: number;
  refill_full?: boolean;
  note?: string;
}

/**
 * 調味料の差分マージ。
 * - delta_ml_or_g: amount_current に加算（0〜amount_full でクランプ）
 * - refill_full: amount_current を amount_full に戻す
 * - 既存に無い名前は警告のみ（調味料は新規追加を許さない: 容量情報がないため）
 */
export function mergeSeasonings(
  current: Seasoning[],
  items: SeasoningItemDelta[]
): MergeResult<Seasoning> {
  const next: Seasoning[] = current.map((x) => ({ ...x }));
  const warnings: string[] = [];

  for (const item of items) {
    if (!item.name || typeof item.name !== 'string') {
      warnings.push('name 欠落の項目をスキップ');
      continue;
    }

    const idx = findByName(next, item.name);
    if (idx < 0) {
      warnings.push(`調味料「${item.name}」が既存に無いため no-op（表記揺れの可能性）`);
      continue;
    }

    const cur = next[idx];
    let amount = cur.amount_current;
    if (item.refill_full === true) {
      amount = cur.amount_full;
    } else if (typeof item.delta_ml_or_g === 'number' && Number.isFinite(item.delta_ml_or_g)) {
      amount = clampRange(cur.amount_current + item.delta_ml_or_g, 0, cur.amount_full);
    }

    next[idx] = {
      ...cur,
      amount_current: amount,
      ...(item.note !== undefined ? { note: item.note } : {}),
    };
  }

  return { next, warnings };
}
