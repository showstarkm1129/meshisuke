import { useCallback } from 'react';
import { useAppState } from './useAppState';
import {
  findDataDirectory,
  getFileHandle,
  writeJsonFile,
  appendJsonlRecord,
} from '../lib/fileio';
import type { Profile, Pantry, Equipment, MealRecord } from '../types/data.types';
import { SaveMode } from '../types/data.types';
import { formatErrorDetail } from '../lib/errors';

export function useFileSaver() {
  const { state, dispatch } = useAppState();

  /**
   * profile.json を保存する
   * saveMode === 'auto' の場合は即座に書き込む
   * saveMode === 'manual' の場合はコンテキストの状態のみ更新し、ファイルへの書き込みは行わない
   */
  const saveProfile = useCallback(
    async (profile: Profile) => {
      dispatch({ type: 'UPDATE_PROFILE', payload: profile });

      if (state.saveMode !== SaveMode.Auto) return;
      if (state.dirHandle === null) return;

      try {
        const dataHandle = await findDataDirectory(state.dirHandle);
        if (dataHandle === null) throw new Error('data/ ディレクトリが見つかりません。');
        const fh = await getFileHandle(dataHandle, 'profile.json');
        await writeJsonFile(fh, profile);
      } catch (err) {
        dispatch({
          type: 'ADD_ERROR',
          payload: `profile.json の保存に失敗しました: ${formatErrorDetail(err)}`,
        });
      }
    },
    [state.dirHandle, state.saveMode, dispatch]
  );

  /**
   * pantry.json を保存する（saveMode に従う）
   */
  const savePantry = useCallback(
    async (pantry: Pantry) => {
      dispatch({ type: 'UPDATE_PANTRY', payload: pantry });

      if (state.saveMode !== SaveMode.Auto) return;
      if (state.dirHandle === null) return;

      try {
        const dataHandle = await findDataDirectory(state.dirHandle);
        if (dataHandle === null) throw new Error('data/ ディレクトリが見つかりません。');
        const fh = await getFileHandle(dataHandle, 'pantry.json');
        await writeJsonFile(fh, pantry);
      } catch (err) {
        dispatch({
          type: 'ADD_ERROR',
          payload: `pantry.json の保存に失敗しました: ${formatErrorDetail(err)}`,
        });
      }
    },
    [state.dirHandle, state.saveMode, dispatch]
  );

  /**
   * equipment.json を保存する（saveMode に従う）
   */
  const saveEquipment = useCallback(
    async (equipment: Equipment) => {
      dispatch({ type: 'UPDATE_EQUIPMENT', payload: equipment });

      if (state.saveMode !== SaveMode.Auto) return;
      if (state.dirHandle === null) return;

      try {
        const dataHandle = await findDataDirectory(state.dirHandle);
        if (dataHandle === null) throw new Error('data/ ディレクトリが見つかりません。');
        const fh = await getFileHandle(dataHandle, 'equipment.json');
        await writeJsonFile(fh, equipment);
      } catch (err) {
        dispatch({
          type: 'ADD_ERROR',
          payload: `equipment.json の保存に失敗しました: ${formatErrorDetail(err)}`,
        });
      }
    },
    [state.dirHandle, state.saveMode, dispatch]
  );

  /**
   * meal_history.jsonl に 1 行追記する（saveMode に従う）
   */
  const appendMealRecord = useCallback(
    async (record: MealRecord) => {
      dispatch({ type: 'ADD_MEAL_RECORD', payload: record });

      if (state.saveMode !== SaveMode.Auto) return;
      if (state.dirHandle === null) return;

      try {
        const dataHandle = await findDataDirectory(state.dirHandle);
        if (dataHandle === null) throw new Error('data/ ディレクトリが見つかりません。');
        const fh = await getFileHandle(dataHandle, 'meal_history.jsonl');
        await appendJsonlRecord(fh, record);
      } catch (err) {
        dispatch({
          type: 'ADD_ERROR',
          payload: `meal_history.jsonl の追記に失敗しました: ${formatErrorDetail(err)}`,
        });
      }
    },
    [state.dirHandle, state.saveMode, dispatch]
  );

  /**
   * 手動保存モード時: バッファに溜まったすべての変更をファイルに書き出す
   * 自動保存モードでは各 save* が即座に書き込むため、この関数は手動モード専用
   */
  const flushAll = useCallback(async () => {
    if (state.dirHandle === null) return;

    const { profile, equipment, pantry } = state.data;
    const errors: string[] = [];

    try {
      const dataHandle = await findDataDirectory(state.dirHandle);
      if (dataHandle === null) throw new Error('data/ ディレクトリが見つかりません。');

      if (profile !== null) {
        try {
          const fh = await getFileHandle(dataHandle, 'profile.json');
          await writeJsonFile(fh, profile);
        } catch (err) {
          errors.push(`profile.json: ${formatErrorDetail(err)}`);
        }
      }

      if (equipment !== null) {
        try {
          const fh = await getFileHandle(dataHandle, 'equipment.json');
          await writeJsonFile(fh, equipment);
        } catch (err) {
          errors.push(`equipment.json: ${formatErrorDetail(err)}`);
        }
      }

      if (pantry !== null) {
        try {
          const fh = await getFileHandle(dataHandle, 'pantry.json');
          await writeJsonFile(fh, pantry);
        } catch (err) {
          errors.push(`pantry.json: ${formatErrorDetail(err)}`);
        }
      }

      // meal_history は appendMealRecord が IN-MEMORY に追加したレコードをファイルに書く
      // 全件上書きではなく、「前回読み込み時以降に追加されたレコード分」を追記する必要があるが、
      // Phase 1 では meal_history の手動フラッシュは対象外とする。
      // （Phase 3 で LLM の応答から実際にレコードが追加されるタイミングで再検討する）
    } catch (err) {
      errors.push(formatErrorDetail(err));
    }

    for (const msg of errors) {
      dispatch({ type: 'ADD_ERROR', payload: `保存エラー: ${msg}` });
    }
  }, [state.dirHandle, state.data, dispatch]);

  return { saveProfile, savePantry, saveEquipment, appendMealRecord, flushAll };
}
