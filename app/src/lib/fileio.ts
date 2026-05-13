import type { MealRecord } from '../types/data.types';

// --------------------------------------------------------
// ファイルハンドル取得
// --------------------------------------------------------

/**
 * ファイル名 → ファイルハンドルを取得する
 * data/ 配下のハンドルを想定（dirHandle は data/ ディレクトリ）
 */
export async function getFileHandle(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<FileSystemFileHandle> {
  return dirHandle.getFileHandle(fileName);
}

// --------------------------------------------------------
// JSON ファイルの読み込み
// --------------------------------------------------------

/**
 * FileSystemFileHandle から JSON を読み込んでパースして返す
 * パース失敗時は null を返す（エラーはログのみ）
 */
export async function readJsonFile<T>(fileHandle: FileSystemFileHandle): Promise<T | null> {
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch {
    console.error(`[fileio] readJsonFile failed: ${fileHandle.name}`);
    return null;
  }
}

// --------------------------------------------------------
// JSONL ファイルの読み込み
// --------------------------------------------------------

/**
 * FileSystemFileHandle から JSONL を読み込んで行ごとにパースして返す
 * パース失敗行はスキップしてコンソールにログを出す
 */
export async function readJsonlFile<T>(fileHandle: FileSystemFileHandle): Promise<T[]> {
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const results: T[] = [];
    for (const [i, line] of lines.entries()) {
      try {
        results.push(JSON.parse(line) as T);
      } catch {
        console.warn(
          `[fileio] readJsonlFile: skipped malformed line ${i + 1} in ${fileHandle.name}`
        );
      }
    }
    return results;
  } catch {
    console.error(`[fileio] readJsonlFile failed: ${fileHandle.name}`);
    return [];
  }
}

// --------------------------------------------------------
// JSON ファイルの書き込み
// --------------------------------------------------------

/**
 * オブジェクトを JSON として上書き保存する
 * 保存失敗時は Error をスローする（呼び出し側でキャッチすること）
 */
export async function writeJsonFile<T>(
  fileHandle: FileSystemFileHandle,
  data: T
): Promise<void> {
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch (err) {
    await writable.abort();
    throw err;
  }
}

// --------------------------------------------------------
// JSONL ファイルへの追記
// --------------------------------------------------------

/**
 * MealRecord を JSONL ファイルの末尾に 1 行追記する
 * 追記失敗時は Error をスローする（呼び出し側でキャッチすること）
 */
export async function appendJsonlRecord(
  fileHandle: FileSystemFileHandle,
  record: MealRecord
): Promise<void> {
  // 現在の内容を全件読み込んで末尾に 1 行追加してから上書き保存
  // File System Access API には "append mode" がないため、全件読み込み→追記→上書きで実現する
  const file = await fileHandle.getFile();
  const existingText = await file.text();
  const trimmed = existingText.trimEnd();
  const newLine = JSON.stringify(record);
  const newContent = trimmed.length > 0 ? `${trimmed}\n${newLine}\n` : `${newLine}\n`;

  const writable = await fileHandle.createWritable();
  try {
    await writable.write(newContent);
    await writable.close();
  } catch (err) {
    await writable.abort();
    throw err;
  }
}

// --------------------------------------------------------
// data/ ディレクトリの検出
// --------------------------------------------------------

/**
 * ルートフォルダハンドルから data/ サブディレクトリハンドルを取得する
 * data/ が存在しない場合は null を返す
 */
export async function findDataDirectory(
  rootHandle: FileSystemDirectoryHandle
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const dataHandle = await rootHandle.getDirectoryHandle('data');
    return dataHandle;
  } catch {
    return null;
  }
}

// --------------------------------------------------------
// 4ファイルの存在確認
// --------------------------------------------------------

export const REQUIRED_FILES = [
  'profile.json',
  'equipment.json',
  'pantry.json',
  'meal_history.jsonl',
] as const;

export type RequiredFileName = (typeof REQUIRED_FILES)[number];

/**
 * data/ ディレクトリに必須ファイルが存在するか確認する
 * 存在しないファイル名のリストを返す（空配列 = 全て存在）
 */
export async function checkRequiredFiles(
  dataHandle: FileSystemDirectoryHandle
): Promise<RequiredFileName[]> {
  const missing: RequiredFileName[] = [];
  for (const fileName of REQUIRED_FILES) {
    try {
      await dataHandle.getFileHandle(fileName);
    } catch {
      missing.push(fileName);
    }
  }
  return missing;
}

// --------------------------------------------------------
// 型ガード（スキーマ検証の最低限）
// --------------------------------------------------------

/**
 * profile.json が最低限の必須フィールドを持つか確認する型ガード
 * 詳細なフィールド検証は行わない（MVP スコープの最低限）
 */
export function isValidProfile(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['onboarding_completed'] === 'boolean' &&
    typeof obj['created_at'] === 'string' &&
    typeof obj['updated_at'] === 'string'
  );
}

/**
 * equipment.json が最低限の必須フィールドを持つか確認する型ガード
 */
export function isValidEquipment(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['updated_at'] === 'string' &&
    Array.isArray(obj['appliances']) &&
    Array.isArray(obj['cookware']) &&
    Array.isArray(obj['heat_sources'])
  );
}

/**
 * pantry.json が最低限の必須フィールドを持つか確認する型ガード
 */
export function isValidPantry(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['updated_at'] === 'string' &&
    Array.isArray(obj['ingredients']) &&
    Array.isArray(obj['seasonings'])
  );
}
