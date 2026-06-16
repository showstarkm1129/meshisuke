import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useFileSaver } from '../../hooks/useFileSaver';
import type { MealRecord } from '../../types/data.types';

export function HistoryView({
  hideTitle = false,
  isEmbedded = false,
}: {
  hideTitle?: boolean;
  isEmbedded?: boolean;
}) {
  const { state } = useAppState();
  const { saveMealHistory } = useFileSaver();
  const history = state.data.mealHistory;

  const [localHistory, setLocalHistory] = useState<MealRecord[] | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (history && !localHistory) {
      setLocalHistory(history);
    }
  }, [history, localHistory]);

  const handleSave = useCallback(
    (newHistory: MealRecord[]) => {
      setSaveStatus('saving');
      saveMealHistory(newHistory).then(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      });
    },
    [saveMealHistory]
  );

  const triggerSave = useCallback(
    (newHistory: MealRecord[]) => {
      setLocalHistory(newHistory);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        handleSave(newHistory);
      }, 500);
    },
    [handleSave]
  );

  if (!localHistory) return null;

  const updateNote = (index: number, newNote: string) => {
    const newList = [...localHistory];
    newList[index] = { ...newList[index], note: newNote };
    triggerSave(newList);
  };

  const deleteRecord = (index: number) => {
    if (!confirm('この食事履歴を削除しますか？')) return;
    const newList = localHistory.filter((_, i) => i !== index);
    triggerSave(newList);
  };

  return (
    <div
      className="view-container"
      style={
        isEmbedded
          ? { position: 'relative' }
          : { padding: '20px', overflowY: 'auto', flex: 1, position: 'relative' }
      }
    >
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          fontSize: '0.8rem',
          color:
            saveStatus === 'saving'
              ? '#ff9800'
              : saveStatus === 'saved'
                ? '#4caf50'
                : 'transparent',
        }}
      >
        {saveStatus === 'saving' ? '保存中...' : '保存しました ✓'}
      </div>

      {!hideTitle && <h2>食事履歴 (/history)</h2>}

      {localHistory.length === 0 ? (
        <p>履歴はありません。</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: hideTitle ? '0px' : '20px' }}>
          {localHistory.map((record, idx) => (
            <li
              key={idx}
              style={{ padding: '12px', borderBottom: '1px solid #ccc', position: 'relative' }}
            >
              <button
                onClick={() => deleteRecord(idx)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                }}
                title="削除"
              >
                🗑️
              </button>

              <strong>
                {record.date} ({record.meal}): {record.menu}
              </strong>
              <div style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
                カロリー: {record.nutrition?.kcal ?? 0}kcal | 満足度:{' '}
                {record.satisfaction ?? '未設定'}
              </div>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.9em', color: '#666' }}>メモ:</span>
                <input
                  value={record.note}
                  onChange={(e) => updateNote(idx, e.target.value)}
                  style={{ flex: 1, padding: '4px', boxSizing: 'border-box' }}
                  placeholder="メモを追加..."
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
