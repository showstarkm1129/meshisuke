// --------------------------------------------------------
// profile.json
// --------------------------------------------------------

export type WeightedItem = {
  name: string;
  weight: 1 | 2 | 3;
  last_signal_at: string; // YYYY-MM-DD
  signal_count: number;
};

export type DailyTargets = {
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrate_g: number;
  salt_g: number;
  note: string;
};

export type Profile = {
  onboarding_completed: boolean;
  created_at: string; // YYYY-MM-DD
  updated_at: string; // YYYY-MM-DD
  allergies: WeightedItem[] | null; // null = 未確認
  dislikes: WeightedItem[] | null; // null = 未確認
  favorites: WeightedItem[] | null; // null = 未確認
  dietary_restrictions: string[];
  daily_targets: DailyTargets;
  notes: string;
};

// --------------------------------------------------------
// equipment.json
// --------------------------------------------------------

export type Appliance = {
  name: string;
};

export type Cookware = {
  name: string;
  size?: string;
};

export type HeatSource = {
  name: string;
  burners?: number;
};

export type Equipment = {
  updated_at: string;
  appliances: Appliance[];
  cookware: Cookware[];
  heat_sources: HeatSource[];
  utensils: string[];
  skill_level: string;
  constraints: string[];
};

// --------------------------------------------------------
// pantry.json
// --------------------------------------------------------

export type StorageType = '冷蔵' | '冷凍' | '常温' | '野菜室';

export type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
  purchased_at: string;
  expires_at: string;
  storage: StorageType;
  note: string;
};

export type Seasoning = {
  name: string;
  amount_current: number;
  amount_full: number;
  unit: 'ml' | 'g';
  note: string;
};

export type Pantry = {
  updated_at: string;
  ingredients: Ingredient[];
  seasonings: Seasoning[];
};

// --------------------------------------------------------
// meal_history.jsonl（1行 = 1食）
// --------------------------------------------------------

export type MealType = '朝' | '昼' | '夜' | '間食';
export type NutritionSource = '推定' | 'MEXT 八訂';

export type NutritionRecord = {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  salt_g: number;
  source: NutritionSource;
};

export type MealIngredientUsed = {
  name: string;
  quantity: number;
  unit: string;
};

export type MealRecord = {
  date: string; // YYYY-MM-DD
  meal: MealType;
  menu: string;
  ingredients_used: MealIngredientUsed[];
  nutrition: NutritionRecord;
  cost_yen: number;
  satisfaction: number | null; // 1〜5 または null（後日入力）
  note: string;
};

// --------------------------------------------------------
// アプリ全体の状態型
// --------------------------------------------------------

export const SaveMode = {
  Auto: 'auto',
  Manual: 'manual',
} as const;
export type SaveMode = (typeof SaveMode)[keyof typeof SaveMode];

export type AppDataState = {
  profile: Profile | null;
  equipment: Equipment | null;
  pantry: Pantry | null;
  mealHistory: MealRecord[];
};

export type AppState = {
  data: AppDataState;
  saveMode: SaveMode;
  isLoading: boolean;
  errors: string[];
  dirHandle: FileSystemDirectoryHandle | null;
};
