import { useEffect } from 'react';
import StatusBar from '../components/StatusBar';
import ReceiptPanel from '../components/ReceiptPanel';
import FunctionKeys from '../components/FunctionKeys';
import CatalogGrid from '../components/CatalogGrid';
import Keypad from '../components/Keypad';
import TenderPanel from '../components/TenderPanel';
import { onTyped } from '../hardware/scanner';
import { useCart } from '../state/cart';
import { useUI } from '../state/ui';
import { pos } from '../state/pos';

export default function RegisterPage() {
  useEffect(
    () =>
      onTyped((key) => {
        if (useUI.getState().modal) return;
        const cart = useCart.getState();
        if (key === 'Enter') void pos.enterPlu();
        else if (key === 'Backspace') cart.setBuffer(cart.buffer.slice(0, -1));
        else if (key === 'Escape') pos.clearKey();
        else if (/^[0-9.]$/.test(key)) cart.pressKey(key);
      }),
    [],
  );
  return (
    <div className="pos">
      <StatusBar />
      <div className="pos__body">
        <ReceiptPanel />
        <main className="work">
          <FunctionKeys />
          <div className="work__grid">
            <CatalogGrid />
            <Keypad />
            <TenderPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
