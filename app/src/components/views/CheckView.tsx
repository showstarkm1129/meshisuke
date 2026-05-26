import { useState, useMemo } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useFileSaver } from '../../hooks/useFileSaver';
import type { Ingredient, Seasoning } from '../../types/data.types';

type CheckItemType = 'ingredient' | 'seasoning';

interface CheckItem {
  id: string; // for React key
  type: CheckItemType;
  index: number;
  name: string;
  urgencyLevel: '🔴 期限切れ' | '🔴 高' | '🟡 中' | '🟠 残量少' | '🔴 残量0';
  data: Ingredient | Seasoning;
}

export function CheckView() {
  const { state } = useAppState();
  const { savePantry } = useFileSaver();
  const pantry = state.data.pantry;
  
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set());

  const checkItems = useMemo(() => {
    if (!pantry) return [];
    
    const items: CheckItem[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr).getTime();

    // Check ingredients
    pantry.ingredients.forEach((ing, idx) => {
      if (ing.quantity <= 0) {
        items.push({ id: `ing_${idx}`, type: 'ingredient', index: idx, name: ing.name, urgencyLevel: '🔴 残量0', data: ing });
        return;
      }

      if (!ing.expires_at) return;
      const expDate = new Date(ing.expires_at).getTime();
      const diffDays = (expDate - today) / (1000 * 60 * 60 * 24);
      
      if (diffDays <= 0) {
        items.push({ id: `ing_${idx}`, type: 'ingredient', index: idx, name: ing.name, urgencyLevel: '🔴 期限切れ', data: ing });
      } else if (diffDays <= 3) {
        items.push({ id: `ing_${idx}`, type: 'ingredient', index: idx, name: ing.name, urgencyLevel: '🔴 高', data: ing });
      } else if (diffDays <= 7) {
        items.push({ id: `ing_${idx}`, type: 'ingredient', index: idx, name: ing.name, urgencyLevel: '🟡 中', data: ing });
      }
    });

    // Check seasonings
    pantry.seasonings.forEach((sea, idx) => {
      if (sea.amount_current <= 0) {
        items.push({ id: `sea_${idx}`, type: 'seasoning', index: idx, name: sea.name, urgencyLevel: '🔴 残量0', data: sea });
        return;
      }

      if (!sea.amount_full || sea.amount_full === 0) return;
      const ratio = sea.amount_current / sea.amount_full;
      if (ratio < 0.2) {
        items.push({ id: `sea_${idx}`, type: 'seasoning', index: idx, name: sea.name, urgencyLevel: '🟠 残量少', data: sea });
      }
    });

    return items;
  }, [pantry]);

  const visibleItems = checkItems.filter(item => !handledIds.has(item.id));

  const handleAction = async (item: CheckItem, action: string) => {
    if (!pantry) return;

    // Mark as handled immediately for UI responsiveness
    setHandledIds(prev => new Set(prev).add(item.id));

    let updatedPantry = { ...pantry };

    if (item.type === 'ingredient') {
      if (action === '使い切った' || action === '期限切れた') {
        updatedPantry.ingredients = updatedPantry.ingredients.filter((_, i) => i !== item.index);
      }
      // "まだある" means we do nothing to the data, just dismiss
    } else if (item.type === 'seasoning') {
      if (action === '使い切った') {
        updatedPantry.seasonings = updatedPantry.seasonings.filter((_, i) => i !== item.index);
      } else if (action === '補充済み') {
        updatedPantry.seasonings = updatedPantry.seasonings.map((sea, i) => {
          if (i === item.index) {
            return { ...sea, amount_current: sea.amount_full };
          }
          return sea;
        });
      }
      // "まだ少ない" means we do nothing to the data, just dismiss
    }

    updatedPantry.updated_at = new Date().toISOString().split('T')[0];
    await savePantry(updatedPantry);
  };

  if (!pantry) {
    return <div style={{ padding: '20px' }}>Pantry data not available.</div>;
  }

  return (
    <div className="view-container" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
      <h2>緊急度の高いアイテム (/check)</h2>
      
      {visibleItems.length === 0 ? (
        <p style={{ marginTop: '20px' }}>現在、確認が必要なアイテムはありません。🎉</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
          {visibleItems.map(item => (
            <li key={item.id} style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '12px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ fontSize: '1.1rem' }}>{item.name}</strong>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{item.urgencyLevel}</span>
              </div>
              
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '12px' }}>
                {item.type === 'ingredient' && (
                  <>
                    数量: {(item.data as Ingredient).quantity} {(item.data as Ingredient).unit}
                    {(item.data as Ingredient).expires_at ? ` | 期限: ${(item.data as Ingredient).expires_at}` : ''}
                  </>
                )}
                {item.type === 'seasoning' && `残量: ${(item.data as Seasoning).amount_current} / ${(item.data as Seasoning).amount_full} ${(item.data as Seasoning).unit}`}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {item.type === 'ingredient' ? (
                  <>
                    <button onClick={() => handleAction(item, 'まだある')} style={actionButtonStyle}>まだある</button>
                    <button onClick={() => handleAction(item, '使い切った')} style={actionButtonStyle}>使い切った</button>
                    <button onClick={() => handleAction(item, '期限切れた')} style={actionButtonStyle}>期限切れた</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleAction(item, '補充済み')} style={actionButtonStyle}>補充済み</button>
                    <button onClick={() => handleAction(item, 'まだ少ない')} style={actionButtonStyle}>まだ少ない</button>
                    <button onClick={() => handleAction(item, '使い切った')} style={actionButtonStyle}>使い切った</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const actionButtonStyle = {
  padding: '6px 12px',
  borderRadius: '16px',
  border: '1px solid #ccc',
  background: '#f9f9f9',
  cursor: 'pointer',
  fontSize: '0.9rem'
};
