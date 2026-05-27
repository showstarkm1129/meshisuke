import { useSettings } from '../hooks/useSettings';
import { PROVIDER_LABELS, type ProviderName } from '../lib/llm/provider';

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
  const { settings, setProvider } = useSettings();
  const availableProviders = (Object.keys(settings.apiKeys) as ProviderName[]).filter(p => settings.apiKeys[p]);

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
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {availableProviders.length > 1 && (
          <select 
            value={settings.activeProvider || ''} 
            onChange={e => setProvider(e.target.value as ProviderName)}
            style={{ fontSize: '0.8rem', padding: '4px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff' }}
            title="使用するAIプロバイダーを切り替え"
          >
            {availableProviders.map(p => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        )}
        <button className="settings-btn" onClick={onOpenSettings} title="設定">
          ⚙
        </button>
      </div>
    </header>
  );
}
