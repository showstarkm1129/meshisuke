import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';

const COMMANDS = [
  { cmd: '/pantry', desc: '食材・調味料の管理' },
  { cmd: '/history', desc: '食事履歴の確認' },
  { cmd: '/profile', desc: 'プロフィール・設定の確認' },
  { cmd: '/settings', desc: '詳細設定（APIキー等）を開く' },
  { cmd: '/clear', desc: 'チャット履歴を消去' },
];

export function MessageInput({
  onSend,
  onCommand,
  disabled
}: {
  onSend: (text: string) => void;
  onCommand?: (cmd: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isComposing = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showSuggest = text.startsWith('/') && !text.includes(' ');
  const filteredCommands = showSuggest ? COMMANDS.filter(c => c.cmd.startsWith(text.toLowerCase())) : [];

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setSelectedIndex(0);
  };

  const handleSend = (overrideText?: string) => {
    const finalTxt = overrideText ?? text;
    const trimmed = finalTxt.trim();
    if (trimmed && !disabled) {
      if (trimmed.startsWith('/') && onCommand) {
        const [cmd] = trimmed.split(' ');
        onCommand(cmd);
      } else {
        onSend(trimmed);
      }
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggest && filteredCommands.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'Enter' && !isComposing.current) {
        e.preventDefault();
        handleSend(filteredCommands[selectedIndex].cmd);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !isComposing.current) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  return (
    <div className="message-input-wrapper" style={{ position: 'relative' }}>
      {showSuggest && filteredCommands.length > 0 && (
        <div className="command-suggest-popup">
          {filteredCommands.map((c, idx) => (
            <div 
              key={c.cmd} 
              className={`command-item ${idx === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSend(c.cmd)}
            >
              <strong style={{ color: '#ff9800' }}>{c.cmd}</strong> <span style={{ color: '#666', fontSize: '0.9em' }}>- {c.desc}</span>
            </div>
          ))}
        </div>
      )}
      <div className="message-input-container">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => isComposing.current = true}
          onCompositionEnd={() => isComposing.current = false}
          placeholder="メッセージを入力... (/ でコマンド入力)"
          disabled={disabled}
          rows={1}
        />
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginBottom: '1px' }}>
          <button 
            onClick={() => handleSend('おまかせで')} 
            disabled={disabled}
            className="omakase-button"
            style={{
              background: disabled ? '#f5f5f5' : '#fff',
              color: disabled ? '#aaa' : '#ff9800',
              border: `1px solid ${disabled ? '#ddd' : '#ff9800'}`,
              borderRadius: '20px',
              padding: '10px 16px',
              fontWeight: 'bold',
              cursor: disabled ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            おまかせ
          </button>
          <button 
            onClick={() => handleSend()} 
            disabled={disabled || !text.trim()}
            className="send-button"
            style={{ marginBottom: 0 }}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
