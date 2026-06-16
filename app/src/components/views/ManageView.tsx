import { PantryView } from './PantryView';
import { ProfileView } from './ProfileView';
import { HistoryView } from './HistoryView';

export type ResourceKey =
  | '食材'
  | '調味料'
  | '食事履歴'
  | 'アレルギー'
  | '嫌い物'
  | '好み物'
  | '調理器具'
  | '基本情報';

import type { TargetItemIndices } from '../ChatView';

interface ManageViewProps {
  selectedKeys: ResourceKey[];
  targetIndices?: TargetItemIndices;
}

export function ManageView({ selectedKeys, targetIndices }: ManageViewProps) {
  if (selectedKeys.length === 0) {
    return <div style={{ padding: '20px' }}>管理する項目を選択してください。</div>;
  }

  const showPantryIngredients = selectedKeys.includes('食材');
  const showPantrySeasonings = selectedKeys.includes('調味料');
  const showHistory = selectedKeys.includes('食事履歴');
  const showProfileAllergies = selectedKeys.includes('アレルギー');
  const showProfileDislikes = selectedKeys.includes('嫌い物');
  const showProfileFavorites = selectedKeys.includes('好み物');
  const showProfileEquipment = selectedKeys.includes('調理器具');
  const showProfileBasic = selectedKeys.includes('基本情報');

  const needsPantry = showPantryIngredients || showPantrySeasonings;
  const needsHistory = showHistory;
  const needsProfile =
    showProfileAllergies ||
    showProfileDislikes ||
    showProfileFavorites ||
    showProfileEquipment ||
    showProfileBasic;

  const pantrySections: ('ingredients' | 'seasonings')[] = [];
  if (showPantryIngredients) pantrySections.push('ingredients');
  if (showPantrySeasonings) pantrySections.push('seasonings');

  const profileSections: ('allergies' | 'dislikes' | 'favorites' | 'equipment' | 'basic')[] = [];
  if (showProfileAllergies) profileSections.push('allergies');
  if (showProfileDislikes) profileSections.push('dislikes');
  if (showProfileFavorites) profileSections.push('favorites');
  if (showProfileEquipment) profileSections.push('equipment');
  if (showProfileBasic) profileSections.push('basic');

  return (
    <div
      className="view-container manage-view"
      style={{
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
      }}
    >
      {needsPantry && (
        <PantryView
          hideTitle
          visibleSections={pantrySections}
          isEmbedded
          targetIndices={targetIndices}
        />
      )}
      {needsProfile && (
        <ProfileView
          hideTitle
          visibleSections={profileSections}
          isEmbedded
          targetIndices={targetIndices}
        />
      )}
      {needsHistory && <HistoryView hideTitle isEmbedded />}
    </div>
  );
}
