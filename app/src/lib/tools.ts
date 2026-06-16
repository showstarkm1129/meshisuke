import type { ToolDefinition } from './llm/types';

/**
 * 差分系の食材在庫ツール。通常対話で使う。
 * 弱いモデルが全置換で品目を落とす消滅事故を避けるため、
 * 「指定した品目だけを変更」「省略は無変更」「削除は明示」の3原則で設計している。
 */
const ADJUST_PANTRY_ITEMS: ToolDefinition = {
  name: 'adjust_pantry_items',
  description:
    '食材在庫を差分で更新する。指定した食材だけが変更され、指定しなかった食材は一切変更されない。' +
    '使用分を減らす(delta マイナス)、買い足し(set 上書き or delta プラス)、新規追加、削除(remove:true)に対応。' +
    'name は在庫サマリーに出ている正式名と完全一致させること。在庫に無いものを追加するときだけ新しい名前でよい。' +
    '削除したいときは必ず remove:true を指定する。数量0でも勝手には消えない。',
  parameters: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: '差分操作のリスト。各要素は1つの食材に対する操作。',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '食材名。在庫の正式名と完全一致させる。' },
            delta: { type: 'number', description: '現在数量への増減（負で減算）。set と排他。' },
            set: {
              type: 'number',
              description: '数量を絶対値で上書き。delta と排他。新規追加時の初期値にも使える。',
            },
            remove: {
              type: 'boolean',
              description: 'true のときだけ削除する。省略では削除されない。',
            },
            unit: { type: 'string', description: '新規追加時のみ必須。' },
            purchased_at: {
              type: 'string',
              description: 'YYYY-MM-DD。新規追加時の任意。省略時は当日。',
            },
            expires_at: { type: 'string', description: 'YYYY-MM-DD。任意。' },
            storage: {
              type: 'string',
              enum: ['冷蔵', '冷凍', '常温', '野菜室'],
              description: '新規追加時の任意。省略時は冷蔵。',
            },
            note: { type: 'string' },
          },
          required: ['name'],
        },
      },
    },
    required: ['items'],
  },
};

const ADJUST_SEASONINGS: ToolDefinition = {
  name: 'adjust_seasonings',
  description:
    '調味料の残量を差分で更新する。指定した調味料だけが変更される。' +
    'delta_ml_or_g は使用量を ml または g で渡す（負で減算、調味料の正規単位に従う）。' +
    '買い替え/新品差し戻しのときは refill_full:true。name は在庫サマリーの正式名と完全一致させる。',
  parameters: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            delta_ml_or_g: {
              type: 'number',
              description: '残量の増減（負で減算）。単位は対象調味料の unit に従う。',
            },
            refill_full: { type: 'boolean', description: '新品/満タンに戻す。' },
            note: { type: 'string' },
          },
          required: ['name'],
        },
      },
    },
    required: ['items'],
  },
};

const ADD_MEAL_RECORD: ToolDefinition = {
  name: 'add_meal_record',
  description:
    'ユーザーが食事を取った（または取ると確定した）時、meal_history に 1 レコード追加する。',
  parameters: {
    type: 'object',
    properties: {
      record: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD' },
          meal: { type: 'string', enum: ['朝', '昼', '夜', '間食'] },
          menu: { type: 'string' },
          ingredients_used: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
              },
              required: ['name', 'quantity', 'unit'],
            },
          },
          nutrition: {
            type: 'object',
            properties: {
              kcal: { type: 'number' },
              protein_g: { type: 'number' },
              fat_g: { type: 'number' },
              carb_g: { type: 'number' },
              salt_g: { type: 'number' },
              source: { type: 'string', enum: ['推定', 'MEXT 八訂'] },
            },
            required: ['kcal', 'protein_g', 'fat_g', 'carb_g', 'salt_g', 'source'],
          },
          cost_yen: { type: 'number' },
          // OpenAI 互換 function calling では `type: ['number','null']` を受け付けない
          // 実装があるため、単一型に統一して required から外す。未確定なら省略してよい。
          satisfaction: {
            type: 'number',
            description: '1〜5 の整数。食事時点で未確定なら省略する（後日入力可）。',
          },
          note: { type: 'string' },
        },
        required: ['date', 'meal', 'menu', 'ingredients_used', 'nutrition', 'cost_yen', 'note'],
      },
    },
    required: ['record'],
  },
};

const UPDATE_PROFILE: ToolDefinition = {
  name: 'update_profile',
  description:
    '嗜好（favorites/dislikes/allergies）の重み更新、栄養目標の変更、初回フォーム完了時の onboarding_completed=true 設定などに使う。profile オブジェクト全体を渡す。',
  parameters: {
    type: 'object',
    properties: {
      profile: {
        type: 'object',
      },
    },
    required: ['profile'],
  },
};

/** 裏側モードでのみ提供する全置換ツール。バックアップ復元・一括上書き専用。 */
const UPDATE_PANTRY_FULL: ToolDefinition = {
  name: 'update_pantry',
  description:
    '【裏側モード専用】pantry オブジェクト全体を渡して全置換する。通常会話では絶対に使用しない。' +
    '通常の食材・調味料の増減は adjust_pantry_items / adjust_seasonings を使うこと。' +
    'このツールは「全置換のため、渡さなかった食材は全て消える」破壊的な動作をする。',
  parameters: {
    type: 'object',
    properties: {
      pantry: {
        type: 'object',
        properties: {
          updated_at: { type: 'string', description: 'YYYY-MM-DD' },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
                purchased_at: { type: 'string' },
                expires_at: { type: 'string' },
                storage: { type: 'string', enum: ['冷蔵', '冷凍', '常温', '野菜室'] },
                note: { type: 'string' },
              },
              required: [
                'name',
                'quantity',
                'unit',
                'purchased_at',
                'expires_at',
                'storage',
                'note',
              ],
            },
          },
          seasonings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                amount_current: { type: 'number' },
                amount_full: { type: 'number' },
                unit: { type: 'string', enum: ['ml', 'g'] },
                note: { type: 'string' },
              },
              required: ['name', 'amount_current', 'amount_full', 'unit', 'note'],
            },
          },
        },
        required: ['updated_at', 'ingredients', 'seasonings'],
      },
    },
    required: ['pantry'],
  },
};

/** 通常対話で出すツール（差分系のみ）。 */
export const TOOLS_DIALOG: ToolDefinition[] = [
  ADJUST_PANTRY_ITEMS,
  ADJUST_SEASONINGS,
  ADD_MEAL_RECORD,
  UPDATE_PROFILE,
];

/** 裏側モードで追加されるツール。 */
export const TOOLS_BACKSIDE_EXTRA: ToolDefinition[] = [UPDATE_PANTRY_FULL];

/** 会話モードに応じて使うべきツール一覧を返す。 */
export function selectTools(isBackside: boolean): ToolDefinition[] {
  return isBackside ? [...TOOLS_DIALOG, ...TOOLS_BACKSIDE_EXTRA] : TOOLS_DIALOG;
}

/** 全ツール名。本文サニタイザがツール呼び出し漏れを検出するのに使う。 */
export const ALL_TOOL_NAMES: string[] = [...TOOLS_DIALOG, ...TOOLS_BACKSIDE_EXTRA].map(
  (t) => t.name
);

export const TOOL_NOTICE_LABELS: Record<string, string> = {
  adjust_pantry_items: '冷蔵庫の在庫を整理しています…',
  adjust_seasonings: '調味料の残量を更新しています…',
  add_meal_record: '食事の記録をつけています…',
  update_profile: 'あなたの好みをメモしています…',
  update_pantry: '在庫を一括上書きしています…',
};
