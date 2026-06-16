import { useSettings } from '../hooks/useSettings';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { ChatTurn } from '../lib/chatHistory';
import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import type { ResourceKey } from './views/ManageView';

export type TargetItemIndices = Partial<Record<ResourceKey, number[]>>;

export function ChatView({
  turns,
  isWaiting,
  currentToolNotices,
  onSend,
  onCommand,
  onManageStart,
}: {
  turns: ChatTurn[];
  isWaiting: boolean;
  currentToolNotices?: string[];
  onSend: (text: string) => void;
  onCommand?: (cmd: string) => void;
  onManageStart?: (keys: ResourceKey[], indices?: TargetItemIndices) => void;
}) {
  const { isConfigured } = useSettings();
  const { state } = useAppState();

  const [showManage, setShowManage] = useState(false);
  const [manageStep, setManageStep] = useState<1 | 2>(1);
  const [selectedManageKeys, setSelectedManageKeys] = useState<ResourceKey[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<TargetItemIndices>({});

  const handleCommand = (cmd: string) => {
    if (cmd === '/manage') {
      setShowManage(true);
      setManageStep(1);
      setSelectedManageKeys([]);
      setSelectedIndices({});
    } else if (onCommand) {
      onCommand(cmd);
    }
  };

  const ALL_MANAGE_KEYS: ResourceKey[] = [
    '食材',
    '調味料',
    '食事履歴',
    'アレルギー',
    '嫌い物',
    '好み物',
    '調理器具',
    '基本情報',
  ];

  const toggleManageKey = (key: ResourceKey) => {
    if (selectedManageKeys.includes(key)) {
      setSelectedManageKeys(selectedManageKeys.filter((k) => k !== key));
    } else {
      setSelectedManageKeys([...selectedManageKeys, key]);
    }
  };

  const toggleItemIndex = (key: ResourceKey, index: number) => {
    setSelectedIndices((prev) => {
      const current = prev[key] || [];
      if (current.includes(index)) {
        return { ...prev, [key]: current.filter((i) => i !== index) };
      } else {
        return { ...prev, [key]: [...current, index] };
      }
    });
  };

  const nextStep = () => {
    if (selectedManageKeys.length > 0) {
      setManageStep(2);
    }
  };

  const submitManage = () => {
    if (selectedManageKeys.length > 0 && onManageStart) {
      onManageStart(selectedManageKeys, selectedIndices);
    }
    setShowManage(false);
    setManageStep(1);
    setSelectedManageKeys([]);
    setSelectedIndices({});
  };

  const renderChecklist = (key: ResourceKey) => {
    let items: { name: string }[] = [];
    const { pantry, profile } = state.data;
    if (key === '食材' && pantry) items = pantry.ingredients;
    if (key === '調味料' && pantry) items = pantry.seasonings;
    if (key === 'アレルギー' && profile) items = profile.allergies || [];
    if (key === '嫌い物' && profile) items = profile.dislikes || [];
    if (key === '好み物' && profile) items = profile.favorites || [];

    // Some keys don't have item lists (e.g., 基本情報, 食事履歴)
    if (items.length === 0) return null;

    return (
      <div key={key} style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9rem' }}>{key}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {items.map((item, idx) => {
            const isChecked = selectedIndices[key]?.includes(idx) ?? false;
            return (
              <label
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: isChecked ? '#e8f5e9' : '#fff',
                  border: '1px solid #ccc',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleItemIndex(key, idx)}
                />
                {item.name || `項目 ${idx + 1}`}
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-view">
      <MessageList
        turns={turns}
        isWaiting={isWaiting}
        currentToolNotices={currentToolNotices}
        onSend={onSend}
      />
      {showManage && manageStep === 1 && (
        <div style={{ padding: '10px 20px', background: '#f0f0f0', borderTop: '1px solid #ccc' }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>何を管理する？</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            {ALL_MANAGE_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => toggleManageKey(key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: '1px solid #ccc',
                  background: selectedManageKeys.includes(key) ? '#4caf50' : '#fff',
                  color: selectedManageKeys.includes(key) ? '#fff' : '#333',
                  cursor: 'pointer',
                }}
              >
                {key}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={nextStep}
              disabled={selectedManageKeys.length === 0}
              style={{
                padding: '6px 16px',
                background: '#2196f3',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedManageKeys.length === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedManageKeys.length === 0 ? 0.5 : 1,
              }}
            >
              次へ
            </button>
            <button
              onClick={() => setShowManage(false)}
              style={{
                padding: '6px 16px',
                background: '#e0e0e0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
      {showManage && manageStep === 2 && (
        <div
          style={{
            padding: '10px 20px',
            background: '#f0f0f0',
            borderTop: '1px solid #ccc',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
            管理するリソース（アイテム）を選択
          </div>
          {selectedManageKeys.map(renderChecklist)}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={submitManage}
              style={{
                padding: '6px 16px',
                background: '#2196f3',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              決定
            </button>
            <button
              onClick={() => setManageStep(1)}
              style={{
                padding: '6px 16px',
                background: '#e0e0e0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              戻る
            </button>
          </div>
        </div>
      )}
      <MessageInput
        onSend={onSend}
        onCommand={handleCommand}
        disabled={isWaiting || !isConfigured}
      />
    </div>
  );
}
