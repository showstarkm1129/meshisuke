import { useState, useEffect } from 'react';
import { useAppState } from './useAppState';
import { SaveMode } from '../types/data.types';
import type { ProviderName } from '../lib/llm/provider';
import { clearSessions as clearChatHistoryLib } from '../lib/chatHistory';

export type Settings = {
  activeProvider: ProviderName | null;
  apiKeys: { openrouter: string | null; gemini: string | null };
  activeModel: string | null;
  saveMode: SaveMode;
};

export function useSettings() {
  const { state, dispatch } = useAppState();

  const [settings, setSettingsState] = useState<Settings>(() => {
    return {
      activeProvider: (localStorage.getItem('meshisuke_active_provider') as ProviderName | null),
      apiKeys: {
        openrouter: localStorage.getItem('meshisuke_apikey_openrouter'),
        gemini: localStorage.getItem('meshisuke_apikey_gemini'),
      },
      activeModel: localStorage.getItem('meshisuke_active_model'),
      saveMode: (localStorage.getItem('meshisuke_save_mode') as SaveMode) || SaveMode.Auto,
    };
  });

  const setProvider = (p: ProviderName) => {
    localStorage.setItem('meshisuke_active_provider', p);
    setSettingsState(s => ({ ...s, activeProvider: p }));
  };

  const setApiKey = (provider: ProviderName, key: string) => {
    const lsKey = `meshisuke_apikey_${provider}`;
    if (key) {
      localStorage.setItem(lsKey, key);
    } else {
      localStorage.removeItem(lsKey);
    }
    setSettingsState(s => ({
      ...s,
      apiKeys: { ...s.apiKeys, [provider]: key ? key : null },
    }));
  };

  const setModel = (model: string) => {
    localStorage.setItem('meshisuke_active_model', model);
    setSettingsState(s => ({ ...s, activeModel: model }));
  };

  const setSaveMode = (mode: SaveMode) => {
    localStorage.setItem('meshisuke_save_mode', mode);
    setSettingsState(s => ({ ...s, saveMode: mode }));
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
    setSaveMode,
    clearChatHistory,
    isConfigured,
  };
}
