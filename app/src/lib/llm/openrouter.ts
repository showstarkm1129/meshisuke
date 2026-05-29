/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LLMProvider, SendMessageRequest, SendMessageResponse, ChatMessage, ToolCall } from './types';
import { formatProviderError, type ProviderErrorBody } from './errors';
import { PROVIDER_LABELS } from './provider';

export class OpenRouterProvider implements LLMProvider {
  private apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(req: SendMessageRequest): Promise<SendMessageResponse> {
    const payload = {
      model: req.model,
      messages: req.messages.map(msg => this.formatMessage(msg)),
      tools: req.tools.length > 0 ? req.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        }
      })) : undefined,
    };

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'meshisuke',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body: ProviderErrorBody = {};
      let rawBody: unknown = null;
      try {
        rawBody = await res.json();
        const errObj = (rawBody as any)?.error;
        body.message = errObj?.message ?? (rawBody as any)?.message;
      } catch {
        // body のパース失敗時は status だけで案内する
      }
      // 開発者向けの生レスポンスはコンソールに残し、UI には要約のみ throw する。
      console.error('OpenRouter HTTP error', res.status, rawBody);
      throw new Error(formatProviderError(PROVIDER_LABELS.openrouter, res.status, body));
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      return { content: null, toolCalls: [] };
    }

    const toolCalls: ToolCall[] = [];
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      for (const tc of message.tool_calls) {
        if (tc.type !== 'function') continue;
        // モデルが不完全な JSON を返した場合に SyntaxError が
        // ErrorBanner に "Chat Error: ..." として漏れるのを防ぐ。
        // 当該 tool_call だけスキップして他の出力は活かす。
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        } catch (e) {
          console.warn('Skipping tool_call with malformed arguments:', tc.function?.name, e);
          continue;
        }
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: parsed,
        });
      }
    }

    return {
      content: message.content || null,
      toolCalls,
    };
  }

  private formatMessage(msg: ChatMessage): any {
    if (msg.role === 'system') return { role: 'system', content: msg.content };
    if (msg.role === 'user') return { role: 'user', content: msg.content };
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: msg.toolCallId,
        name: msg.name,
        content: msg.content,
      };
    }
    if (msg.role === 'assistant') {
      const formatted: any = { role: 'assistant', content: msg.content };
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        formatted.tool_calls = msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }));
      }
      return formatted;
    }
    throw new Error(`Unknown role: ${(msg as any).role}`);
  }
}
