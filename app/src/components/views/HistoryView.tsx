import { useAppState } from '../../hooks/useAppState';

export function HistoryView() {
  const { state } = useAppState();
  const history = state.data.mealHistory;

  return (
    <div className="view-container" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
      <h2>食事履歴 (/history)</h2>
      {history.length === 0 ? (
        <p>履歴はありません。</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {history.map((record, idx) => (
            <li key={idx} style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>
              <strong>{record.date} ({record.meal}): {record.menu}</strong>
              <div style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
                カロリー: {record.nutrition.kcal}kcal | 満足度: {record.satisfaction ?? '未設定'}
                {record.note && <span> | メモ: {record.note}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
