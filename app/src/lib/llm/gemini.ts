/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type {
  LLMProvider,
  SendMessageRequest,
  SendMessageResponse,
  ChatMessage,
  ToolCall,
} from './types';
import { formatProviderError, type ProviderErrorBody } from './errors';
import { PROVIDER_LABELS } from './provider';

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(req: SendMessageRequest): Promise<SendMessageResponse> {
    const systemMessage = req.messages.find((m) => m.role === 'system');
    const systemInstruction = systemMessage
      ? { parts: [{ text: systemMessage.content }] }
      : undefined;

    const contents = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => this.formatMessage(m));

    const convertSchema = (schema: any): any => {
      if (!schema) return schema;
      const result = { ...schema };
      if (typeof result.type === 'string') {
        result.type = result.type.toUpperCase();
      } else if (Array.isArray(result.type)) {
        const t = result.type.find((x: string) => x !== 'null');
        result.type = t ? t.toUpperCase() : 'STRING';
        result.nullable = true;
      }
      if (result.properties) {
        for (const key of Object.keys(result.properties)) {
          result.properties[key] = convertSchema(result.properties[key]);
        }
      }
      if (result.items) {
        result.items = convertSchema(result.items);
      }
      return result;
    };

    const tools =
      req.tools.length > 0
        ? [
            {
              functionDeclarations: req.tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: convertSchema(t.parameters),
              })),
            },
          ]
        : undefined;

    const payload = {
      contents,
      systemInstruction,
      tools,
    };

    // モデル名は自由入力欄から来るため、空白除去と URL エスケープを必須化する。
    // 前後の空白・全角混入・スラッシュ等で 404/400 になるのを防ぐ。
    const safeModel = encodeURIComponent(req.model.trim());
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const body: ProviderErrorBody = {};
      let rawBody: unknown = null;
      try {
        rawBody = await res.json();
        const errObj = (rawBody as any)?.error;
        body.message = errObj?.message;
        const details: unknown = errObj?.details;
        if (Array.isArray(details)) {
          const retryInfo = details.find((d: any) => d && typeof d.retryDelay === 'string');
          body.retryDelay = retryInfo?.retryDelay;
        }
      } catch {
        // body のパース失敗時は status だけで案内する
      }
      console.error('Gemini HTTP error', res.status, rawBody);
      throw new Error(formatProviderError(PROVIDER_LABELS.gemini, res.status, body));
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];

    if (!candidate || !candidate.content) {
      return { content: null, toolCalls: [] };
    }

    let content: string | null = null;
    const toolCalls: ToolCall[] = [];

    let toolCallIndex = 0;
    for (const part of candidate.content.parts) {
      if (part.text) {
        content = (content || '') + part.text;
      } else if (part.functionCall) {
        toolCalls.push({
          id: `${part.functionCall.name}_${toolCallIndex++}_${Date.now()}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
        });
      }
    }

    return { content, toolCalls };
  }

  private formatMessage(msg: ChatMessage): any {
    if (msg.role === 'user') {
      return { role: 'user', parts: [{ text: msg.content }] };
    }
    if (msg.role === 'assistant') {
      const parts: any[] = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.toolCalls) {
        msg.toolCalls.forEach((tc) => {
          parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
        });
      }
      if (parts.length === 0) parts.push({ text: ' ' });
      return { role: 'model', parts };
    }
    if (msg.role === 'tool') {
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(msg.content);
      } catch (e) {
        parsedResponse = { error: msg.content };
      }
      return {
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: msg.name,
              response: parsedResponse,
            },
          },
        ],
      };
    }
    throw new Error(`Unknown/Unsupported role for Gemini: ${(msg as any).role}`);
  }
}
