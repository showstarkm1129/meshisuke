import { useAppState } from '../hooks/useAppState';

export function ErrorBanner() {
  const { state, dispatch } = useAppState();

  if (state.errors.length === 0) return null;

  return (
    <div className="error-banner" role="alert">
      <strong>エラーが発生しました:</strong>
      <ul>
        {state.errors.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => dispatch({ type: 'CLEAR_ERRORS' })}
        style={{ marginTop: '0.5rem', cursor: 'pointer' }}
      >
        閉じる
      </button>
    </div>
  );
}
