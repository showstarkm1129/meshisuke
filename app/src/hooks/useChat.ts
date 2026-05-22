/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useMemo } from 'react';
import { useAppState } from './useAppState';
import { useSettings } from './useSettings';
import { useFileSaver } from './useFileSaver';
import { createProvider } from '../lib/llm/provider';
import type { ProviderName } from '../lib/llm/provider';
import { buildSystemPrompt } from '../lib/systemPrompt';
import { TOOLS, TOOL_NOTICE_LABELS } from '../lib/tools';
import { loadSessions, saveSessions, generateId, type ChatSession, type ChatTurn } from '../lib/chatHistory';
import type { ChatMessage } from '../lib/llm/types';

export function useChat() {
  const { state, dispatch } = useAppState();
  const { settings, isConfigured } = useSettings();
  const { savePantry, saveProfile, appendMealRecord } = useFileSaver();

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() =>
    sessions.length > 0 ? sessions[0].id : null
  );
  const [isWaiting, setIsWaiting] = useState(false);
  const [currentToolNotices, setCurrentToolNotices] = useState<string[]>([]);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const turns = useMemo(() => currentSession ? currentSession.turns : [], [currentSession]);

  const updateCurrentSession = useCallback((newTurns: ChatTurn[], titleUpdate?: string) => {
    setSessions(prev => {
      let updated = [...prev];
      const targetIdx = updated.findIndex(s => s.id === currentSessionId);
      
      if (targetIdx === -1) {
        const newSession: ChatSession = {
          id: currentSessionId || generateId(),
          title: titleUpdate || '新しいチャット',
          updatedAt: Date.now(),
          turns: newTurns,
        };
        updated = [newSession, ...updated];
        if (!currentSessionId) setCurrentSessionId(newSession.id);
      } else {
        const s = updated[targetIdx];
        updated[targetIdx] = {
          ...s,
          title: titleUpdate || s.title,
          updatedAt: Date.now(),
          turns: newTurns,
        };
        const target = updated.splice(targetIdx, 1)[0];
        updated = [target, ...updated];
      }
      saveSessions(updated);
      return updated;
    });
  }, [currentSessionId]);

  const startNewSession = useCallback(() => {
    setCurrentSessionId(generateId());
  }, []);

  const switchSession = useCallback((id: string) => {
    setCurrentSessionId(id);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSessions(next);
      if (currentSessionId === id) {
        setCurrentSessionId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }, [currentSessionId]);

  const sendUserMessage = useCallback(async (text: string) => {
    if (!isConfigured || !settings.activeProvider || !settings.activeModel) return;
    const apiKey = settings.apiKeys[settings.activeProvider as ProviderName];
    if (!apiKey) return;

    const userTurn: ChatTurn = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    const isFirstMessage = turns.length === 0;
    const titleUpdate = isFirstMessage ? text.substring(0, 15) : undefined;
    
    const newTurns = [...turns, userTurn];
    updateCurrentSession(newTurns, titleUpdate);
    setIsWaiting(true);

    const notices: string[] = [];
    let finalContent = '';

    try {
      const provider = createProvider(settings.activeProvider as ProviderName, apiKey);
      const systemPrompt = buildSystemPrompt(state.data);

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...newTurns.slice(-10).map(t => ({
          role: t.role,
          content: t.text,
        } as ChatMessage))
      ];

      setCurrentToolNotices([]);

      const res = await provider.sendMessage({
        model: settings.activeModel,
        messages,
        tools: TOOLS,
      });

      finalContent = res.content ? res.content.trim() : '';

      if (res.toolCalls && res.toolCalls.length > 0) {
        for (const tc of res.toolCalls) {
          try {
            let ran = false;
            if (tc.name === 'update_pantry') {
              if (typeof tc.arguments.pantry === 'object' && tc.arguments.pantry !== null) {
                await savePantry(tc.arguments.pantry as any);
                ran = true;
              }
            } else if (tc.name === 'add_meal_record') {
              if (typeof tc.arguments.record === 'object' && tc.arguments.record !== null) {
                await appendMealRecord(tc.arguments.record as any);
                ran = true;
              }
            } else if (tc.name === 'update_profile') {
              if (typeof tc.arguments.profile === 'object' && tc.arguments.profile !== null) {
                await saveProfile(tc.arguments.profile as any);
                ran = true;
              }
            }

            if (ran) {
              const label = TOOL_NOTICE_LABELS[tc.name] ?? tc.name;
              if (!notices.includes(label)) {
                notices.push(label);
                setCurrentToolNotices([...notices]);
              }
            }
          } catch (e) {
            console.error('Tool Error:', e);
          }
        }
      }
    } catch (e) {
      dispatch({ type: 'ADD_ERROR', payload: `Chat Error: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      if (finalContent || notices.length > 0) {
        const assistantTurn: ChatTurn = {
          id: Date.now().toString(),
          role: 'assistant',
          text: finalContent || '*(裏側でデータを整理しました)*',
          toolNotices: notices.length > 0 ? notices : undefined,
          timestamp: Date.now(),
        };
        updateCurrentSession([...newTurns, assistantTurn]);
      }
      setIsWaiting(false);
      setCurrentToolNotices([]);
    }
  }, [turns, isConfigured, settings, state.data, savePantry, appendMealRecord, saveProfile, dispatch, updateCurrentSession]);

  const clearHistory = useCallback(() => {
    updateCurrentSession([]);
  }, [updateCurrentSession]);

  return {
    sessions,
    currentSessionId,
    turns,
    isWaiting,
    currentToolNotices,
    sendUserMessage,
    startNewSession,
    switchSession,
    deleteSession,
    clearHistory,
  };
}
