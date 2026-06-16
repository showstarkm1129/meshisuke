import { useState, useEffect } from 'react';
import { useAppState } from './useAppState';
import { SaveMode } from '../types/data.types';
import type { ProviderName } from '../lib/llm/provider';
import { clearSessions as clearChatHistoryLib } from '../lib/chatHistory';

export type Settings = {
  activeProvider: ProviderName | null;
  apiKeys: { openrouter: string | null; gemini: string | null };
  models: { openrouter: string | null; gemini: string | null };
  modelHistory: { openrouter: string[]; gemini: string[] };
  activeModel: string | null; // The model for the active provider
  saveMode: SaveMode;
};

// 旧バージョンが書き込んだ単一キー `meshisuke_active_model` を、
// 現在の provider 別キーへ 1 度だけ移行する。移行後は legacy キーを削除し、
// 以降は provider 越境してモデル名が漏れることがないようにする。
function migrateLegacyModelKeyOnce(): void {
  const legacy = localStorage.getItem('meshisuke_active_model');
  if (legacy === null) return;
  const provider = localStorage.getItem('meshisuke_active_provider') as ProviderName | null;
  if (provider === 'openrouter' || provider === 'gemini') {
    const perProviderKey = `meshisuke_active_model_${provider}`;
    if (localStorage.getItem(perProviderKey) === null) {
      localStorage.setItem(perProviderKey, legacy);
    }
  }
  localStorage.removeItem('meshisuke_active_model');
}

function loadSettingsFromStorage(): Settings {
  migrateLegacyModelKeyOnce();

  const provider = localStorage.getItem('meshisuke_active_provider') as ProviderName | null;

  const getModel = (p: ProviderName, defaultModel: string) => {
    const val = localStorage.getItem(`meshisuke_active_model_${p}`);
    return val !== null ? val : defaultModel;
  };

  const loadHistory = (p: ProviderName) => {
    const raw = localStorage.getItem(`meshisuke_model_history_${p}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }
    return [];
  };

  const models = {
    openrouter: getModel('openrouter', ''),
    gemini: getModel('gemini', ''),
  };

  const modelHistory = {
    openrouter: loadHistory('openrouter'),
    gemini: loadHistory('gemini'),
  };

  return {
    activeProvider: provider,
    apiKeys: {
      openrouter: localStorage.getItem('meshisuke_apikey_openrouter'),
      gemini: localStorage.getItem('meshisuke_apikey_gemini'),
    },
    models,
    modelHistory,
    activeModel: provider ? models[provider] : null,
    saveMode: (localStorage.getItem('meshisuke_save_mode') as SaveMode) || SaveMode.Auto,
  };
}

export function useSettings() {
  const { state, dispatch } = useAppState();

  const [settings, setSettingsState] = useState<Settings>(loadSettingsFromStorage);

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettingsState(loadSettingsFromStorage());
    };
    window.addEventListener('meshisuke_settings_changed', handleSettingsChange);
    window.addEventListener('storage', handleSettingsChange);
    return () => {
      window.removeEventListener('meshisuke_settings_changed', handleSettingsChange);
      window.removeEventListener('storage', handleSettingsChange);
    };
  }, []);

  const dispatchUpdate = () => {
    window.dispatchEvent(new Event('meshisuke_settings_changed'));
  };

  const setProvider = (p: ProviderName) => {
    localStorage.setItem('meshisuke_active_provider', p);
    dispatchUpdate();
  };

  const setApiKey = (provider: ProviderName, key: string) => {
    const lsKey = `meshisuke_apikey_${provider}`;
    if (key) {
      localStorage.setItem(lsKey, key);
    } else {
      localStorage.removeItem(lsKey);
    }
    dispatchUpdate();
  };

  const setModel = (model: string) => {
    const currentProvider = loadSettingsFromStorage().activeProvider;
    if (!currentProvider) return;
    localStorage.setItem(`meshisuke_active_model_${currentProvider}`, model);
    // 旧 `meshisuke_active_model` への二重書き込みは廃止。
    // provider 越境してモデル名が漏れる原因になるため、provider 別キーのみを正とする。
    dispatchUpdate();
  };

  const addModelToHistory = (model: string) => {
    const currentProvider = loadSettingsFromStorage().activeProvider;
    if (!currentProvider || !model.trim()) return;

    const history = loadSettingsFromStorage().modelHistory[currentProvider];
    if (!history.includes(model)) {
      const newHistory = [model, ...history].slice(0, 10);
      localStorage.setItem(
        `meshisuke_model_history_${currentProvider}`,
        JSON.stringify(newHistory)
      );
      dispatchUpdate();
    }
  };

  const setSaveMode = (mode: SaveMode) => {
    localStorage.setItem('meshisuke_save_mode', mode);
    dispatchUpdate();
    dispatch({ type: 'SET_SAVE_MODE', payload: mode });
  };

  useEffect(() => {
    if (state.saveMode !== settings.saveMode) {
      dispatch({ type: 'SET_SAVE_MODE', payload: settings.saveMode });
    }
  }, [settings.saveMode, state.saveMode, dispatch]);

  const clearChatHistory = () => {
    clearChatHistoryLib();
  };

  const isConfigured = Boolean(
    settings.activeProvider &&
    settings.activeModel &&
    settings.apiKeys[settings.activeProvider as ProviderName]
  );

  return {
    settings,
    setProvider,
    setApiKey,
    setModel,
    addModelToHistory,
    setSaveMode,
    clearChatHistory,
    isConfigured,
  };
}
