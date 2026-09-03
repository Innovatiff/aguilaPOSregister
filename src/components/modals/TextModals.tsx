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
import { fmtTime, plural, BARCODE_KIND_LABEL } from '../../core/format';

function useMoney() {
  const store = useCatalog((s) => s.store);
  return (n: number) => formatMoney(n, store.locale, store.currency);
}

export function HoldModal({ resolve }: { resolve: (label: string | null) => void }) {
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <ModalShell title="Poner venta en espera / referencia" subtitle="Opcional: nombre del cliente o una nota para recuperar la venta después." onClose={() => resolve(null)}>
      <input ref={ref} className="input" placeholder="p. ej. Cliente de la chamarra azul" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && resolve(v.trim())} />
      <div className="modal__actions">
        <button className="key key--ghost" onClick={() => resolve(null)}>Cancelar</button>
        <button className="key key--accent" onClick={() => resolve(v.trim())}>Confirmar</button>
      </div>
    </ModalShell>
  );
}

export function ReasonModal({ title, options, resolve }: { title: string; options: string[]; resolve: (r: string | null) => void }) {
  const [other, setOther] = useState('');
  return (
    <ModalShell title={title} subtitle="Seleccione un motivo — queda registrado y visible para el gerente." onClose={() => resolve(null)}>
      <div className="option-list">
        {options.filter((o) => o !== 'Otro').map((o) => (
          <button key={o} className="key key--sm" onClick={() => resolve(o)}>{o}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="Otro motivo…" value={other} onChange={(e) => setOther(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && other.trim() && resolve(other.trim())} />
        <button className="key key--sm" disabled={!other.trim()} onClick={() => resolve(other.trim())}>Usar</button>
      </div>
    </ModalShell>
  );
}

export function ConfirmModal({ title, message, danger, confirmLabel, resolve }: { title: string; message: string; danger?: boolean; confirmLabel?: string; resolve: (ok: boolean) => void }) {
  return (
    <ModalShell title={title} onClose={() => resolve(false)}>
      <p style={{ margin: 0, lineHeight: 1.5 }}>{message}</p>
      <div className="modal__actions">
        <button className="key key--ghost" onClick={() => resolve(false)}>Cancelar</button>
        <button className={`key ${danger ? 'key--danger' : 'key--accent'}`} onClick={() => resolve(true)}>{confirmLabel ?? 'Confirmar'}</button>
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
    <ModalShell title={<><AlertTriangle size={22} color="#f59e0b" /> Artículo no encontrado</>} subtitle={`El código ${parsed.raw} (${BARCODE_KIND_LABEL[parsed.kind] ?? parsed.kind}${parsed.valid ? '' : ', dígito verificador inválido'}) no está en el catálogo. Quedó registrado para el gerente. ¿Venderlo como artículo abierto?`} onClose={close} size="wide">
      <div className="option-list" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {categories.map((c) => (
          <button key={c.id} className={`key key--sm ${cat?.id === c.id ? 'key--active' : ''}`} style={{ borderLeft: `4px solid ${c.color}` }} onClick={() => setCat(c)}>{c.short}</button>
        ))}
      </div>
      <NumPad value={v} onChange={setV} mode="amount" hint={cat ? `Precio del artículo de ${cat.name}` : 'Elija un departamento y luego el precio'} formatAmount={money} onEnter={() => { const p = parseAmountBuffer(v); if (cat && p > 0) { pos.addOpenDepartment(cat, p); close(); } }} enterLabel="Agregar artículo abierto" />
    </ModalShell>
  );
}

export function ManualScanModal() {
  const close = useUI((s) => s.closeModal);
  const [v, setV] = useState('');
  return (
    <ModalShell title={<><ScanBarcode size={22} /> Ingresar un código de barras</>} subtitle="Escriba el UPC/EAN, un PLU o el código de una etiqueta de báscula (con precio incluido). Los escáneres físicos funcionan en cualquier momento sin esta pantalla." onClose={close}>
      <NumPad value={v} onChange={setV} mode="code" hint="Dígitos del código de barras" onEnter={() => { if (v) { close(); void pos.handleScan(v); } }} enterLabel="Registrar artículo" />
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
    <ModalShell title={<><Search size={22} /> Consultar precio</>} subtitle="Consulte un precio sin agregarlo a la venta. Escanear con el escáner físico también funciona aquí." onClose={close}>
      <div className="search">
        <Search size={16} color="#8f9cbb" />
        <input ref={ref} data-scan-target="true" placeholder="Nombre, PLU o código de barras" value={q} onChange={(e) => { setQ(e.target.value); setResult(undefined); }} onKeyDown={(e) => e.key === 'Enter' && q && lookup(q)} />
      </div>
      {result === null && <p className="pin-error">No encontrado</p>}
      {result && (
        <div className="card">
          <b style={{ fontSize: 18 }}>{result.name}</b>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f5b300' }}>{money(result.price)}{result.soldByWeight ? ' / kg' : ''}</div>
          <div className="muted">PLU {result.plu} · {result.barcode ?? 'sin código de barras'} · {result.taxable ? 'aplica HST' : 'sin impuesto'} · {result.stock} en existencia</div>
          <div className="modal__actions">
            <button className="key key--accent" onClick={() => { close(); void pos.addProduct(result, 'search'); }}>Agregar a la venta</button>
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
    <ModalShell title="Recuperar una venta en espera" subtitle={held.length ? 'Toque una venta para traerla de vuelta a la caja.' : 'No hay ventas en espera.'} onClose={close}>
      <div className="list">
        {held.map((h: Transaction) => (
          <button key={h.id} className="list-item" style={{ textAlign: 'left' }} onClick={() => pos.recall(h)}>
            <div>
              <b>{h.holdLabel}</b>
              <span>{h.number} · en espera desde {fmtTime(h.startedAt)} · {plural(h.lines.filter((l) => !l.voided).length, 'artículo')}</span>
            </div>
            <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{money(h.totals.total)}</span>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}
