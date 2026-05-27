import { useState, useEffect } from 'react';
import { useAppState } from './useAppState';
import { SaveMode } from '../types/data.types';
import type { ProviderName } from '../lib/llm/provider';
import { clearSessions as clearChatHistoryLib } from '../lib/chatHistory';

export type Settings = {
  activeProvider: ProviderName | null;
  apiKeys: { openrouter: string | null; gemini: string | null };
  models: { openrouter: string | null; gemini: string | null };
  activeModel: string | null; // The model for the active provider
  saveMode: SaveMode;
};

function loadSettingsFromStorage(): Settings {
  const provider = (localStorage.getItem('meshisuke_active_provider') as ProviderName | null);
  const legacyModel = localStorage.getItem('meshisuke_active_model');
  
  const models = {
    openrouter: localStorage.getItem('meshisuke_active_model_openrouter') || (provider === 'openrouter' ? legacyModel : null) || 'deepseek/deepseek-chat',
    gemini: localStorage.getItem('meshisuke_active_model_gemini') || (provider === 'gemini' ? legacyModel : null) || 'gemini-2.5-flash',
  };

  return {
    activeProvider: provider,
    apiKeys: {
      openrouter: localStorage.getItem('meshisuke_apikey_openrouter'),
      gemini: localStorage.getItem('meshisuke_apikey_gemini'),
    },
    models,
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
    // Legacy support
    localStorage.setItem('meshisuke_active_model', model);
    dispatchUpdate();
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
    setSaveMode,
    clearChatHistory,
    isConfigured,
  };
}
