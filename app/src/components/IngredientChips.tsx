import { getIngredientEmoji } from '../lib/ingredientEmoji';

export function IngredientChips({ payload }: { payload: string }) {
  let items: { name: string, qty: string }[] = [];
  try {
    const parsed = JSON.parse(payload);
    if (Array.isArray(parsed)) {
      items = parsed.map(item => ({
        name: item.name || '',
        qty: item.qty || item.quantity || ''
      }));
    } else {
      throw new Error("Not an array");
    }
  } catch {
    const lines = payload.split('\n').map(line => line.trim()).filter(Boolean);
    items = lines.map(line => {
      const parts = line.split(' ');
      if (parts.length >= 2) {
        const qty = parts.pop()!;
        return { name: parts.join(' '), qty };
      }
      return { name: line, qty: '' };
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="ingredient-chips-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0' }}>
      {items.map((item, i) => (
        <span key={i} className="ingredient-pill" style={{
          background: '#f0f0f0',
          padding: '4px 10px',
          borderRadius: '16px',
          fontSize: '0.85rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          border: '1px solid #ddd'
        }}>
          <span>{getIngredientEmoji(item.name)}</span>
          <span style={{ fontWeight: 'bold' }}>{item.name}</span>
          {item.qty && <span style={{ color: '#666' }}>{item.qty}</span>}
        </span>
      ))}
    </div>
  );
}
