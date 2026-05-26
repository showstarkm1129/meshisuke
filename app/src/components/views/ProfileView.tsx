import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useFileSaver } from '../../hooks/useFileSaver';
import type { Profile, WeightedItem } from '../../types/data.types';
import type { TargetItemIndices } from '../ChatView';

export function ProfileView({ 
  hideTitle = false,
  visibleSections = ['allergies', 'dislikes', 'favorites', 'equipment', 'basic'],
  isEmbedded = false,
  targetIndices
}: { 
  hideTitle?: boolean;
  visibleSections?: ('allergies' | 'dislikes' | 'favorites' | 'equipment' | 'basic')[];
  isEmbedded?: boolean;
  targetIndices?: TargetItemIndices;
}) {
  const { state } = useAppState();
  const { saveProfile } = useFileSaver();
  const profile = state.data.profile;
  const equipment = state.data.equipment;

  const [localProfile, setLocalProfile] = useState<Profile | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile && !localProfile) {
      setLocalProfile(profile);
    }
  }, [profile, localProfile]);

  const handleSave = useCallback(
    (newProfile: Profile) => {
      setSaveStatus('saving');
      saveProfile(newProfile).then(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      });
    },
    [saveProfile]
  );

  const triggerSave = useCallback(
    (newProfile: Profile) => {
      setLocalProfile(newProfile);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        handleSave(newProfile);
      }, 500);
    },
    [handleSave]
  );

  if (!localProfile) return null;

  const toggleSection = (field: 'allergies' | 'dislikes' | 'favorites') => {
    const isConfirmed = localProfile[field] !== null;
    triggerSave({
      ...localProfile,
      [field]: isConfirmed ? null : [],
      updated_at: new Date().toISOString().split('T')[0]
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateItem = (field: 'allergies' | 'dislikes' | 'favorites', index: number, key: keyof WeightedItem, value: any) => {
    if (!localProfile[field]) return;
    const newList = [...localProfile[field]!];
    newList[index] = { ...newList[index], [key]: value };
    triggerSave({ ...localProfile, [field]: newList, updated_at: new Date().toISOString().split('T')[0] });
  };

  const deleteItem = (field: 'allergies' | 'dislikes' | 'favorites', index: number) => {
    if (!localProfile[field]) return;
    const newList = localProfile[field]!.filter((_, i) => i !== index);
    triggerSave({ ...localProfile, [field]: newList, updated_at: new Date().toISOString().split('T')[0] });
  };

  const addItem = (field: 'allergies' | 'dislikes' | 'favorites') => {
    if (!localProfile[field]) return;
    const newItem: WeightedItem = {
      name: '',
      weight: 1,
      last_signal_at: new Date().toISOString().split('T')[0],
      signal_count: 1
    };
    triggerSave({ ...localProfile, [field]: [...localProfile[field]!, newItem], updated_at: new Date().toISOString().split('T')[0] });
  };

  const renderList = (label: string, field: 'allergies' | 'dislikes' | 'favorites') => {
    let items = localProfile[field] as WeightedItem[] | null;
    
    // Convert ResourceKey mapping for targetIndices
    let resourceKey: 'アレルギー' | '嫌い物' | '好み物' = 'アレルギー';
    if (field === 'dislikes') resourceKey = '嫌い物';
    if (field === 'favorites') resourceKey = '好み物';

    const isConfirmed = items !== null;

    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h4>{label}</h4>
          <button onClick={() => toggleSection(field)} style={{ fontSize: '0.8rem', padding: '2px 8px', cursor: 'pointer' }}>
            {isConfirmed ? '確認済み (タップで未確認に戻す)' : '未確認 (タップで確認済みにする)'}
          </button>
        </div>
        {!isConfirmed ? (
          <div style={{ padding: '10px', background: '#f5f5f5', color: '#888', borderRadius: '4px' }}>
            未確認のためデータはありません。
          </div>
        ) : (
          <div>
            {items!.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.9em' }}>該当なし（追加ボタンから登録できます）</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                    <th style={{ padding: '4px' }}>名前</th>
                    <th style={{ padding: '4px' }}>重み(1-3)</th>
                    <th style={{ padding: '4px' }}>最終シグナル</th>
                    <th style={{ padding: '4px' }}>回数</th>
                    <th style={{ padding: '4px', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items!.map((item, idx) => (
                    (!targetIndices || !targetIndices[resourceKey] || targetIndices[resourceKey]!.includes(idx)) && (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '4px' }}><input value={item.name} onChange={(e) => updateItem(field, idx, 'name', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} /></td>
                        <td style={{ padding: '4px' }}>
                          <select value={item.weight} onChange={(e) => updateItem(field, idx, 'weight', Number(e.target.value) as 1 | 2 | 3)} style={{ width: '60px', boxSizing: 'border-box' }}>
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                          </select>
                        </td>
                        <td style={{ padding: '4px' }}><input type="date" value={item.last_signal_at} onChange={(e) => updateItem(field, idx, 'last_signal_at', e.target.value)} style={{ width: '110px', boxSizing: 'border-box' }} /></td>
                        <td style={{ padding: '4px' }}><input type="number" value={item.signal_count} onChange={(e) => updateItem(field, idx, 'signal_count', Number(e.target.value))} style={{ width: '60px', boxSizing: 'border-box' }} /></td>
                        <td style={{ padding: '4px', textAlign: 'center' }}><button onClick={() => deleteItem(field, idx)} style={{ cursor: 'pointer', background: 'none', border: 'none' }}>🗑️</button></td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={() => addItem(field)} style={{ marginTop: '5px', cursor: 'pointer' }}>+ 新規追加</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="view-container" style={isEmbedded ? { position: 'relative' } : { padding: '20px', overflowY: 'auto', flex: 1, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, fontSize: '0.8rem', color: saveStatus === 'saving' ? '#ff9800' : saveStatus === 'saved' ? '#4caf50' : 'transparent' }}>
        {saveStatus === 'saving' ? '保存中...' : '保存しました ✓'}
      </div>

      {!hideTitle && visibleSections.includes('basic') && <h2>プロフィール・設定 (/profile)</h2>}
      {!hideTitle && visibleSections.includes('basic') && <p>目標カロリー: {localProfile.daily_targets.calories_kcal} kcal</p>}
      
      {(visibleSections.includes('allergies') || visibleSections.includes('dislikes') || visibleSections.includes('favorites')) && (
        <section style={{ marginTop: hideTitle ? '0px' : '20px' }}>
          <h3>好み・アレルギー</h3>
          {visibleSections.includes('allergies') && renderList('アレルギー', 'allergies')}
          {visibleSections.includes('dislikes') && renderList('嫌いなもの', 'dislikes')}
          {visibleSections.includes('favorites') && renderList('好きなもの', 'favorites')}
        </section>
      )}

      {visibleSections.includes('equipment') && (
        <section style={{ marginTop: '20px' }}>
          <h3>調理器具</h3>
          <p>熱源: {equipment?.heat_sources.map(h => `${h.name}(${h.burners ?? 1}口)`).join(', ') || 'なし'}</p>
          <p>家電: {equipment?.appliances.map(a => a.name).join(', ') || 'なし'}</p>
        </section>
      )}
    </div>
  );
}
