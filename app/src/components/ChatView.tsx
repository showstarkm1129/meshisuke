import { useSettings } from '../hooks/useSettings';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { ChatTurn } from '../lib/chatHistory';

export function ChatView({ 
  turns, 
  isWaiting, 
  currentToolNotices,
  onSend, 
  onCommand 
}: { 
  turns: ChatTurn[];
  isWaiting: boolean;
  currentToolNotices?: string[];
  onSend: (text: string) => void;
  onCommand?: (cmd: string) => void;
}) {
  const { isConfigured } = useSettings();

  return (
    <div className="chat-view">
      <MessageList 
        turns={turns} 
        isWaiting={isWaiting} 
        currentToolNotices={currentToolNotices} 
        onSend={onSend}
      />
      <MessageInput 
        onSend={onSend} 
        onCommand={onCommand}
        disabled={isWaiting || !isConfigured} 
      />
    </div>
  );
}
