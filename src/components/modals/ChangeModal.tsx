import { useState } from 'react';
import { CheckCircle2, Printer } from 'lucide-react';
import ModalShell from './ModalShell';
import { useUI } from '../../state/ui';
import { useCatalog } from '../../state/catalog';
import { pos } from '../../state/pos';
import { receiptText } from '../../hardware/printer';
import { formatMoney } from '../../core/money';
import type { Transaction } from '../../core/types';

export function ChangeModal({ txn }: { txn: Transaction }) {
  const close = useUI((s) => s.closeModal);
  const store = useCatalog((s) => s.store);
  const money = (n: number) => formatMoney(n, store.locale, store.currency);
  const [showReceipt, setShowReceipt] = useState(false);
  const paid = txn.tenders.reduce((a, t) => a + t.amount, 0);
  return (
    <ModalShell title={<><CheckCircle2 size={24} color="#22c55e" /> Sale {txn.number} complete</>} onClose={close}>
      <div className="change-hero">
        <span className="label">{txn.changeDue > 0 ? 'Change due' : txn.totals.total < 0 ? 'Refunded to customer' : 'Paid in full'}</span>
        <b>{money(txn.changeDue > 0 ? txn.changeDue : Math.abs(txn.totals.total))}</b>
        <div className="sub">Total {money(txn.totals.total)} · Tendered {money(paid)} · {txn.totals.itemCount} items</div>
      </div>
      {showReceipt && <pre className="receipt-paper">{receiptText(txn, store)}</pre>}
      <div className="modal__actions">
        <button className="key" onClick={() => setShowReceipt((v) => !v)}>{showReceipt ? 'Hide receipt' : 'View receipt'}</button>
        <button className="key key--info" onClick={() => pos.printCurrentReceipt(txn)}><Printer size={18} /> Print</button>
        <button className="key key--accent" onClick={close}>Next customer</button>
      </div>
    </ModalShell>
  );
}

export function ReceiptModal({ txn, reprint }: { txn: Transaction; reprint?: boolean }) {
  const close = useUI((s) => s.closeModal);
  const store = useCatalog((s) => s.store);
  return (
    <ModalShell title={`Receipt ${txn.number}`} subtitle={reprint ? 'Reprints are logged for the manager.' : undefined} onClose={close}>
      <pre className="receipt-paper">{receiptText(txn, store, { reprint })}</pre>
      <div className="modal__actions">
        <button className="key key--ghost" onClick={close}>Close</button>
        <button className="key key--info" onClick={() => (reprint ? pos.reprint(txn) : pos.printCurrentReceipt(txn))}><Printer size={18} /> Print</button>
      </div>
    </ModalShell>
  );
}
