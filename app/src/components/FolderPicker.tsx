import { useEffect } from 'react';
import { useFolderPicker } from '../hooks/useFolderPicker';
import { useDataLoader } from '../hooks/useDataLoader';
import { useAppState } from '../hooks/useAppState';

export function FolderPicker() {
  const { state } = useAppState();
  const { pickFolder, resumeFolder, savedHandle } = useFolderPicker();
  const { loadData } = useDataLoader();

  useEffect(() => {
    if (state.dirHandle !== null) {
      void loadData();
    }
  }, [state.dirHandle, loadData]);

  if (state.dirHandle !== null && !state.isLoading && state.errors.length === 0) {
    return null;
  }

  return (
    <div className="folder-picker">
      <h2>めし助へようこそ</h2>
      <p>めし助リポジトリのルートフォルダを選択してください。</p>
      <p>
        <small>（data/ フォルダが含まれているフォルダを選択してください）</small>
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
          marginTop: '16px',
        }}
      >
        <button type="button" onClick={() => void pickFolder()} disabled={state.isLoading}>
          {state.isLoading ? '読み込み中...' : '新しいフォルダを選択'}
        </button>
        {savedHandle && !state.isLoading && (
          <button
            type="button"
            onClick={() => void resumeFolder()}
            style={{ background: '#4CAF50' }}
          >
            前回のフォルダ ({savedHandle.name}) で再開
          </button>
        )}
      </div>
    </div>
  );
}
