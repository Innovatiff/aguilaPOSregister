import { Delete } from 'lucide-react';
import { useCart } from '../state/cart';
import { pos } from '../state/pos';

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', '.'];

export default function Keypad() {
  const buffer = useCart((s) => s.buffer);
  const press = useCart((s) => s.pressKey);
  const setBuffer = useCart((s) => s.setBuffer);
  return (
    <section className="keypad">
      <div className="keypad__grid" style={{ gridTemplateRows: 'repeat(5, 1fr)' }}>
        {KEYS.map((k) => (
          <button key={k} className="key" onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button className="key key--ghost" onClick={() => setBuffer(buffer.slice(0, -1))} aria-label="Retroceso">
          <Delete size={22} />
        </button>
        <button className="key key--accent key--enter" style={{ gridColumn: 'span 2' }} onClick={() => void pos.enterPlu()}>
          ENTRAR / PLU
        </button>
      </div>
      <div className="disc-keys">
        <button className="key key--sm key--purple" onClick={() => void pos.discount('txn', 'amount')}>
          $ Descuento
        </button>
        <button className="key key--sm key--purple" onClick={() => void pos.discount('txn', 'percent')}>
          % Descuento
        </button>
        <button className="key key--sm key--purple" onClick={() => void pos.discount('line', 'amount')}>
          $ Desc. artículo
        </button>
        <button className="key key--sm key--purple" onClick={() => void pos.discount('line', 'percent')}>
          % Desc. artículo
        </button>
      </div>
    </section>
  );
}
