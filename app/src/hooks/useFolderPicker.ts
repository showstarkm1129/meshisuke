import { useCallback } from 'react';
import { useAppState } from './useAppState';
import { findDataDirectory, checkRequiredFiles } from '../lib/fileio';
import { formatErrorDetail } from '../lib/errors';

export function useFolderPicker() {
  const { dispatch } = useAppState();

  const pickFolder = useCallback(async () => {
    // File System Access API 対応チェック
    if (!('showDirectoryPicker' in window)) {
      dispatch({
        type: 'ADD_ERROR',
        payload:
          'このブラウザは File System Access API に対応していません。Chrome または Edge をお使いください。',
      });
      return;
    }

    try {
      // ルートフォルダ選択ダイアログを開く
      const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });

      // data/ サブディレクトリを探す
      const dataHandle = await findDataDirectory(rootHandle);
      if (dataHandle === null) {
        dispatch({
          type: 'ADD_ERROR',
          payload:
            '選択されたフォルダに data/ ディレクトリが見つかりませんでした。めし助リポジトリのルートフォルダを選択してください。',
        });
        return;
      }

      // 必須ファイルの存在確認
      const missing = await checkRequiredFiles(dataHandle);
      if (missing.length > 0) {
        dispatch({
          type: 'ADD_ERROR',
          payload: `data/ フォルダに必要なファイルが見つかりません: ${missing.join(', ')}`,
        });
        return;
      }

      // 必須ファイル確認がすべて通ったら rootHandle を state に保持する
      // useDataLoader は state.dirHandle を見て loadData() を呼ぶ（FolderPicker の useEffect 経由）
      // dataHandle は loadData() 内で findDataDirectory を再度呼んで取得する
      dispatch({ type: 'SET_DIR_HANDLE', payload: rootHandle });
    } catch (err) {
      // ユーザーがキャンセルした場合（AbortError）はエラーとして扱わない
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      dispatch({
        type: 'ADD_ERROR',
        payload: `フォルダの読み込み中にエラーが発生しました (${formatErrorDetail(err)})`,
      });
    }
  }, [dispatch]);

  return { pickFolder };
}
