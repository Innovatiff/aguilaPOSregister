import { useState } from 'react';
import { CheckCircle2, Printer } from 'lucide-react';
import ModalShell from './ModalShell';
import { useUI } from '../../state/ui';
import { useCatalog } from '../../state/catalog';
import { pos } from '../../state/pos';
import { receiptText } from '../../hardware/printer';
import { formatMoney } from '../../core/money';
import { plural } from '../../core/format';
import type { Transaction } from '../../core/types';

export function ChangeModal({ txn }: { txn: Transaction }) {
  const close = useUI((s) => s.closeModal);
  const store = useCatalog((s) => s.store);
  const money = (n: number) => formatMoney(n, store.locale, store.currency);
  const [showReceipt, setShowReceipt] = useState(false);
  const paid = txn.tenders.reduce((a, t) => a + t.amount, 0);
  return (
    <ModalShell title={<><CheckCircle2 size={24} color="#22c55e" /> Venta {txn.number} completada</>} onClose={close}>
      <div className="change-hero">
        <span className="label">{txn.changeDue > 0 ? 'Cambio' : txn.totals.total < 0 ? 'Reembolsado al cliente' : 'Pagado en su totalidad'}</span>
        <b>{money(txn.changeDue > 0 ? txn.changeDue : Math.abs(txn.totals.total))}</b>
        <div className="sub">Total {money(txn.totals.total)} · Recibido {money(paid)} · {plural(txn.totals.itemCount, 'artículo')}</div>
      </div>
      {showReceipt && <pre className="receipt-paper">{receiptText(txn, store)}</pre>}
      <div className="modal__actions">
        <button className="key" onClick={() => setShowReceipt((v) => !v)}>{showReceipt ? 'Ocultar recibo' : 'Ver recibo'}</button>
        <button className="key key--info" onClick={() => pos.printCurrentReceipt(txn)}><Printer size={18} /> Imprimir</button>
        <button className="key key--accent" onClick={close}>Siguiente cliente</button>
      </div>
    </ModalShell>
  );
}

export function ReceiptModal({ txn, reprint }: { txn: Transaction; reprint?: boolean }) {
  const close = useUI((s) => s.closeModal);
  const store = useCatalog((s) => s.store);
  return (
    <ModalShell title={`Recibo ${txn.number}`} subtitle={reprint ? 'Las reimpresiones quedan registradas para el gerente.' : undefined} onClose={close}>
      <pre className="receipt-paper">{receiptText(txn, store, { reprint })}</pre>
      <div className="modal__actions">
        <button className="key key--ghost" onClick={close}>Cerrar</button>
        <button className="key key--info" onClick={() => (reprint ? pos.reprint(txn) : pos.printCurrentReceipt(txn))}><Printer size={18} /> Imprimir</button>
      </div>
    </ModalShell>
  );
}
