import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { ChatTurn } from '../lib/chatHistory';
import { ToolCallNotice } from './ToolCallNotice';
import { parseFenceBlocks } from '../lib/fenceParser';
import { IngredientChips } from './IngredientChips';
import { QuickReplyChips } from './QuickReplyChips';

export function MessageBubble({ 
  turn, 
  isLatest, 
  onSend 
}: { 
  turn: ChatTurn;
  isLatest?: boolean;
  onSend?: (text: string) => void;
}) {
  const isUser = turn.role === 'user';
  
  const blocks = isUser ? [{ kind: 'markdown' as const, payload: turn.text }] : parseFenceBlocks(turn.text);
  
  const choicesBlock = blocks.find(b => b.kind === 'choices');
  const choices = choicesBlock && choicesBlock.kind === 'choices' ? choicesBlock.payload : null;

  return (
    <div className={`message-bubble-wrapper ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <img src="/meshisuke2.png" alt="めし助" className="avatar" />
      )}
      <div className="message-content-wrapper">
        <div className="message-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isUser ? 'あなた' : '🍳めし助'}
          {!isUser && turn.model && (
            <span style={{ fontSize: '0.7em', color: '#aaa', fontWeight: 'normal' }}>
              ({turn.provider === 'gemini' ? 'Gemini API' : 'OpenRouter'}: {turn.model})
            </span>
          )}
        </div>
        <div className="message-bubble">
          {blocks.map((block, i) => {
            if (block.kind === 'markdown') {
              return (
                <ReactMarkdown
                  key={i}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[
                    rehypeRaw,
                    [
                      rehypeSanitize,
                      {
                        ...defaultSchema,
                        tagNames: [...(defaultSchema.tagNames || []), 'details', 'summary'],
                      },
                    ],
                  ]}
                >
                  {block.payload}
                </ReactMarkdown>
              );
            }
            if (block.kind === 'choices') {
              // Now we render it right under the bubble, so we don't render a placeholder inside
              return null;
            }
            if (block.kind === 'pantry') {
              return <IngredientChips key={i} payload={block.payload} />;
            }
            return null;
          })}
        </div>
        {turn.toolNotices && turn.toolNotices.length > 0 && (
          <details className="tool-notices-details" style={{ marginTop: '8px', fontSize: '0.85em', color: '#888' }}>
            <summary style={{ cursor: 'pointer', opacity: 0.8 }}>裏側の作業完了</summary>
            <div className="tool-notices" style={{ marginTop: '4px', paddingLeft: '8px', borderLeft: '2px solid #eee' }}>
              {turn.toolNotices.map((notice, i) => (
                <ToolCallNotice key={i} label={notice} />
              ))}
            </div>
          </details>
        )}
        {choices && !isUser && (
          <div style={{ marginTop: '8px' }}>
            <QuickReplyChips 
              choices={choices} 
              onSelect={onSend || (() => {})} 
              disabled={!isLatest} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
