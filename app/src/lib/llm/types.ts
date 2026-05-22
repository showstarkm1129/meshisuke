export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export type ToolCall = {
  id: string;              // OpenRouter は tool_call_id, Gemini は内部生成
  name: string;
  arguments: Record<string, unknown>;
};

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; name: string; content: string };

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;  // JSON Schema
};

export type SendMessageRequest = {
  model: string;
  messages: ChatMessage[];
  tools: ToolDefinition[];
};

export type SendMessageResponse = {
  content: string | null;
  toolCalls: ToolCall[];
};

export interface LLMProvider {
  sendMessage(req: SendMessageRequest): Promise<SendMessageResponse>;
}
