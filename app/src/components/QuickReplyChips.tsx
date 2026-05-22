export function QuickReplyChips({ choices, onSelect, disabled }: { choices: string[], onSelect: (choice: string) => void, disabled?: boolean }) {
  if (!choices || choices.length === 0) return null;

  return (
    <div className="quick-reply-container" style={{
      display: 'flex',
      gap: '8px',
      padding: '4px 0',
      overflowX: 'auto',
      whiteSpace: 'nowrap',
      scrollbarWidth: 'none',
    }}>
      {choices.map((choice, i) => (
        <button
          key={i}
          onClick={() => !disabled && onSelect(choice)}
          disabled={disabled}
          style={{
            background: disabled ? '#f9f9f9' : 'white',
            border: `1px solid ${disabled ? '#e0e0e0' : '#ff9800'}`,
            color: disabled ? '#aaa' : '#ff9800',
            borderRadius: '20px',
            padding: '6px 14px',
            cursor: disabled ? 'default' : 'pointer',
            fontWeight: 'bold',
            flexShrink: 0,
            fontSize: '0.85rem',
            boxShadow: disabled ? 'none' : '0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          {choice}
        </button>
      ))}
    </div>
  );
}
