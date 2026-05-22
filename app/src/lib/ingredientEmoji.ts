export const ingredientEmojiDict: Record<string, string> = {
  '玉ねぎ': '🧅',
  'たまねぎ': '🧅',
  'にんじん': '🥕',
  '人参': '🥕',
  'じゃがいも': '🥔',
  'キャベツ': '🥬',
  'レタス': '🥬',
  'トマト': '🍅',
  '卵': '🥚',
  'たまご': '🥚',
  '鶏もも': '🐔',
  '鶏肉': '🐔',
  '豚肉': '🐷',
  '牛肉': '🐮',
  '牛乳': '🥛',
  '豆腐': '🧊',
  '納豆': '🫘',
  '米': '🍚',
  'ご飯': '🍚',
  'うどん': '🍜',
  'パスタ': '🍝',
  'ピーマン': '🫑',
  'なす': '🍆',
  'きのこ': '🍄',
  'しめじ': '🍄',
  'えのき': '🍄',
  'ねぎ': '🌿',
  '長ねぎ': '🌿',
  'チーズ': '🧀',
  'パン': '🍞',
  '食パン': '🍞'
};

export function getIngredientEmoji(name: string): string {
  // Try exact match
  if (ingredientEmojiDict[name]) {
    return ingredientEmojiDict[name];
  }
  // Try substring match
  for (const [key, emoji] of Object.entries(ingredientEmojiDict)) {
    if (name.includes(key)) {
      return emoji;
    }
  }
  return '🥘'; // Fallback
}
