import { useRef, useEffect } from 'react';
import type { ChatTurn } from '../lib/chatHistory';
import { MessageBubble } from './MessageBubble';
import { ToolCallNotice } from './ToolCallNotice';

export function MessageList({ 
  turns, 
  isWaiting, 
  currentToolNotices = [],
  onSend
}: { 
  turns: ChatTurn[], 
  isWaiting: boolean, 
  currentToolNotices?: string[],
  onSend: (text: string) => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isWaiting, currentToolNotices]);

  return (
    <div className="message-list">
      {turns.length === 0 && (
        <div className="empty-chat">
          <p>今日のご飯どうしよ、と話しかけてみて</p>
        </div>
      )}
      {turns.map((turn, i) => (
        <MessageBubble 
          key={turn.id} 
          turn={turn} 
          isLatest={i === turns.length - 1}
          onSend={onSend}
        />
      ))}
      {isWaiting && (
        <div className="message-bubble-wrapper assistant waiting">
          <img src="/meshisuke2.png" alt="めし助" className="avatar" />
          <div className="message-content-wrapper">
            <div className="message-label">🍳めし助</div>
            <div className="message-bubble">
              {currentToolNotices.length > 0 && (
                <div className="tool-notices" style={{ marginBottom: '8px' }}>
                  {currentToolNotices.map((notice, i) => (
                    <ToolCallNotice key={i} label={notice} />
                  ))}
                </div>
              )}
              <div className="loading-dots">
                <span>●</span><span>●</span><span>●</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
