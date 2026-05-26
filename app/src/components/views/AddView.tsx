import { useState, useRef, useEffect, forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useFileSaver } from '../../hooks/useFileSaver';
import type { Ingredient, Seasoning, StorageType } from '../../types/data.types';

const ClearableInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { onClear: () => void }>((props, ref) => {
  const [hovered, setHovered] = useState(false);
  const { onClear, ...rest } = props;

  return (
    <div 
      style={{ position: 'relative', width: rest.style?.width || '100%' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <input {...rest} ref={ref} style={{ ...rest.style, paddingRight: '30px', boxSizing: 'border-box' }} />
      {hovered && rest.value !== '' && rest.value !== undefined && (
        <button
          type="button"
          onClick={onClear}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#999',
            fontSize: '1.2rem',
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
});
ClearableInput.displayName = 'ClearableInput';

export function AddView() {
  const { state } = useAppState();
  const { savePantry } = useFileSaver();
  const pantry = state.data.pantry;

  const [activeTab, setActiveTab] = useState<'ingredient' | 'seasoning'>('ingredient');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Ingredient Form State
  const [ingName, setIngName] = useState('');
  const [ingQuantity, setIngQuantity] = useState<number | ''>('');
  const [ingUnit, setIngUnit] = useState('個');
  const [ingExpires, setIngExpires] = useState('');
  const [ingStorage, setIngStorage] = useState<StorageType>('冷蔵');
  const [ingNote, setIngNote] = useState('');

  // Seasoning Form State
  const [seaName, setSeaName] = useState('');
  const [seaAmount, setSeaAmount] = useState<number | ''>('');
  const [seaAmountFull, setSeaAmountFull] = useState<number | ''>('');
  const [seaUnit, setSeaUnit] = useState<'ml' | 'g'>('ml');
  const [seaNote, setSeaNote] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [activeTab]);

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pantry || !ingName.trim()) return;

    setSaveStatus('saving');
    const newItem: Ingredient = {
      name: ingName.trim(),
      quantity: typeof ingQuantity === 'number' ? ingQuantity : 1,
      unit: ingUnit,
      purchased_at: new Date().toISOString().split('T')[0],
      expires_at: ingExpires,
      storage: ingStorage,
      note: ingNote
    };

    const newPantry = {
      ...pantry,
      ingredients: [...pantry.ingredients, newItem],
      updated_at: new Date().toISOString().split('T')[0]
    };

    await savePantry(newPantry);
    
    // Reset and keep focus
    setSaveStatus('saved');
    setIngName('');
    setIngQuantity('');
    setIngUnit('個');
    setIngExpires('');
    setIngStorage('冷蔵');
    setIngNote('');
    
    setTimeout(() => setSaveStatus('idle'), 2000);
    if (nameInputRef.current) nameInputRef.current.focus();
  };

  const handleSaveSeasoning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pantry || !seaName.trim()) return;

    setSaveStatus('saving');
    const newItem: Seasoning = {
      name: seaName.trim(),
      amount_current: typeof seaAmount === 'number' ? seaAmount : 0,
      amount_full: typeof seaAmountFull === 'number' ? seaAmountFull : 100,
      unit: seaUnit,
      note: seaNote
    };

    const newPantry = {
      ...pantry,
      seasonings: [...pantry.seasonings, newItem],
      updated_at: new Date().toISOString().split('T')[0]
    };

    await savePantry(newPantry);
    
    // Reset and keep focus
    setSaveStatus('saved');
    setSeaName('');
    setSeaAmount('');
    setSeaAmountFull('');
    setSeaUnit('ml');
    setSeaNote('');
    
    setTimeout(() => setSaveStatus('idle'), 2000);
    if (nameInputRef.current) nameInputRef.current.focus();
  };

  const STORAGE_OPTIONS: StorageType[] = ['冷蔵', '冷凍', '常温', '野菜室'];

  const handleExpiresBlur = () => {
    // Format YYYYMMDD to YYYY-MM-DD
    if (/^\d{8}$/.test(ingExpires)) {
      setIngExpires(`${ingExpires.slice(0,4)}-${ingExpires.slice(4,6)}-${ingExpires.slice(6,8)}`);
    }
  };

  const addQuantity = (setter: React.Dispatch<React.SetStateAction<number | ''>>, amount: number) => {
    setter(prev => (typeof prev === 'number' ? prev + amount : amount));
  };

  return (
    <div className="view-container" style={{ padding: '20px', overflowY: 'auto', flex: 1, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, fontSize: '0.8rem', color: saveStatus === 'saving' ? '#ff9800' : saveStatus === 'saved' ? '#4caf50' : 'transparent', fontWeight: 'bold' }}>
        {saveStatus === 'saving' ? '保存中...' : '追加しました ✓'}
      </div>

      <h2>アイテムの高速追加 (/add)</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('ingredient')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #ccc', cursor: 'pointer', background: activeTab === 'ingredient' ? '#4caf50' : '#fff', color: activeTab === 'ingredient' ? '#fff' : '#333' }}
        >
          食材を追加
        </button>
        <button 
          onClick={() => setActiveTab('seasoning')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #ccc', cursor: 'pointer', background: activeTab === 'seasoning' ? '#2196f3' : '#fff', color: activeTab === 'seasoning' ? '#fff' : '#333' }}
        >
          調味料を追加
        </button>
      </div>

      {activeTab === 'ingredient' ? (
        <form onSubmit={handleSaveIngredient} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>食材名 *</label>
            <ClearableInput 
              ref={nameInputRef}
              type="text" 
              value={ingName} 
              onChange={e => setIngName(e.target.value)} 
              onClear={() => setIngName('')}
              required 
              placeholder="例: 玉ねぎ"
              style={{ width: '100%', padding: '10px', fontSize: '1.1rem' }} 
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>数量</label>
              <ClearableInput type="number" value={ingQuantity} onChange={e => setIngQuantity(e.target.value === '' ? '' : Number(e.target.value))} onClear={() => setIngQuantity('')} min="0" step={ingUnit === 'g' || ingUnit === 'ml' ? '10' : '0.1'} style={{ width: '100%', padding: '10px', fontSize: '1.1rem' }} />
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                {ingUnit === 'g' || ingUnit === 'ml' ? (
                  <>
                    <button type="button" onClick={() => addQuantity(setIngQuantity, 10)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+10</button>
                    <button type="button" onClick={() => addQuantity(setIngQuantity, 50)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+50</button>
                    <button type="button" onClick={() => addQuantity(setIngQuantity, 100)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+100</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => addQuantity(setIngQuantity, 1)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+1</button>
                    <button type="button" onClick={() => addQuantity(setIngQuantity, 5)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+5</button>
                    <button type="button" onClick={() => addQuantity(setIngQuantity, 10)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+10</button>
                  </>
                )}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>単位</label>
              <ClearableInput type="text" value={ingUnit} onChange={e => setIngUnit(e.target.value)} onClear={() => setIngUnit('')} placeholder="個, g, 枚など" style={{ width: '100%', padding: '10px', fontSize: '1.1rem' }} />
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                {['個', 'g', '枚', '本'].map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setIngUnit(u)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      background: ingUnit === u ? '#e0f7fa' : '#f5f5f5',
                      borderColor: ingUnit === u ? '#00bcd4' : '#ccc',
                      color: ingUnit === u ? '#00838f' : '#333',
                      fontWeight: ingUnit === u ? 'bold' : 'normal',
                      cursor: 'pointer',
                      flex: 1,
                      minWidth: '40px'
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>保存場所</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {STORAGE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setIngStorage(opt)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    background: ingStorage === opt ? '#fff3e0' : '#fff',
                    borderColor: ingStorage === opt ? '#ff9800' : '#ccc',
                    color: ingStorage === opt ? '#e65100' : '#333',
                    fontWeight: ingStorage === opt ? 'bold' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>消費期限 (YYYYMMDD)</label>
            <ClearableInput type="text" value={ingExpires} onChange={e => setIngExpires(e.target.value)} onBlur={handleExpiresBlur} onClear={() => setIngExpires('')} placeholder="YYYYMMDD" style={{ width: '100%', padding: '10px', fontSize: '1.1rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>メモ</label>
            <ClearableInput type="text" value={ingNote} onChange={e => setIngNote(e.target.value)} onClear={() => setIngNote('')} placeholder="特記事項があれば" style={{ width: '100%', padding: '10px', fontSize: '1.1rem' }} />
          </div>

          <button type="submit" disabled={!ingName.trim() || saveStatus === 'saving'} style={{ padding: '14px', marginTop: '10px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1.1rem', cursor: !ingName.trim() ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            追加して次へ入力
          </button>
        </form>
      ) : (
        <form onSubmit={handleSaveSeasoning} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>調味料・消耗品名 *</label>
            <ClearableInput 
              ref={nameInputRef}
              type="text" 
              value={seaName} 
              onChange={e => setSeaName(e.target.value)} 
              onClear={() => setSeaName('')}
              required 
              placeholder="例: 塩"
              style={{ width: '100%', padding: '10px', fontSize: '1.1rem' }} 
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>現在量</label>
              <ClearableInput type="number" value={seaAmount} onChange={e => setSeaAmount(e.target.value === '' ? '' : Number(e.target.value))} onClear={() => setSeaAmount('')} min="0" style={{ width: '100%', padding: '10px', fontSize: '1.1rem' }} />
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                <button type="button" onClick={() => addQuantity(setSeaAmount, 10)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+10</button>
                <button type="button" onClick={() => addQuantity(setSeaAmount, 50)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+50</button>
                <button type="button" onClick={() => addQuantity(setSeaAmount, 100)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+100</button>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>最大量(満タン時)</label>
              <ClearableInput type="number" value={seaAmountFull} onChange={e => setSeaAmountFull(e.target.value === '' ? '' : Number(e.target.value))} onClear={() => setSeaAmountFull('')} min="1" style={{ width: '100%', padding: '10px', fontSize: '1.1rem' }} />
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                <button type="button" onClick={() => addQuantity(setSeaAmountFull, 10)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+10</button>
                <button type="button" onClick={() => addQuantity(setSeaAmountFull, 50)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+50</button>
                <button type="button" onClick={() => addQuantity(setSeaAmountFull, 100)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', flex: 1 }}>+100</button>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>単位</label>
              <select value={seaUnit} onChange={e => setSeaUnit(e.target.value as 'ml'|'g')} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', fontSize: '1.1rem', height: '42.5px' }}>
                <option value="ml">ml</option>
                <option value="g">g</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>メモ</label>
            <ClearableInput type="text" value={seaNote} onChange={e => setSeaNote(e.target.value)} onClear={() => setSeaNote('')} placeholder="特記事項があれば" style={{ width: '100%', padding: '10px', fontSize: '1.1rem' }} />
          </div>

          <button type="submit" disabled={!seaName.trim() || saveStatus === 'saving'} style={{ padding: '14px', marginTop: '10px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1.1rem', cursor: !seaName.trim() ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            追加して次へ入力
          </button>
        </form>
      )}
    </div>
  );
}
