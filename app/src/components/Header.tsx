export function Header({
  viewMode,
  onViewModeChange,
  onOpenSettings,
  onToggleSidebar
}: {
  viewMode: string;
  onViewModeChange: (m: string) => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <button className="sidebar-toggle-btn" onClick={onToggleSidebar} title="メニューの開閉">
          ☰
        </button>
        <img src="/meshisuke1.png" alt="logo" className="header-logo" />
        <span className="header-title">めし助</span>
      </div>
      <div className="header-center">
        <div className="segment-control">
          <button 
            className={viewMode === 'chat' ? 'active' : ''} 
            onClick={() => onViewModeChange('chat')}
          >
            チャット
          </button>
          <button 
            className={viewMode === 'backside' ? 'active' : ''} 
            onClick={() => onViewModeChange('backside')}
          >
            裏側
          </button>
        </div>
      </div>
      <div className="header-right">
        <button className="settings-btn" onClick={onOpenSettings}>
          ⚙
        </button>
      </div>
    </header>
  );
}
