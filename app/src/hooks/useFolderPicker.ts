import { useCallback, useState, useEffect } from 'react';
import { useAppState } from './useAppState';
import { findDataDirectory, checkRequiredFiles } from '../lib/fileio';
import { formatErrorDetail } from '../lib/errors';
import { saveDirHandle, loadDirHandle } from '../lib/idb';

export function useFolderPicker() {
  const { dispatch } = useAppState();
  const [savedHandle, setSavedHandle] = useState<FileSystemDirectoryHandle | null>(null);

  useEffect(() => {
    loadDirHandle().then(handle => {
      if (handle) {
        setSavedHandle(handle);
      }
    }).catch(console.error);
  }, []);

  const verifyAndLoadHandle = useCallback(async (rootHandle: FileSystemDirectoryHandle) => {
    const dataHandle = await findDataDirectory(rootHandle);
    if (dataHandle === null) {
      dispatch({
        type: 'ADD_ERROR',
        payload:
          '選択されたフォルダに data/ ディレクトリが見つかりませんでした。めし助リポジトリのルートフォルダを選択してください。',
      });
      return;
    }

    const missing = await checkRequiredFiles(dataHandle);
    if (missing.length > 0) {
      dispatch({
        type: 'ADD_ERROR',
        payload: `data/ フォルダに必要なファイルが見つかりません: ${missing.join(', ')}`,
      });
      return;
    }

    await saveDirHandle(rootHandle);
    dispatch({ type: 'SET_DIR_HANDLE', payload: rootHandle });
  }, [dispatch]);

  const pickFolder = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      dispatch({
        type: 'ADD_ERROR',
        payload:
          'このブラウザは File System Access API に対応していません。Chrome または Edge をお使いください。',
      });
      return;
    }

    try {
      const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await verifyAndLoadHandle(rootHandle);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      dispatch({
        type: 'ADD_ERROR',
        payload: `フォルダの読み込み中にエラーが発生しました (${formatErrorDetail(err)})`,
      });
    }
  }, [dispatch, verifyAndLoadHandle]);

  const resumeFolder = useCallback(async () => {
    if (!savedHandle) return;
    try {
      const handle = savedHandle as unknown as {
        queryPermission(options?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
        requestPermission(options?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
      };
      const options = { mode: 'readwrite' as const };
      if ((await handle.queryPermission(options)) !== 'granted') {
        const result = await handle.requestPermission(options);
        if (result !== 'granted') {
          return; // ユーザーがキャンセルした
        }
      }
      await verifyAndLoadHandle(savedHandle);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      dispatch({
        type: 'ADD_ERROR',
        payload: `フォルダの復元中にエラーが発生しました (${formatErrorDetail(err)})`,
      });
    }
  }, [dispatch, savedHandle, verifyAndLoadHandle]);

  return { pickFolder, resumeFolder, savedHandle };
}
