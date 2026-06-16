import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useFileSaver } from '../../hooks/useFileSaver';
import type { Ingredient, Seasoning, Pantry, StorageType } from '../../types/data.types';
import type { TargetItemIndices } from '../ChatView';

export function PantryView({
  hideTitle = false,
  visibleSections = ['ingredients', 'seasonings'],
  isEmbedded = false,
  targetIndices,
}: {
  hideTitle?: boolean;
  visibleSections?: ('ingredients' | 'seasonings')[];
  isEmbedded?: boolean;
  targetIndices?: TargetItemIndices;
}) {
  const { state } = useAppState();
  const { savePantry } = useFileSaver();
  const pantry = state.data.pantry;

  const [localPantry, setLocalPantry] = useState<Pantry | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with global state when it loads
  useEffect(() => {
    if (pantry && !localPantry) {
      setLocalPantry(pantry);
    }
  }, [pantry, localPantry]);

  const handleSave = useCallback(
    (newPantry: Pantry) => {
      setSaveStatus('saving');
      savePantry(newPantry).then(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      });
    },
    [savePantry]
  );

  const triggerSave = useCallback(
    (newPantry: Pantry) => {
      setLocalPantry(newPantry);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        handleSave(newPantry);
      }, 500);
    },
    [handleSave]
  );

  if (!localPantry) {
    return <div style={{ padding: '20px' }}>Pantry data not available.</div>;
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const newIngredients = [...localPantry.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    triggerSave({
      ...localPantry,
      ingredients: newIngredients,
      updated_at: new Date().toISOString().split('T')[0],
    });
  };

  const deleteIngredient = (index: number) => {
    const newIngredients = localPantry.ingredients.filter((_, i) => i !== index);
    triggerSave({
      ...localPantry,
      ingredients: newIngredients,
      updated_at: new Date().toISOString().split('T')[0],
    });
  };

  const addIngredient = () => {
    const newItem: Ingredient = {
      name: '',
      quantity: 1,
      unit: '個',
      purchased_at: new Date().toISOString().split('T')[0],
      expires_at: '',
      storage: '冷蔵',
      note: '',
    };
    triggerSave({
      ...localPantry,
      ingredients: [...localPantry.ingredients, newItem],
      updated_at: new Date().toISOString().split('T')[0],
    });
  };

  const updateSeasoning = (index: number, field: keyof Seasoning, value: string | number) => {
    const newSeasonings = [...localPantry.seasonings];
    newSeasonings[index] = { ...newSeasonings[index], [field]: value };
    triggerSave({
      ...localPantry,
      seasonings: newSeasonings,
      updated_at: new Date().toISOString().split('T')[0],
    });
  };

  const deleteSeasoning = (index: number) => {
    const newSeasonings = localPantry.seasonings.filter((_, i) => i !== index);
    triggerSave({
      ...localPantry,
      seasonings: newSeasonings,
      updated_at: new Date().toISOString().split('T')[0],
    });
  };

  const addSeasoning = () => {
    const newItem: Seasoning = {
      name: '',
      amount_current: 0,
      amount_full: 0,
      unit: 'ml',
      note: '',
    };
    triggerSave({
      ...localPantry,
      seasonings: [...localPantry.seasonings, newItem],
      updated_at: new Date().toISOString().split('T')[0],
    });
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

      {!hideTitle && <h2>食材・リソース管理 (/pantry)</h2>}
      {!hideTitle && <p>最終更新日: {localPantry.updated_at}</p>}

      {visibleSections.includes('ingredients') && (
        <section style={{ marginTop: hideTitle ? '0px' : '20px' }}>
          <h3>食材一覧</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>名前</th>
                <th style={{ padding: '8px' }}>数量</th>
                <th style={{ padding: '8px' }}>単位</th>
                <th style={{ padding: '8px' }}>保存場所</th>
                <th style={{ padding: '8px' }}>期限</th>
                <th style={{ padding: '8px' }}>メモ</th>
                <th style={{ padding: '8px', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {localPantry.ingredients.map(
                (item, idx) =>
                  (!targetIndices ||
                    !targetIndices['食材'] ||
                    targetIndices['食材'].includes(idx)) && (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '4px' }}>
                        <input
                          value={item.name}
                          onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateIngredient(idx, 'quantity', Number(e.target.value))
                          }
                          style={{ width: '60px', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input
                          value={item.unit}
                          onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                          style={{ width: '60px', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <select
                          value={item.storage}
                          onChange={(e) =>
                            updateIngredient(idx, 'storage', e.target.value as StorageType)
                          }
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        >
                          <option value="冷蔵">冷蔵</option>
                          <option value="冷凍">冷凍</option>
                          <option value="常温">常温</option>
                          <option value="野菜室">野菜室</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input
                          type="date"
                          value={item.expires_at}
                          onChange={(e) => updateIngredient(idx, 'expires_at', e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input
                          value={item.note}
                          onChange={(e) => updateIngredient(idx, 'note', e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '4px', textAlign: 'center' }}>
                        <button
                          onClick={() => deleteIngredient(idx)}
                          style={{ cursor: 'pointer', background: 'none', border: 'none' }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )
              )}
            </tbody>
          </table>
          <button onClick={addIngredient} style={{ marginTop: '10px', cursor: 'pointer' }}>
            + 新規食材
          </button>
        </section>
      )}

      {visibleSections.includes('seasonings') && (
        <section style={{ marginTop: '30px' }}>
          <h3>調味料・消耗品一覧</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>名前</th>
                <th style={{ padding: '8px' }}>現在</th>
                <th style={{ padding: '8px' }}>最大</th>
                <th style={{ padding: '8px' }}>単位</th>
                <th style={{ padding: '8px' }}>メモ</th>
                <th style={{ padding: '8px', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {localPantry.seasonings.map(
                (item, idx) =>
                  (!targetIndices ||
                    !targetIndices['調味料'] ||
                    targetIndices['調味料'].includes(idx)) && (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '4px' }}>
                        <input
                          value={item.name}
                          onChange={(e) => updateSeasoning(idx, 'name', e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input
                          type="number"
                          value={item.amount_current}
                          onChange={(e) =>
                            updateSeasoning(idx, 'amount_current', Number(e.target.value))
                          }
                          style={{ width: '60px', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input
                          type="number"
                          value={item.amount_full}
                          onChange={(e) =>
                            updateSeasoning(idx, 'amount_full', Number(e.target.value))
                          }
                          style={{ width: '60px', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <select
                          value={item.unit}
                          onChange={(e) =>
                            updateSeasoning(idx, 'unit', e.target.value as 'ml' | 'g')
                          }
                          style={{ width: '60px', boxSizing: 'border-box' }}
                        >
                          <option value="ml">ml</option>
                          <option value="g">g</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input
                          value={item.note}
                          onChange={(e) => updateSeasoning(idx, 'note', e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '4px', textAlign: 'center' }}>
                        <button
                          onClick={() => deleteSeasoning(idx)}
                          style={{ cursor: 'pointer', background: 'none', border: 'none' }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )
              )}
            </tbody>
          </table>
          <button onClick={addSeasoning} style={{ marginTop: '10px', cursor: 'pointer' }}>
            + 新規調味料
          </button>
        </section>
      )}
    </div>
  );
}
