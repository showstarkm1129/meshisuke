import systemPromptRaw from '../../../システムプロンプト.md?raw';
import type {
  AppDataState,
  Profile,
  Equipment,
  Pantry,
  MealRecord,
  WeightedItem,
} from '../types/data.types';

const MEAL_HISTORY_LIMIT = 5;

function summarizeWeighted(label: string, items: WeightedItem[] | null): string {
  if (items === null) return `- ${label}: 未確認`;
  if (items.length === 0) return `- ${label}: 該当なし（確認済み）`;
  return `- ${label}: ${items.map(i => `${i.name}(w=${i.weight})`).join(', ')}`;
}

function summarizeProfile(p: Profile | null): string {
  if (!p) return '(未設定)';
  const t = p.daily_targets;
  const lines = [
    `- onboarding_completed: ${p.onboarding_completed}`,
    summarizeWeighted('allergies', p.allergies),
    summarizeWeighted('dislikes', p.dislikes),
    summarizeWeighted('favorites', p.favorites),
    `- dietary_restrictions: ${p.dietary_restrictions.length ? p.dietary_restrictions.join(', ') : 'なし'}`,
    `- daily_targets: ${t.calories_kcal}kcal / P${t.protein_g}g F${t.fat_g}g C${t.carbohydrate_g}g 塩${t.salt_g}g`,
  ];
  if (p.notes) lines.push(`- notes: ${p.notes}`);
  return lines.join('\n');
}

function summarizeEquipment(e: Equipment | null): string {
  if (!e) return '(未設定)';
  const lines = [
    `- skill_level: ${e.skill_level}`,
    `- appliances: ${e.appliances.map(a => a.name).join(', ') || 'なし'}`,
    `- cookware: ${e.cookware.map(c => (c.size ? `${c.name}(${c.size})` : c.name)).join(', ') || 'なし'}`,
    `- heat_sources: ${e.heat_sources.map(h => (h.burners ? `${h.name}×${h.burners}口` : h.name)).join(', ') || 'なし'}`,
  ];
  if (e.constraints.length) lines.push(`- constraints: ${e.constraints.join(', ')}`);
  return lines.join('\n');
}

function summarizePantry(p: Pantry | null): string {
  if (!p) return '(未設定)';
  const lines: string[] = [`- updated_at: ${p.updated_at}`];
  if (p.ingredients.length === 0) {
    lines.push('- ingredients: なし');
  } else {
    lines.push('- ingredients:');
    for (const i of p.ingredients) {
      const noteSuffix = i.note ? ` (${i.note})` : '';
      lines.push(`  - ${i.name}: ${i.quantity}${i.unit} / 期限${i.expires_at} / ${i.storage}${noteSuffix}`);
    }
  }
  if (p.seasonings.length === 0) {
    lines.push('- seasonings: なし');
  } else {
    lines.push('- seasonings:');
    for (const s of p.seasonings) {
      const pct = s.amount_full > 0 ? Math.round((s.amount_current / s.amount_full) * 100) : 0;
      lines.push(`  - ${s.name}: ${s.amount_current}/${s.amount_full}${s.unit} (${pct}%)`);
    }
  }
  return lines.join('\n');
}

function summarizeMealHistory(records: MealRecord[]): string {
  if (records.length === 0) return '(履歴なし)';
  const recent = records.slice(-MEAL_HISTORY_LIMIT);
  return recent
    .map(r => {
      const sat = r.satisfaction === null ? '?' : String(r.satisfaction);
      return `- ${r.date} ${r.meal} ${r.menu} (${r.nutrition.kcal}kcal, ¥${r.cost_yen}, 満足=${sat})`;
    })
    .join('\n');
}

export function buildSystemPrompt(data: AppDataState): string {
  const dataSection = [
    '## 現在のユーザーデータ（要約）',
    '',
    '### profile',
    summarizeProfile(data.profile),
    '',
    '### equipment',
    summarizeEquipment(data.equipment),
    '',
    '### pantry',
    summarizePantry(data.pantry),
    '',
    `### meal_history (直近 ${MEAL_HISTORY_LIMIT} 件)`,
    summarizeMealHistory(data.mealHistory),
  ].join('\n');

  return `${systemPromptRaw}\n\n---\n\n${dataSection}`;
}
