import { useEffect, useState } from 'react';
import { EagleMark } from '../components/Icon';
import { subscribeDisplay, type DisplayState } from '../hardware/customerDisplay';
import { formatMoney, fixed2 } from '../core/money';

const PROMOS = [
  { title: 'Fresh produce daily', text: 'Avocados, limes, tomatillos & more' },
  { title: 'Carnicería', text: 'Carne asada, al pastor & chorizo cut fresh' },
  { title: 'Fiesta ready', text: 'Piñatas, candy fillers & Lotería' },
];

export default function CustomerDisplayPage() {
  const [s, setS] = useState<DisplayState | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    document.title = 'El Aguila — Customer display';
    const t = setInterval(() => setNow(new Date()), 1000);
    const off = subscribeDisplay(setS);
    return () => {
      clearInterval(t);
      off();
    };
  }, []);
  const money = (n: number) => formatMoney(n, 'en-CA', 'CAD');
  const idle = !s || s.phase === 'idle' || (s.phase === 'complete' && Date.now() - Date.parse(s.updatedAt) > 20000);
  return (
    <div className="cd">
      <header className="cd__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <EagleMark size={44} />
          <h1>{s?.storeName ?? 'El Aguila Market'}</h1>
        </div>
        <span>{now.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}</span>
      </header>
      {idle ? (
        <div className="cd__idle">
          <div>
            <h2>¡Bienvenidos!</h2>
            <p>{s?.message ?? 'Welcome to El Aguila Market'}</p>
            <div className="cd__promo">
              {PROMOS.map((p) => (
                <div className="card" key={p.title}>
                  <b>{p.title}</b>
                  <span>{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="cd__body">
          <div className="cd__lines">
            {s.lines.map((l) => (
              <div className={`cd__line ${l.isReturn ? 'is-return' : ''}`} key={l.id}>
                <div>{l.isReturn ? 'RETURN · ' : ''}{l.name}</div>
                <div className="amt">{fixed2(l.extended)}</div>
                <small>
                  {l.unit === 'kg' ? `${l.qty.toFixed(3)} kg × ${fixed2(l.unitPrice)}/kg` : `${l.qty} × ${fixed2(l.unitPrice)}`}
                  {l.discount ? ` · discount ${l.discount.type === 'percent' ? `${l.discount.value}%` : fixed2(l.discount.value)}` : ''}
                </small>
              </div>
            ))}
            {s.lines.length === 0 && <p className="muted">Waiting for items…</p>}
          </div>
          <div className="cd__totals">
            {s.phase === 'terminal' && <div className="cd__message">{s.message}</div>}
            {s.phase === 'complete' && <div className="cd__message">{s.message ?? 'Thank you!'}</div>}
            {s.totals && (
              <>
                <div className="row"><span>Items</span><b>{s.totals.itemCount}</b></div>
                <div className="row"><span>Subtotal</span><b>{fixed2(s.totals.subtotal)}</b></div>
                {s.totals.txnDiscount > 0 && <div className="row"><span>Discount</span><b>-{fixed2(s.totals.txnDiscount)}</b></div>}
                <div className="row"><span>HST 13%</span><b>{fixed2(s.totals.tax)}</b></div>
                {s.tenders.map((t) => (
                  <div className="row" key={t.id}><span>Paid · {t.type}</span><b>{fixed2(t.amount)}</b></div>
                ))}
                <div className={`cd__total ${s.phase === 'complete' && s.changeDue > 0 ? 'is-change' : ''}`}>
                  <span>{s.phase === 'complete' ? (s.changeDue > 0 ? 'Your change' : 'Paid') : s.tenders.length ? 'Balance' : 'Total'}</span>
                  <b>{money(s.phase === 'complete' ? (s.changeDue > 0 ? s.changeDue : s.totals.total) : s.tenders.length ? Math.max(0, s.balanceDue) : s.totals.total)}</b>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <footer className="cd__footer">
        <span>Register {s?.registerId ?? ''}{s?.cashierName ? ` · Your cashier today: ${s.cashierName}` : ''}</span>
        <span>Returns within 14 days with receipt · Gracias por su compra</span>
      </footer>
    </div>
  );
}
