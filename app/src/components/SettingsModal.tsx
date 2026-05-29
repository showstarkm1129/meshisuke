import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useFileSaver } from '../hooks/useFileSaver';
import { SaveMode } from '../types/data.types';
import { PROVIDER_LABELS, type ProviderName } from '../lib/llm/provider';

export function SettingsModal({
  isOpen,
  onClose,
  forceOpen
}: {
  isOpen: boolean;
  onClose: () => void;
  forceOpen: boolean;
}) {
  const { settings, setProvider, setApiKey, setModel, addModelToHistory, setSaveMode, clearChatHistory, isConfigured } = useSettings();
  const { flushAll } = useFileSaver();

  const [inputKey, setInputKey] = useState('');
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputKey('');
  }, [settings.activeProvider, isOpen]);

  if (!isOpen) return null;

  const currentProvider = settings.activeProvider || 'openrouter';
  const hasKey = Boolean(settings.apiKeys[currentProvider]);

  const handleSaveKey = () => {
    if (inputKey) {
      setApiKey(currentProvider, inputKey);
      setInputKey('');
    }
  };

  const handleClearKey = () => {
    setApiKey(currentProvider, '');
  };

  const handleClose = () => {
    if (forceOpen && !isConfigured) return;
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>設定</h2>
          {!forceOpen && (
            <button className="close-btn" onClick={handleClose}>×</button>
          )}
        </div>
        
        <div className="modal-body">
          <section className="settings-section">
            <label className="section-label">プロバイダー</label>
            <div className="radio-group">
              {(Object.keys(PROVIDER_LABELS) as ProviderName[]).map(p => (
                <label key={p}>
                  <input 
                    type="radio" 
                    name="provider" 
                    value={p} 
                    checked={currentProvider === p}
                    onChange={() => setProvider(p)}
                  />
                  {PROVIDER_LABELS[p]}
                </label>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <label className="section-label">API キー ({PROVIDER_LABELS[currentProvider]})</label>
            <div className="input-group">
              {hasKey ? (
                <>
                  <input type="password" value="••••••••" disabled />
                  <button onClick={handleClearKey}>クリア</button>
                </>
              ) : (
                <>
                  <input 
                    type="password" 
                    placeholder="APIキーを入力..." 
                    value={inputKey}
                    onChange={e => setInputKey(e.target.value)}
                  />
                  <button onClick={handleSaveKey}>保存</button>
                </>
              )}
            </div>
          </section>

          <section className="settings-section">
            <label className="section-label">モデル</label>
            <input 
              type="text"
              placeholder="モデル名を入力"
              value={settings.activeModel || ''} 
              onChange={e => setModel(e.target.value)}
              onBlur={e => addModelToHistory(e.target.value)}
              className="model-input"
            />
            {settings.modelHistory[currentProvider] && settings.modelHistory[currentProvider].length > 0 && (
              <div className="model-history-tags">
                {settings.modelHistory[currentProvider].map(m => (
                  <button 
                    key={m} 
                    className="history-tag" 
                    onClick={() => setModel(m)}
                    type="button"
                    title={`${m}を選択`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="settings-section">
            <label className="section-label">保存モード</label>
            <div className="radio-group">
              <label>
                <input 
                  type="radio" 
                  name="saveMode" 
                  checked={settings.saveMode === SaveMode.Auto}
                  onChange={() => setSaveMode(SaveMode.Auto)}
                />
                自動
              </label>
              <label>
                <input 
                  type="radio" 
                  name="saveMode" 
                  checked={settings.saveMode === SaveMode.Manual}
                  onChange={() => setSaveMode(SaveMode.Manual)}
                />
                手動
              </label>
            </div>
            {settings.saveMode === SaveMode.Manual && (
              <button 
                className="action-btn"
                onClick={() => flushAll()}
                style={{ marginTop: '8px' }}
              >
                変更を保存
              </button>
            )}
          </section>

          <section className="settings-section">
            <button 
              className="danger-btn" 
              onClick={() => {
                if (window.confirm('チャット履歴を消去しますか？')) {
                  clearChatHistory();
                  window.location.reload();
                }
              }}
            >
              チャット履歴クリア
            </button>
          </section>
        </div>

        <div className="modal-footer">
          <button 
            className="primary-btn" 
            onClick={handleClose}
            disabled={forceOpen && !isConfigured}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
