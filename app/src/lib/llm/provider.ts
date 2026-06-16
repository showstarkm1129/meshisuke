import type { LLMProvider } from './types';
import { OpenRouterProvider } from './openrouter';
import { GeminiProvider } from './gemini';

export type ProviderName = 'openrouter' | 'gemini';

export function createProvider(name: ProviderName, apiKey: string): LLMProvider {
  switch (name) {
    case 'openrouter':
      return new OpenRouterProvider(apiKey);
    case 'gemini':
      return new GeminiProvider(apiKey);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  openrouter: 'OpenRouter',
  gemini: 'Gemini Direct',
};
