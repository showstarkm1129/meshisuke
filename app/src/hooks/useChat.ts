/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useMemo } from 'react';
import { useAppState } from './useAppState';
import { useSettings } from './useSettings';
import { useFileSaver } from './useFileSaver';
import { createProvider, PROVIDER_LABELS } from '../lib/llm/provider';
import type { ProviderName } from '../lib/llm/provider';
import { formatNetworkError } from '../lib/llm/errors';
import { buildSystemPrompt } from '../lib/systemPrompt';
import { isBacksideTrigger } from '../lib/promptComposer';
import type { ConversationState } from '../lib/promptComposer';
import { selectTools, TOOL_NOTICE_LABELS } from '../lib/tools';
import {
  mergePantryItems,
  mergeSeasonings,
  type IngredientItemDelta,
  type SeasoningItemDelta,
} from '../lib/pantryMerge';
import { sanitizeAssistantContent } from '../lib/sanitizeContent';
import {
  loadSessions,
  saveSessions,
  generateId,
  type ChatSession,
  type ChatTurn,
} from '../lib/chatHistory';
import type { ChatMessage } from '../lib/llm/types';

/** 直近5ターン以内のユーザー発話に裏側トリガーがあったかを判定 */
function detectRecentBackside(turns: ChatTurn[]): boolean {
  const recent = turns.slice(-5);
  return recent.some((t) => t.role === 'user' && isBacksideTrigger(t.text));
}

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

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const turns = useMemo(() => (currentSession ? currentSession.turns : []), [currentSession]);

  const updateCurrentSession = useCallback(
    (newTurns: ChatTurn[], titleUpdate?: string) => {
      setSessions((prev) => {
        let updated = [...prev];
        const targetIdx = updated.findIndex((s) => s.id === currentSessionId);

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
    },
    [currentSessionId]
  );

  const startNewSession = useCallback(() => {
    setCurrentSessionId(generateId());
  }, []);

  const switchSession = useCallback((id: string) => {
    setCurrentSessionId(id);
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        saveSessions(next);
        if (currentSessionId === id) {
          setCurrentSessionId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [currentSessionId]
  );

  const sendUserMessage = useCallback(
    async (text: string) => {
      // 連投ガード: 直前のリクエストが解決するまで新規送信を拒否する。
      if (isWaiting) return;

      // 空白のみメッセージはプロバイダーで 400 になるため API を叩かない。
      const trimmed = text.trim();
      if (!trimmed) return;

      // 設定不備は無音で return せず、ユーザーに理由を見せる。
      if (!settings.activeProvider || !settings.activeModel) {
        dispatch({
          type: 'ADD_ERROR',
          payload:
            'LLM プロバイダーまたはモデルが未選択です。設定画面でプロバイダーとモデルを選んでください。',
        });
        return;
      }
      const providerName = settings.activeProvider as ProviderName;
      const providerLabel = PROVIDER_LABELS[providerName];
      const apiKey = settings.apiKeys[providerName];
      if (!apiKey) {
        dispatch({
          type: 'ADD_ERROR',
          payload: `${providerLabel} の API キーが未登録です。設定画面で API キーを入力してください。`,
        });
        return;
      }
      if (!isConfigured) return;

      const userTurn: ChatTurn = {
        id: generateId(), // Date.now() 文字列だと同一ミリ秒内で衝突する
        role: 'user',
        text: trimmed,
        timestamp: Date.now(),
      };

      const isFirstMessage = turns.length === 0;
      const titleUpdate = isFirstMessage ? trimmed.substring(0, 15) : undefined;

      const newTurns = [...turns, userTurn];
      updateCurrentSession(newTurns, titleUpdate);
      setIsWaiting(true);

      const notices: string[] = [];
      let finalContent = '';

      try {
        const provider = createProvider(settings.activeProvider as ProviderName, apiKey);

        const conversation: ConversationState = {
          turnsCount: newTurns.length,
          onboardingCompleted: state.data.profile?.onboarding_completed ?? false,
          lastUserText: trimmed,
          recentBacksideActivity: detectRecentBackside(turns),
        };
        const { prompt: systemPrompt, debug } = buildSystemPrompt(state.data, conversation);

        if (import.meta.env.DEV && debug) {
          const pct = Math.round(debug.savingsRatio * 100);
          console.debug(
            `[PromptComposer] sections=[${debug.includedSections.join(',')}] ` +
              `lines ${debug.composedLines}/${debug.baselineLines} (${pct}% saved)`
          );
        }

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          ...newTurns.slice(-10).map(
            (t) =>
              ({
                role: t.role,
                content: t.text,
              }) as ChatMessage
          ),
        ];

        setCurrentToolNotices([]);

        const isBackside =
          conversation.recentBacksideActivity || isBacksideTrigger(conversation.lastUserText);

        const res = await provider.sendMessage({
          model: settings.activeModel,
          messages,
          tools: selectTools(isBackside),
        });

        // メタ漏れ防御の本丸: 本文に混入した tool_call JSON / harmony トークン / 思考を除去。
        // 弱いモデルが tool_calls を出さず本文に書く挙動は命令で抑止しきれないため、
        // レンダリング前にコード側で必ず落とす。
        {
          const sanitized = sanitizeAssistantContent(res.content ?? '');
          if (import.meta.env.DEV && sanitized.removed) {
            console.warn(
              '[useChat] 本文からメタ漏れを除去しました（モデルが tool_call を本文に書いた可能性）'
            );
          }
          finalContent = sanitized.clean.trim();
        }

        // 言質一致チェック: 本文で「覚えた/更新した/メモした/減らしとく」等と言ったのに
        // 保存系ツールを1件も呼ばなかった場合は、開発時のみ警告（誤検知防止のため UI には出さない）
        if (import.meta.env.DEV) {
          const claimsUpdate =
            /覚え(た|とく|たよ)|更新(した|しとく)|メモ(した|しとく|したよ)|へらしとく|減らしとく|追加(した|しとく)|加えとく|足しとく|フルで覚え/.test(
              finalContent
            );
          const calledSaveTool = (res.toolCalls ?? []).some(
            (tc) =>
              tc.name === 'adjust_pantry_items' ||
              tc.name === 'adjust_seasonings' ||
              tc.name === 'add_meal_record' ||
              tc.name === 'update_profile' ||
              tc.name === 'update_pantry'
          );
          if (claimsUpdate && !calledSaveTool) {
            console.warn(
              '[useChat] モデルが本文で更新を約束しているがツール呼び出しが無い。' +
                'プロンプト遵守失敗の可能性:',
              finalContent.slice(0, 120)
            );
          }
        }

        if (res.toolCalls && res.toolCalls.length > 0) {
          for (const tc of res.toolCalls) {
            try {
              let ran = false;
              if (tc.name === 'adjust_pantry_items') {
                const items = tc.arguments.items;
                if (Array.isArray(items) && state.data.pantry !== null) {
                  const { next, warnings } = mergePantryItems(
                    state.data.pantry.ingredients,
                    items as IngredientItemDelta[]
                  );
                  if (import.meta.env.DEV && warnings.length > 0) {
                    console.warn('[adjust_pantry_items] warnings:', warnings);
                  }
                  await savePantry({
                    ...state.data.pantry,
                    ingredients: next,
                    updated_at: new Date().toISOString().slice(0, 10),
                  });
                  ran = true;
                }
              } else if (tc.name === 'adjust_seasonings') {
                const items = tc.arguments.items;
                if (Array.isArray(items) && state.data.pantry !== null) {
                  const { next, warnings } = mergeSeasonings(
                    state.data.pantry.seasonings,
                    items as SeasoningItemDelta[]
                  );
                  if (import.meta.env.DEV && warnings.length > 0) {
                    console.warn('[adjust_seasonings] warnings:', warnings);
                  }
                  await savePantry({
                    ...state.data.pantry,
                    seasonings: next,
                    updated_at: new Date().toISOString().slice(0, 10),
                  });
                  ran = true;
                }
              } else if (tc.name === 'update_pantry') {
                if (typeof tc.arguments.pantry === 'object' && tc.arguments.pantry !== null) {
                  await savePantry(tc.arguments.pantry as any);
                  ran = true;
                }
              } else if (tc.name === 'add_meal_record') {
                if (typeof tc.arguments.record === 'object' && tc.arguments.record !== null) {
                  // satisfaction はツール定義から required を外したため、
                  // モデルが省略してくることがある。型 (number|null) を満たすよう null を補う。
                  const recordArg = tc.arguments.record as Record<string, unknown>;
                  if (!('satisfaction' in recordArg) || recordArg.satisfaction === undefined) {
                    recordArg.satisfaction = null;
                  }
                  await appendMealRecord(recordArg as any);
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
        // fetch 自体が throw した場合（DNS 失敗・オフライン・CORS など）は
        // TypeError として届くので、それを検知してネットワーク文言に置き換える。
        // provider 側の throw（formatProviderError 由来）は人間向け文言が既に入っているので
        // そのまま使えば "Chat Error:" のような冗長 prefix なしで済む。
        let message: string;
        if (e instanceof TypeError) {
          message = formatNetworkError(providerLabel);
        } else if (e instanceof Error) {
          message = e.message;
        } else {
          message = String(e);
        }
        console.error('sendUserMessage failed', e);
        dispatch({ type: 'ADD_ERROR', payload: message });
      } finally {
        if (finalContent || notices.length > 0) {
          const assistantTurn: ChatTurn = {
            id: generateId(),
            role: 'assistant',
            text: finalContent || '*(裏側でデータを整理しました)*',
            toolNotices: notices.length > 0 ? notices : undefined,
            timestamp: Date.now(),
            model: settings.activeModel,
            provider: settings.activeProvider,
          };
          updateCurrentSession([...newTurns, assistantTurn]);
        }
        setIsWaiting(false);
        setCurrentToolNotices([]);
      }
    },
    [
      isWaiting,
      turns,
      isConfigured,
      settings,
      state.data,
      savePantry,
      appendMealRecord,
      saveProfile,
      dispatch,
      updateCurrentSession,
    ]
  );

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
