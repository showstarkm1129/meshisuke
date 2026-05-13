import { useEffect } from 'react';
import { useFolderPicker } from '../hooks/useFolderPicker';
import { useDataLoader } from '../hooks/useDataLoader';
import { useAppState } from '../hooks/useAppState';

export function FolderPicker() {
  const { state } = useAppState();
  const { pickFolder } = useFolderPicker();
  const { loadData } = useDataLoader();

  // ディレクトリハンドルが設定されたら自動的にデータを読み込む
  useEffect(() => {
    if (state.dirHandle !== null) {
      void loadData();
    }
  }, [state.dirHandle, loadData]);

  if (state.dirHandle !== null && !state.isLoading && state.errors.length === 0) {
    // 読み込み完了後はこのコンポーネントは表示しない（App.tsx が切り替える）
    return null;
  }

  return (
    <div className="folder-picker">
      <h2>めし助へようこそ</h2>
      <p>めし助リポジトリのルートフォルダを選択してください。</p>
      <p>
        <small>（data/ フォルダが含まれているフォルダを選択してください）</small>
      </p>
      <button type="button" onClick={() => void pickFolder()} disabled={state.isLoading}>
        {state.isLoading ? '読み込み中...' : 'フォルダを選択する'}
      </button>
    </div>
  );
}
