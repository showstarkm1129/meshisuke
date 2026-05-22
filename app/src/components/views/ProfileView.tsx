import { useAppState } from '../../hooks/useAppState';

export function ProfileView() {
  const { state } = useAppState();
  const profile = state.data.profile;
  const equipment = state.data.equipment;

  if (!profile) return null;

  return (
    <div className="view-container" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
      <h2>プロフィール・設定 (/profile)</h2>
      <p>目標カロリー: {profile.daily_targets.calories_kcal} kcal</p>
      
      <section style={{ marginTop: '20px' }}>
        <h3>好み・アレルギー</h3>
        <p><strong>アレルギー:</strong> {profile.allergies ? profile.allergies.map(a => a.name).join(', ') : '未確認/なし'}</p>
        <p><strong>嫌いなもの:</strong> {profile.dislikes ? profile.dislikes.map(d => d.name).join(', ') : '未確認/なし'}</p>
        <p><strong>好きなもの:</strong> {profile.favorites ? profile.favorites.map(f => f.name).join(', ') : '未確認/なし'}</p>
      </section>

      <section style={{ marginTop: '20px' }}>
        <h3>調理器具</h3>
        <p>熱源: {equipment?.heat_sources.map(h => `${h.name}(${h.burners ?? 1}口)`).join(', ') || 'なし'}</p>
        <p>家電: {equipment?.appliances.map(a => a.name).join(', ') || 'なし'}</p>
      </section>
    </div>
  );
}
