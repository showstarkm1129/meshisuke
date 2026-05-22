import type { LLMProvider } from './types';
import { OpenRouterProvider } from './openrouter';
import { GeminiProvider } from './gemini';

export type ProviderName = 'openrouter' | 'gemini';

export function createProvider(name: ProviderName, apiKey: string): LLMProvider {
  switch (name) {
    case 'openrouter': return new OpenRouterProvider(apiKey);
    case 'gemini':     return new GeminiProvider(apiKey);
    default: throw new Error(`Unknown provider: ${name}`);
  }
}

export const PROVIDER_MODELS: Record<ProviderName, string[]> = {
  openrouter: [
    'deepseek/deepseek-chat',
    'google/gemini-2.5-flash-lite',
    'google/gemini-2.5-flash',
    'anthropic/claude-haiku-4-5',
  ],
  gemini: [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
  ],
};

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  openrouter: 'OpenRouter',
  gemini: 'Gemini Direct',
};
