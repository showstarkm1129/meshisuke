import { useCallback } from 'react';
import { useAppState } from './useAppState';
import {
  findDataDirectory,
  getFileHandle,
  readJsonFile,
  readJsonlFile,
  isValidProfile,
  isValidEquipment,
  isValidPantry,
} from '../lib/fileio';
import type { Profile, Equipment, Pantry, MealRecord } from '../types/data.types';

export function useDataLoader() {
  const { state, dispatch } = useAppState();

  const loadData = useCallback(async () => {
    const rootHandle = state.dirHandle;
    if (rootHandle === null) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERRORS' });

    try {
      // data/ ディレクトリハンドル取得
      const dataHandle = await findDataDirectory(rootHandle);
      if (dataHandle === null) {
        dispatch({ type: 'ADD_ERROR', payload: 'data/ ディレクトリが見つかりません。' });
        return;
      }

      const errors: string[] = [];

      // profile.json 読み込み
      let profile: Profile | null = null;
      try {
        const fh = await getFileHandle(dataHandle, 'profile.json');
        const raw = await readJsonFile<unknown>(fh);
        if (raw !== null && isValidProfile(raw)) {
          profile = raw as Profile;
        } else {
          errors.push('profile.json のスキーマが不正です。');
        }
      } catch {
        errors.push('profile.json の読み込みに失敗しました。');
      }

      // equipment.json 読み込み
      let equipment: Equipment | null = null;
      try {
        const fh = await getFileHandle(dataHandle, 'equipment.json');
        const raw = await readJsonFile<unknown>(fh);
        if (raw !== null && isValidEquipment(raw)) {
          equipment = raw as Equipment;
        } else {
          errors.push('equipment.json のスキーマが不正です。');
        }
      } catch {
        errors.push('equipment.json の読み込みに失敗しました。');
      }

      // pantry.json 読み込み
      let pantry: Pantry | null = null;
      try {
        const fh = await getFileHandle(dataHandle, 'pantry.json');
        const raw = await readJsonFile<unknown>(fh);
        if (raw !== null && isValidPantry(raw)) {
          pantry = raw as Pantry;
        } else {
          errors.push('pantry.json のスキーマが不正です。');
        }
      } catch {
        errors.push('pantry.json の読み込みに失敗しました。');
      }

      // meal_history.jsonl 読み込み
      let mealHistory: MealRecord[] = [];
      try {
        const fh = await getFileHandle(dataHandle, 'meal_history.jsonl');
        mealHistory = await readJsonlFile<MealRecord>(fh);
      } catch {
        errors.push('meal_history.jsonl の読み込みに失敗しました。');
      }

      // エラーを dispatch
      for (const msg of errors) {
        dispatch({ type: 'ADD_ERROR', payload: msg });
      }

      // データを dispatch（一部が null でもエラーが出た分は ADD_ERROR 済みなので続行）
      dispatch({
        type: 'SET_DATA',
        payload: { profile, equipment, pantry, mealHistory },
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.dirHandle, dispatch]);

  return { loadData };
}
