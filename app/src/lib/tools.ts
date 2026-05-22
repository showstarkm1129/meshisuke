import type { ToolDefinition } from './llm/types';

export const TOOLS: ToolDefinition[] = [
  {
    name: 'update_pantry',
    description: 'ユーザーが食事メニューを確定した時など、食材在庫や調味料残量を更新する。pantry オブジェクト全体を渡す。',
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
                required: ['name', 'quantity', 'unit', 'purchased_at', 'expires_at', 'storage', 'note'],
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
  },
  {
    name: 'add_meal_record',
    description: 'ユーザーが食事を取った（または取ると確定した）時、meal_history に 1 レコード追加する。',
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
            satisfaction: { type: ['number', 'null'] },
            note: { type: 'string' },
          },
          required: ['date', 'meal', 'menu', 'ingredients_used', 'nutrition', 'cost_yen', 'satisfaction', 'note'],
        },
      },
      required: ['record'],
    },
  },
  {
    name: 'update_profile',
    description: '嗜好（favorites/dislikes/allergies）の重み更新、栄養目標の変更、初回フォーム完了時の onboarding_completed=true 設定などに使う。profile オブジェクト全体を渡す。',
    parameters: {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
        },
      },
      required: ['profile'],
    },
  },
];

export const TOOL_NOTICE_LABELS: Record<string, string> = {
  update_pantry: '冷蔵庫の在庫を整理しています…',
  add_meal_record: '食事の記録をつけています…',
  update_profile: 'あなたの好みをメモしています…',
};
