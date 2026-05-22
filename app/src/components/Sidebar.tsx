import type { ChatSession } from '../lib/chatHistory';

export function Sidebar({
  sessions,
  currentSessionId,
  onNewSession,
  onSwitchSession,
  onDeleteSession,
  isOpen,
  onToggle
}: {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewSession: () => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`app-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onNewSession}>
          ＋ 新しいチャット
        </button>
        <button className="toggle-btn" onClick={onToggle}>
          {isOpen ? '◀' : '▶'}
        </button>
      </div>
      {isOpen && (
        <div className="session-list">
          {sessions.map(s => (
            <div 
              key={s.id} 
              className={`session-item ${s.id === currentSessionId ? 'active' : ''}`}
              onClick={() => onSwitchSession(s.id)}
            >
              <span className="session-title">{s.title || '新しいチャット'}</span>
              <button 
                className="delete-session-btn"
                title="削除"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('このチャットを削除しますか？')) {
                    onDeleteSession(s.id);
                  }
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
