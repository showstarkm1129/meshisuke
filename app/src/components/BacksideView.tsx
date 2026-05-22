import { useAppState } from '../hooks/useAppState';

export function BacksideView({ onCommand }: { onCommand?: (cmd: string) => void }) {
  const { state } = useAppState();
  const { profile, equipment, pantry, mealHistory } = state.data;

  return (
    <div className="backside-view">
      <h2>裏側 (バックグラウンド)</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>ローカルの JSON データに基づくリソース管理画面へ移動します。</p>

      <div className="backside-menu" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '40px' }}>
        <button className="action-btn" style={{ padding: '16px', fontSize: '1.1rem', textAlign: 'left' }} onClick={() => onCommand?.('/pantry')}>
          🍎 食材・調味料の管理 (/pantry)
        </button>
        <button className="action-btn" style={{ padding: '16px', fontSize: '1.1rem', textAlign: 'left' }} onClick={() => onCommand?.('/history')}>
          🍽️ 食事履歴の確認 (/history)
        </button>
        <button className="action-btn" style={{ padding: '16px', fontSize: '1.1rem', textAlign: 'left' }} onClick={() => onCommand?.('/profile')}>
          ⚙️ プロフィール・アレルギー設定 (/profile)
        </button>
        <button className="action-btn" style={{ padding: '16px', fontSize: '1.1rem', textAlign: 'left' }} onClick={() => onCommand?.('/settings')}>
          🔑 アプリ詳細設定・APIキー (/settings)
        </button>
      </div>

      <hr style={{ margin: '30px 0', borderColor: '#ddd' }} />

      <h3>デバッグ用生データ表示</h3>
      <section style={{ marginTop: '20px' }}>
        <h4>profile.json</h4>
        <pre>{JSON.stringify(profile, null, 2)}</pre>
      </section>
      <section>
        <h4>equipment.json</h4>
        <pre>{JSON.stringify(equipment, null, 2)}</pre>
      </section>
      <section>
        <h4>pantry.json</h4>
        <pre>{JSON.stringify(pantry, null, 2)}</pre>
      </section>
      <section>
        <h4>meal_history.jsonl ({mealHistory.length} 件)</h4>
        <pre>{mealHistory.map(r => JSON.stringify(r)).join('\n')}</pre>
      </section>
    </div>
  );
}
