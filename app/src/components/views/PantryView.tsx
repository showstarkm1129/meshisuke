import { useAppState } from '../../hooks/useAppState';

export function PantryView() {
  const { state } = useAppState();
  const pantry = state.data.pantry;

  if (!pantry) {
    return <div style={{ padding: '20px' }}>Pantry data not available.</div>;
  }

  return (
    <div className="view-container" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
      <h2>食材・リソース管理 (/pantry)</h2>
      <p>最終更新日: {pantry.updated_at}</p>
      
      <section style={{ marginTop: '20px' }}>
        <h3>食材一覧</h3>
        {pantry.ingredients.length === 0 ? (
          <p>食材はありません。</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>名前</th>
                <th style={{ padding: '8px' }}>数量</th>
                <th style={{ padding: '8px' }}>保存場所</th>
                <th style={{ padding: '8px' }}>期限</th>
                <th style={{ padding: '8px' }}>メモ</th>
              </tr>
            </thead>
            <tbody>
              {pantry.ingredients.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{item.name}</td>
                  <td style={{ padding: '8px' }}>{item.quantity} {item.unit}</td>
                  <td style={{ padding: '8px' }}>{item.storage}</td>
                  <td style={{ padding: '8px' }}>{item.expires_at}</td>
                  <td style={{ padding: '8px' }}>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: '30px' }}>
        <h3>調味料・消耗品一覧</h3>
        {pantry.seasonings.length === 0 ? (
          <p>調味料はありません。</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>名前</th>
                <th style={{ padding: '8px' }}>残量 (現在/最大)</th>
                <th style={{ padding: '8px' }}>メモ</th>
              </tr>
            </thead>
            <tbody>
              {pantry.seasonings.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{item.name}</td>
                  <td style={{ padding: '8px' }}>{item.amount_current} / {item.amount_full} {item.unit}</td>
                  <td style={{ padding: '8px' }}>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
