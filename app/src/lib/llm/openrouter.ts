/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LLMProvider, SendMessageRequest, SendMessageResponse, ChatMessage, ToolCall } from './types';

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
      let detail = '';
      try {
        const errBody = await res.json();
        const msg: string | undefined = errBody?.error?.message ?? errBody?.message;
        if (msg) detail += ` - ${msg}`;
      } catch {
        // ignore body parse failure
      }
      throw new Error(`OpenRouter API error: ${res.status}${detail}`);
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      return { content: null, toolCalls: [] };
    }

    const toolCalls: ToolCall[] = [];
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      for (const tc of message.tool_calls) {
        if (tc.type === 'function') {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          });
        }
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
