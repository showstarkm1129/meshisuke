import { describe, it, expect } from 'vitest';
import { sanitizeAssistantContent } from './sanitizeContent';

describe('sanitizeAssistantContent', () => {
  it('通常の日本語本文はそのまま通す', () => {
    const raw = 'カレーいいねぇ🍛 玉ねぎ1個へらしとくね（残り2個だよ）';
    const { clean, removed } = sanitizeAssistantContent(raw);
    expect(clean).toBe(raw);
    expect(removed).toBe(false);
  });

  it('選択肢フェンスや在庫フェンスは壊さない', () => {
    const raw = '今日はどんな気分？\n\n:::choices\nさっぱり|がっつり\n:::';
    const { clean } = sanitizeAssistantContent(raw);
    expect(clean).toContain(':::choices');
    expect(clean).toContain('さっぱり|がっつり');
  });

  it('本文に混入した tool_call JSON 塊を除去する', () => {
    const raw =
      '玉ねぎ1個へらしとくね\n{"name": "adjust_pantry_items", "arguments": {"items": [{"name": "玉ねぎ", "delta": -1}]}}';
    const { clean, removed } = sanitizeAssistantContent(raw);
    expect(clean).toBe('玉ねぎ1個へらしとくね');
    expect(removed).toBe(true);
    expect(clean).not.toContain('adjust_pantry_items');
    expect(clean).not.toContain('delta');
  });

  it('引数ルートキーだけの JSON（{"items":[...]}）も除去する', () => {
    const raw = '更新しとくね\n{"items": [{"name": "卵", "delta": -2}]}';
    const { clean } = sanitizeAssistantContent(raw);
    expect(clean).toBe('更新しとくね');
    expect(clean).not.toContain('items');
  });

  it('コードフェンスに包まれた tool_call も除去する', () => {
    const raw =
      'メモしたよ\n\n```json\n{"name":"adjust_seasonings","arguments":{"items":[{"name":"醤油","refill_full":true}]}}\n```';
    const { clean } = sanitizeAssistantContent(raw);
    expect(clean).toBe('メモしたよ');
    expect(clean).not.toContain('adjust_seasonings');
    expect(clean).not.toContain('```');
  });

  it('harmony の final チャネル本文は残し、analysis チャネルは落とす', () => {
    const raw =
      '<|channel|>analysis<|message|>玉ねぎを使った。減算しよう。<|end|><|start|>assistant<|channel|>final<|message|>了解だよ<|end|>';
    const { clean } = sanitizeAssistantContent(raw);
    expect(clean).toBe('了解だよ');
    expect(clean).not.toContain('<|');
    expect(clean).not.toContain('減算');
  });

  it('harmony の commentary ツール呼び出しチャネルを中身ごと落とす', () => {
    const raw =
      '<|channel|>commentary to=functions.adjust_pantry_items <|constrain|>json<|message|>{"items":[{"name":"玉ねぎ","delta":-1}]}<|end|>';
    const { clean } = sanitizeAssistantContent(raw);
    expect(clean).not.toContain('adjust_pantry_items');
    expect(clean).not.toContain('delta');
    expect(clean).not.toContain('<|');
  });

  it('<think> ブロックを除去する', () => {
    const raw = '<think>ユーザーは玉ねぎを使った。減算しよう。</think>玉ねぎ減らしとくね';
    const { clean } = sanitizeAssistantContent(raw);
    expect(clean).toBe('玉ねぎ減らしとくね');
    expect(clean).not.toContain('think');
  });

  it('閉じ忘れの <think> 以降を末尾まで除去する', () => {
    const raw = '本文だよ\n<think>ここから思考が垂れ流し...';
    const { clean } = sanitizeAssistantContent(raw);
    expect(clean).toBe('本文だよ');
  });

  it('ネストした波括弧を含む tool_call も正しく1塊で除去する', () => {
    const raw =
      'やっとくね {"name":"update_pantry","arguments":{"pantry":{"updated_at":"2026-05-29","ingredients":[]}}} 完了';
    const { clean } = sanitizeAssistantContent(raw);
    expect(clean).not.toContain('update_pantry');
    expect(clean).toContain('やっとくね');
    expect(clean).toContain('完了');
  });

  it('ツール呼び出しと無関係な普通の波括弧は残す', () => {
    const raw = '甘辛だれ（みりん：醤油＝1：1）でいくよ';
    const { clean, removed } = sanitizeAssistantContent(raw);
    expect(clean).toBe(raw);
    expect(removed).toBe(false);
  });

  it('空文字はそのまま', () => {
    const { clean, removed } = sanitizeAssistantContent('');
    expect(clean).toBe('');
    expect(removed).toBe(false);
  });
});
