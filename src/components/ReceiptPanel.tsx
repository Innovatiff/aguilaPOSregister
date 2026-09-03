import { ScanBarcode } from 'lucide-react';
import { useCart } from '../state/cart';
import { useCatalog } from '../state/catalog';
import { useSettings } from '../state/settings';
import { pos } from '../state/pos';
import { computeLine } from '../core/tax';
import { formatMoney, fixed2 } from '../core/money';
import { balanceDue, tendered } from '../core/cart';
import { fmtTime, plural, TENDER_LABEL } from '../core/format';

export default function ReceiptPanel() {
  const txn = useCart((s) => s.txn);
  const selected = useCart((s) => s.selectedLineId);
  const last = useCart((s) => s.lastCompleted);
  const store = useCatalog((s) => s.store);
  const { registerId } = useSettings();
  const money = (n: number) => formatMoney(n, store.locale, store.currency);

  const due = txn ? balanceDue(txn) : 0;
  const paid = txn ? tendered(txn) : 0;
  const isRefund = txn ? txn.totals.total < 0 : false;

  return (
    <aside className="receipt">
      <div className="receipt__head">
        <b>{store.name.toUpperCase()}</b>
        {store.address1}, {store.city} {store.province} {store.postalCode}
        <div className="row">
          <span>{txn ? `Recibo ${txn.number}` : `Caja ${registerId}`}</span>
          <span>{txn ? fmtTime(txn.startedAt) : 'Lista'}</span>
        </div>
      </div>
      <div className="receipt__lines">
        {!txn || txn.lines.length === 0 ? (
          <div className="receipt__empty">
            <ScanBarcode size={42} color="#8f9cbb" />
            <h3>Lista para el siguiente cliente</h3>
            <p>Escanee un artículo, escriba un PLU + ENTRAR o toque una categoría. Escriba un monto y luego una tecla de categoría para artículos abiertos.</p>
            {last && (
              <div className="last">
                ÚLTIMA VENTA {last.number} · {fmtTime(last.completedAt)}
                <br />
                {plural(last.totals.itemCount, 'artículo')} · TOTAL {fixed2(last.totals.total)}
                {last.changeDue > 0 && <> · CAMBIO {fixed2(last.changeDue)}</>}
              </div>
            )}
          </div>
        ) : (
          txn.lines.map((l) => {
            const c = computeLine({ ...l, voided: false });
            return (
              <div
                key={l.id}
                className={`receipt__line ${selected === l.id ? 'is-selected' : ''} ${l.voided ? 'is-voided' : ''} ${l.isReturn ? 'is-return' : ''}`}
                onClick={() => !l.voided && pos.selectLine(selected === l.id ? null : l.id)}
              >
                <div className="receipt__name">
                  {l.isReturn ? 'DEVOLUCIÓN ' : ''}
                  {l.name}
                </div>
                <div className="receipt__amt">{fixed2(c.extended)}</div>
                <div className="receipt__sub">
                  <span>
                    {l.unit === 'kg' ? `${l.qty.toFixed(3)} kg @ ${fixed2(l.unitPrice)}/kg` : `${l.qty} @ ${fixed2(l.unitPrice)}`}
                    {l.taxable ? ' · H' : ''}
                    {l.scanned ? ' · escaneado' : ''}
                  </span>
                  <span className="tag">
                    {l.priceOverride && `precio anterior ${fixed2(l.priceOverride.from)} `}
                    {l.discount && `-${l.discount.type === 'percent' ? `${l.discount.value}%` : fixed2(l.discount.value)} ${l.discount.reason}`}
                    {l.voided && `ANULADO: ${l.voidReason ?? ''}`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="receipt__totals">
        {txn && (
          <>
            <div className="row">
              <span>Subtotal ({plural(txn.totals.itemCount, 'artículo')}{txn.totals.returnCount ? `, ${txn.totals.returnCount} en devolución` : ''})</span>
              <b>{fixed2(txn.totals.subtotal)}</b>
            </div>
            {txn.totals.lineDiscounts > 0 && (
              <div className="row discount">
                <span>Descuentos en artículos incluidos</span>
                <span>-{fixed2(txn.totals.lineDiscounts)}</span>
              </div>
            )}
            {txn.totals.txnDiscount > 0 && (
              <div className="row discount">
                <span>Descuento en venta ({txn.txnDiscount?.reason})</span>
                <span>-{fixed2(txn.totals.txnDiscount)}</span>
              </div>
            )}
            <div className="row">
              <span>HST 13%</span>
              <b>{fixed2(txn.totals.tax)}</b>
            </div>
            {txn.tenders.map((t) => (
              <div className="receipt__tender" key={t.id}>
                <span>
                  {TENDER_LABEL[t.type] ?? t.type}
                  {t.cardLast4 ? ` ****${t.cardLast4}` : ''}
                  {t.ref && t.ref !== 'MANUAL' ? ` · ${t.ref}` : ''}
                </span>
                <span>
                  {fixed2(t.amount)} {t.type === 'cash' || t.ref === 'MANUAL' || !t.ref ? <button onClick={() => pos.removeTender(t.id)}>quitar</button> : null}
                </span>
              </div>
            ))}
          </>
        )}
        <div className={`total-big ${txn && paid > 0 && due <= 0 ? 'is-change' : txn && paid > 0 ? 'is-due' : isRefund ? 'is-refund' : ''}`}>
          <span>{txn && paid > 0 ? (due <= 0 ? 'Cambio' : 'Saldo pendiente') : isRefund ? 'Reembolso' : 'Total'}</span>
          <b>{txn ? money(paid > 0 ? Math.abs(due) : Math.abs(txn.totals.total)) : money(0)}</b>
        </div>
      </div>
    </aside>
  );
}
