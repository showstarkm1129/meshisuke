import { createContext, useContext, type Dispatch } from 'react';
import type {
  AppState,
  AppDataState,
  SaveMode,
  Profile,
  Pantry,
  Equipment,
  MealRecord,
} from '../types/data.types';

// --------------------------------------------------------
// Action 型定義（AppStateProvider と共有するため export）
// --------------------------------------------------------

export type Action =
  | { type: 'SET_DIR_HANDLE'; payload: FileSystemDirectoryHandle }
  | { type: 'SET_DATA'; payload: AppDataState }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_SAVE_MODE'; payload: SaveMode }
  | { type: 'UPDATE_PROFILE'; payload: Profile }
  | { type: 'UPDATE_PANTRY'; payload: Pantry }
  | { type: 'UPDATE_EQUIPMENT'; payload: Equipment }
  | { type: 'ADD_MEAL_RECORD'; payload: MealRecord };

// --------------------------------------------------------
// Context の値の型
// --------------------------------------------------------

export type AppStateContextValue = {
  state: AppState;
  dispatch: Dispatch<Action>;
};

// --------------------------------------------------------
// Context インスタンス
// --------------------------------------------------------

export const AppStateContext = createContext<AppStateContextValue | null>(null);

// --------------------------------------------------------
// フック
// --------------------------------------------------------

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (ctx === null) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return ctx;
}
