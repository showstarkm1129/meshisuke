import { useReducer, type ReactNode } from 'react';
import { SaveMode as SaveModeConst, type AppState, type SaveMode } from '../types/data.types';
import { AppStateContext, type Action } from '../hooks/useAppState';

// --------------------------------------------------------
// 初期状態
// --------------------------------------------------------

function parseSaveMode(raw: string | null): SaveMode {
  if (raw === SaveModeConst.Auto || raw === SaveModeConst.Manual) return raw;
  return SaveModeConst.Auto;
}

const initialState: AppState = {
  data: {
    profile: null,
    equipment: null,
    pantry: null,
    mealHistory: [],
  },
  saveMode: parseSaveMode(localStorage.getItem('meshisuke_save_mode')),
  isLoading: false,
  errors: [],
  dirHandle: null,
};

// --------------------------------------------------------
// Reducer
// --------------------------------------------------------

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DIR_HANDLE':
      return { ...state, dirHandle: action.payload };

    case 'SET_DATA':
      return { ...state, data: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'ADD_ERROR':
      return { ...state, errors: [...state.errors, action.payload] };

    case 'CLEAR_ERRORS':
      return { ...state, errors: [] };

    case 'SET_SAVE_MODE': {
      localStorage.setItem('meshisuke_save_mode', action.payload);
      return { ...state, saveMode: action.payload };
    }

    case 'UPDATE_PROFILE':
      return {
        ...state,
        data: { ...state.data, profile: action.payload },
      };

    case 'UPDATE_PANTRY':
      return {
        ...state,
        data: { ...state.data, pantry: action.payload },
      };

    case 'UPDATE_EQUIPMENT':
      return {
        ...state,
        data: { ...state.data, equipment: action.payload },
      };

    case 'ADD_MEAL_RECORD':
      return {
        ...state,
        data: {
          ...state.data,
          mealHistory: [...state.data.mealHistory, action.payload],
        },
      };

    default:
      return state;
  }
}

// --------------------------------------------------------
// Provider コンポーネント
// --------------------------------------------------------

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>
  );
}
