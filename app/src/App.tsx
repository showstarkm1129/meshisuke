import { useState } from 'react';
import { useAppState } from './hooks/useAppState';
import { useSettings } from './hooks/useSettings';
import { useChat } from './hooks/useChat';
import { FolderPicker } from './components/FolderPicker';
import { ErrorBanner } from './components/ErrorBanner';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { BacksideView } from './components/BacksideView';
import { SettingsModal } from './components/SettingsModal';
import { PantryView } from './components/views/PantryView';
import { HistoryView } from './components/views/HistoryView';
import { ProfileView } from './components/views/ProfileView';
import './App.css';

export type ViewMode = 'chat' | 'backside' | 'pantry' | 'history' | 'profile';

function App() {
  const { state } = useAppState();
  const { isConfigured } = useSettings();
  const chatState = useChat();
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const dataLoaded = state.dirHandle && state.data.profile !== null;
  const settingsForceOpen = Boolean(dataLoaded && !isConfigured);

  const handleCommand = (cmd: string) => {
    switch (cmd) {
      case '/pantry': setViewMode('pantry'); break;
      case '/history': setViewMode('history'); break;
      case '/profile': setViewMode('profile'); break;
      case '/settings': setSettingsOpen(true); break;
      case '/clear':
        if (window.confirm('チャット履歴を消去しますか？')) {
          chatState.clearHistory();
          // clearSettingsChatHistory(); // This deleted legacy localStorage key.
        }
        break;
      default:
        alert(`未対応のコマンドです: ${cmd}`);
    }
  };

  const renderView = () => {
    switch (viewMode) {
      case 'chat': 
        return (
          <ChatView 
            turns={chatState.turns}
            isWaiting={chatState.isWaiting}
            currentToolNotices={chatState.currentToolNotices}
            onSend={chatState.sendUserMessage}
            onCommand={handleCommand} 
          />
        );
      case 'backside': return <BacksideView onCommand={handleCommand} />;
      case 'pantry': return <PantryView />;
      case 'history': return <HistoryView />;
      case 'profile': return <ProfileView />;
      default: 
        return (
          <ChatView 
            turns={chatState.turns}
            isWaiting={chatState.isWaiting}
            currentToolNotices={chatState.currentToolNotices}
            onSend={chatState.sendUserMessage}
            onCommand={handleCommand} 
          />
        );
    }
  };

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {dataLoaded && (
        <Sidebar
          sessions={chatState.sessions}
          currentSessionId={chatState.currentSessionId}
          onNewSession={() => {
            chatState.startNewSession();
            setViewMode('chat');
            if (window.innerWidth <= 768) setSidebarOpen(false);
          }}
          onSwitchSession={(id) => {
            chatState.switchSession(id);
            setViewMode('chat');
            if (window.innerWidth <= 768) setSidebarOpen(false);
          }}
          onDeleteSession={chatState.deleteSession}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}
      <div className="app-main">
        <ErrorBanner />
        {!dataLoaded ? (
          <FolderPicker />
        ) : (
          <>
            <Header
              viewMode={viewMode}
              onViewModeChange={(m) => setViewMode(m as ViewMode)}
              onOpenSettings={() => setSettingsOpen(true)}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />
            {renderView()}
            <SettingsModal
              isOpen={settingsOpen || settingsForceOpen}
              forceOpen={settingsForceOpen}
              onClose={() => setSettingsOpen(false)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
