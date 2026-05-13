import { useAppState } from './hooks/useAppState';
import { FolderPicker } from './components/FolderPicker';
import { ErrorBanner } from './components/ErrorBanner';
import './App.css';

function App() {
  const { state } = useAppState();
  const { data, dirHandle, isLoading } = state;

  const isDataLoaded = dirHandle !== null && !isLoading && data.profile !== null;

  return (
    <div className="app">
      <h1>めし助</h1>
      <ErrorBanner />

      {!isDataLoaded ? (
        <FolderPicker />
      ) : (
        <div className="data-summary">
          <h2>データ読み込み完了</h2>
          <p>オンボーディング: {data.profile?.onboarding_completed ? '完了' : '未完了'}</p>
          <p>食材数: {data.pantry?.ingredients.length ?? 0} 件</p>
          <p>調味料数: {data.pantry?.seasonings.length ?? 0} 件</p>
          <p>食事履歴: {data.mealHistory.length} 件</p>
          <p>調理器具数: {data.equipment?.appliances.length ?? 0} 件（家電）</p>
        </div>
      )}
    </div>
  );
}

export default App;
