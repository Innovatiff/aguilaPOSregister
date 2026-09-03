import { useEffect } from 'react';
import { Delete } from 'lucide-react';
import { onTyped } from '../hardware/scanner';
import { parseAmountBuffer } from '../core/money';

export type NumPadMode = 'amount' | 'qty' | 'pin' | 'weight' | 'code';

interface Props {
  value: string;
  onChange: (v: string) => void;
  mode: NumPadMode;
  onEnter?: () => void;
  enterLabel?: string;
  hint?: string;
  autoKeyboard?: boolean;
  formatAmount?: (n: number) => string;
}

export default function NumPad({ value, onChange, mode, onEnter, enterLabel = 'ENTRAR', hint, autoKeyboard = true, formatAmount }: Props) {
  const maxLen = mode === 'pin' ? 6 : mode === 'code' ? 14 : 9;
  const press = (k: string) => {
    if (k === '⌫') return onChange(value.slice(0, -1));
    if (k === 'C') return onChange('');
    if (k === '.' && (value.includes('.') || mode === 'pin' || mode === 'code')) return;
    if (k === '00' && !value) return;
    onChange((value + k).slice(0, maxLen));
  };
  useEffect(() => {
    if (!autoKeyboard) return;
    return onTyped((key) => {
      if (key === 'Enter') onEnter?.();
      else if (key === 'Backspace') press('⌫');
      else if (key === 'Escape') onChange('');
      else if (/^[0-9.]$/.test(key)) press(key);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, onEnter, autoKeyboard]);

  let display: string;
  if (mode === 'pin') display = '•'.repeat(value.length);
  else if (mode === 'amount') display = formatAmount ? formatAmount(parseAmountBuffer(value)) : parseAmountBuffer(value).toFixed(2);
  else if (mode === 'weight') display = value ? `${value} kg` : '0.000 kg';
  else display = value || '0';

  const keys = mode === 'pin' || mode === 'code' ? ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫'] : ['7', '8', '9', '4', '5', '6', '1', '2', '3', mode === 'amount' ? '00' : '.', '0', '⌫'];
  return (
    <div className="numpad">
      {mode !== 'pin' && (
        <div className="numpad__display">
          {hint && <small>{hint}</small>}
          {display}
        </div>
      )}
      <div className="numpad__grid">
        {keys.map((k) => (
          <button key={k} className={`key ${k === '⌫' || k === 'C' ? 'key--ghost' : ''}`} onClick={() => press(k)} aria-label={k === '⌫' ? 'Retroceso' : k}>
            {k === '⌫' ? <Delete size={22} /> : k}
          </button>
        ))}
      </div>
      {onEnter && (
        <button className="key key--accent key--lg" onClick={onEnter}>
          {enterLabel}
        </button>
      )}
    </div>
  );
}
