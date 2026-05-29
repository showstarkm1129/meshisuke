/**
 * アシスタント本文のメタ漏れサニタイザ（防御の本丸）
 *
 * 弱いモデル（gpt-oss-20b:free 等）は OpenAI 形式の tool_calls を安定して出さず、
 * 関数呼び出しを本文テキストに JSON で書いたり、harmony 形式のチャネルトークンや
 * 思考（<think>）を本文に混ぜたりする。これらは MessageBubble がそのまま描画してしまうため、
 * モデルに依らず確実に塞ぐにはレンダリング前にコード側で除去するしかない。
 *
 * 方針: 「明らかにツール呼び出し / 内部トークン」と判定できるものだけを保守的に除去する。
 * 通常の日本語本文を巻き込まないよう、JSON 様の塊はツール名や引数ルートキーを含むものに限定する。
 */

import { ALL_TOOL_NAMES } from './tools';

/** ツール引数のルートキー（これらを含む JSON 塊はツール呼び出しとみなす） */
const ARG_ROOT_KEYS = ['items', 'pantry', 'record', 'profile'];

export interface SanitizeResult {
  clean: string;
  removed: boolean;
}

/** harmony チャネルトークン・思考ブロックを除去 */
function stripControlTokens(text: string): string {
  let out = text;
  // <think>...</think> / <thinking>...</thinking>
  out = out.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '');
  // 閉じ忘れの <think> 以降を末尾まで（思考が垂れ流された場合）
  out = out.replace(/<think(?:ing)?>[\s\S]*$/gi, '');
  // harmony の analysis / commentary チャネルは中身（思考・ツール呼び出し）ごと落とす。
  // セグメント終端は <|end|> / <|return|> / 次の <|start|> / 文字列末尾。
  out = out.replace(
    /<\|channel\|>\s*(?:analysis|commentary)\b[\s\S]*?(?:<\|end\|>|<\|return\|>|(?=<\|start\|>)|$)/gi,
    '',
  );
  // final チャネルはユーザー向け本文。マーカーだけ除去して中身は残す。
  out = out.replace(/<\|channel\|>\s*final\b[\s\S]*?<\|message\|>/gi, '');
  // 役割開始マーカー（<|start|>assistant 等）を役割名ごと除去
  out = out.replace(/<\|start\|>\s*\w+/gi, '');
  // 残った harmony トークン全般: <|message|> <|end|> <|constrain|> など
  out = out.replace(/<\|[^|>]*\|>/g, '');
  // 残骸の宛先行・チャネル名のみの行を除去
  out = out.replace(/^\s*to=functions\.\S+\s*$/gim, '');
  out = out.replace(/^\s*(?:analysis|commentary|final)\s*$/gim, '');
  return out;
}

/** 文字列 s の pos にある '{' に対応する '}' の次の位置を返す。対応が無ければ -1。 */
function matchBrace(s: string, pos: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = pos; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** JSON 塊がツール呼び出しらしいか判定 */
function looksLikeToolCall(jsonText: string): boolean {
  // ツール名が引用符付きで含まれる
  for (const name of ALL_TOOL_NAMES) {
    if (jsonText.includes(`"${name}"`)) return true;
  }
  // "arguments" / "tool_call" / "function" を含む
  if (/"(arguments|tool_call|tool_calls|function)"\s*:/.test(jsonText)) return true;
  // "name" と引数ルートキーの両方を含む（{"name":...,"items":[...]} 等）
  const hasName = /"name"\s*:/.test(jsonText);
  const hasArgRoot = ARG_ROOT_KEYS.some(k => new RegExp(`"${k}"\\s*:`).test(jsonText));
  if (hasName && hasArgRoot) return true;
  // 引数ルートキーで始まる単体オブジェクト（{"items":[...]} 等）。JSON.parse 可能なら確証
  if (hasArgRoot) {
    try {
      const obj = JSON.parse(jsonText);
      if (obj && typeof obj === 'object') {
        return ARG_ROOT_KEYS.some(k => k in obj);
      }
    } catch {
      // パース不能でもルートキーを含むなら漏れの可能性が高い
      return true;
    }
  }
  return false;
}

/** バランスした {...} のうち、ツール呼び出しらしいものを除去 */
function stripToolCallJson(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '{') {
      const end = matchBrace(text, i);
      if (end !== -1) {
        const span = text.slice(i, end);
        // JSON らしさ（":" と '"' を含む）かつツール呼び出しらしさ
        if (span.includes(':') && span.includes('"') && looksLikeToolCall(span)) {
          i = end; // 丸ごと除去（result に積まない）
          continue;
        }
      }
    }
    result += ch;
    i++;
  }
  return result;
}

/** コードフェンス内がツール呼び出しなら、フェンスごと除去 */
function stripToolCallFences(text: string): string {
  // ```lang\n ... \n``` を走査
  return text.replace(/```[^\n]*\n([\s\S]*?)```/g, (whole, inner: string) => {
    const trimmed = inner.trim();
    if (looksLikeToolCall(trimmed)) return '';
    // フェンス内全体が単一の JSON 塊で、ツール呼び出しらしい場合も除去
    if (trimmed.startsWith('{') && trimmed.includes(':') && looksLikeToolCall(trimmed)) return '';
    return whole;
  });
}

/** 連続する空行を最大1つに圧縮し、前後の空白を整える */
function tidy(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * アシスタント本文からメタ漏れ（ツール呼び出し JSON / harmony トークン / 思考）を除去する。
 */
export function sanitizeAssistantContent(raw: string): SanitizeResult {
  if (!raw) return { clean: raw, removed: false };

  const afterTokens = stripControlTokens(raw);
  const afterFences = stripToolCallFences(afterTokens);
  const afterJson = stripToolCallJson(afterFences);
  const clean = tidy(afterJson);

  const removed = clean !== tidy(raw);
  return { clean, removed };
}
