import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ScanBarcode, Search } from 'lucide-react';
import ModalShell from './ModalShell';
import NumPad from '../NumPad';
import { useCatalog, findProductByBarcode, findProductByPlu, searchProducts } from '../../state/catalog';
import { useCart } from '../../state/cart';
import { useUI } from '../../state/ui';
import { pos } from '../../state/pos';
import { formatMoney, parseAmountBuffer } from '../../core/money';
import type { ParsedBarcode } from '../../core/barcode';
import type { Category, Product, Transaction } from '../../core/types';
import { fmtTime } from '../../core/format';

function useMoney() {
  const store = useCatalog((s) => s.store);
  return (n: number) => formatMoney(n, store.locale, store.currency);
}

export function HoldModal({ resolve }: { resolve: (label: string | null) => void }) {
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <ModalShell title="Hold sale / reference" subtitle="Optional: customer name or note so the sale can be recalled later." onClose={() => resolve(null)}>
      <input ref={ref} className="input" placeholder="e.g. Customer with the blue jacket" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && resolve(v.trim())} />
      <div className="modal__actions">
        <button className="key key--ghost" onClick={() => resolve(null)}>Cancel</button>
        <button className="key key--accent" onClick={() => resolve(v.trim())}>Confirm</button>
      </div>
    </ModalShell>
  );
}

export function ReasonModal({ title, options, resolve }: { title: string; options: string[]; resolve: (r: string | null) => void }) {
  const [other, setOther] = useState('');
  return (
    <ModalShell title={title} subtitle="Select a reason — it is recorded and visible to the manager." onClose={() => resolve(null)}>
      <div className="option-list">
        {options.filter((o) => o !== 'Other').map((o) => (
          <button key={o} className="key key--sm" onClick={() => resolve(o)}>{o}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="Other reason…" value={other} onChange={(e) => setOther(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && other.trim() && resolve(other.trim())} />
        <button className="key key--sm" disabled={!other.trim()} onClick={() => resolve(other.trim())}>Use</button>
      </div>
    </ModalShell>
  );
}

export function ConfirmModal({ title, message, danger, confirmLabel, resolve }: { title: string; message: string; danger?: boolean; confirmLabel?: string; resolve: (ok: boolean) => void }) {
  return (
    <ModalShell title={title} onClose={() => resolve(false)}>
      <p style={{ margin: 0, lineHeight: 1.5 }}>{message}</p>
      <div className="modal__actions">
        <button className="key key--ghost" onClick={() => resolve(false)}>Cancel</button>
        <button className={`key ${danger ? 'key--danger' : 'key--accent'}`} onClick={() => resolve(true)}>{confirmLabel ?? 'Confirm'}</button>
      </div>
    </ModalShell>
  );
}

export function UnknownBarcodeModal({ parsed }: { parsed: ParsedBarcode }) {
  const money = useMoney();
  const categories = useCatalog((s) => s.categories);
  const close = useUI((s) => s.closeModal);
  const [cat, setCat] = useState<Category | null>(null);
  const [v, setV] = useState('');
  return (
    <ModalShell title={<><AlertTriangle size={22} color="#f59e0b" /> Item not found</>} subtitle={`Code ${parsed.raw} (${parsed.kind}${parsed.valid ? '' : ', invalid check digit'}) is not in the catalog. It was logged for the manager. Sell it as an open item?`} onClose={close} size="wide">
      <div className="option-list" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {categories.map((c) => (
          <button key={c.id} className={`key key--sm ${cat?.id === c.id ? 'key--active' : ''}`} style={{ borderLeft: `4px solid ${c.color}` }} onClick={() => setCat(c)}>{c.short}</button>
        ))}
      </div>
      <NumPad value={v} onChange={setV} mode="amount" hint={cat ? `Price for ${cat.name} item` : 'Pick a department, then the price'} formatAmount={money} onEnter={() => { const p = parseAmountBuffer(v); if (cat && p > 0) { pos.addOpenDepartment(cat, p); close(); } }} enterLabel="Add open item" />
    </ModalShell>
  );
}

export function ManualScanModal() {
  const close = useUI((s) => s.closeModal);
  const [v, setV] = useState('');
  return (
    <ModalShell title={<><ScanBarcode size={22} /> Enter a barcode</>} subtitle="Type the UPC/EAN, a PLU, or a scale label (price-embedded) code. Physical scanners work anytime without this screen." onClose={close}>
      <NumPad value={v} onChange={setV} mode="code" hint="Barcode digits" onEnter={() => { if (v) { close(); void pos.handleScan(v); } }} enterLabel="Ring item" />
    </ModalShell>
  );
}

export function PriceLookupModal() {
  const money = useMoney();
  const close = useUI((s) => s.closeModal);
  const [q, setQ] = useState('');
  const [result, setResult] = useState<Product | null | undefined>(undefined);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const matches = q ? searchProducts(q, 8) : [];
  const lookup = (code: string) => {
    const p = findProductByBarcode(code) ?? findProductByPlu(code) ?? searchProducts(code, 1)[0] ?? null;
    setResult(p);
    pos.logPriceLookup(code, p ?? undefined);
  };
  return (
    <ModalShell title={<><Search size={22} /> Price look-up</>} subtitle="Check a price without adding it to the sale. Scanning with the physical scanner also works here." onClose={close}>
      <div className="search">
        <Search size={16} color="#8f9cbb" />
        <input ref={ref} data-scan-target="true" placeholder="Name, PLU or barcode" value={q} onChange={(e) => { setQ(e.target.value); setResult(undefined); }} onKeyDown={(e) => e.key === 'Enter' && q && lookup(q)} />
      </div>
      {result === null && <p className="pin-error">Not found</p>}
      {result && (
        <div className="card">
          <b style={{ fontSize: 18 }}>{result.name}</b>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f5b300' }}>{money(result.price)}{result.soldByWeight ? ' / kg' : ''}</div>
          <div className="muted">PLU {result.plu} · {result.barcode ?? 'no barcode'} · {result.taxable ? 'HST applies' : 'no tax'} · {result.stock} in stock</div>
          <div className="modal__actions">
            <button className="key key--accent" onClick={() => { close(); void pos.addProduct(result, 'search'); }}>Add to sale</button>
          </div>
        </div>
      )}
      {!result && matches.length > 0 && (
        <div className="list">
          {matches.map((p) => (
            <button key={p.id} className="list-item" onClick={() => lookup(p.plu)} style={{ textAlign: 'left' }}>
              <div><b>{p.name}</b><span>PLU {p.plu}</span></div>
              <span className="mono">{money(p.price)}{p.soldByWeight ? '/kg' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

export function RecallModal() {
  const money = useMoney();
  const held = useCart((s) => s.held);
  const close = useUI((s) => s.closeModal);
  return (
    <ModalShell title="Recall a held sale" subtitle={held.length ? 'Tap a sale to bring it back to the register.' : 'No sales on hold.'} onClose={close}>
      <div className="list">
        {held.map((h: Transaction) => (
          <button key={h.id} className="list-item" style={{ textAlign: 'left' }} onClick={() => pos.recall(h)}>
            <div>
              <b>{h.holdLabel}</b>
              <span>{h.number} · held {fmtTime(h.startedAt)} · {h.lines.filter((l) => !l.voided).length} items</span>
            </div>
            <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{money(h.totals.total)}</span>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}
