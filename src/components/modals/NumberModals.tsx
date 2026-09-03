import { useState } from 'react';
import { Scale } from 'lucide-react';
import ModalShell from './ModalShell';
import NumPad from '../NumPad';
import { useCatalog } from '../../state/catalog';
import { useCart } from '../../state/cart';
import { formatMoney, parseAmountBuffer, parseQtyBuffer, round3 } from '../../core/money';
import { buildPriceEmbedded } from '../../core/barcode';
import type { Employee, Product } from '../../core/types';

function useMoney() {
  const store = useCatalog((s) => s.store);
  return (n: number) => formatMoney(n, store.locale, store.currency);
}

export function QtyModal({ lineId, resolve }: { lineId: string; resolve: (q: number | null) => void }) {
  const line = useCart((s) => s.txn?.lines.find((l) => l.id === lineId));
  const [v, setV] = useState('');
  return (
    <ModalShell title="Cantidad" subtitle={line ? `${line.name} — actual ${line.qty}` : undefined} onClose={() => resolve(null)}>
      <NumPad value={v} onChange={setV} mode="qty" hint="Nueva cantidad" onEnter={() => resolve(parseQtyBuffer(v) || null)} enterLabel="Aplicar cantidad" />
    </ModalShell>
  );
}

export function WeightModal({ product, resolve }: { product: Product; resolve: (kg: number | null) => void }) {
  const money = useMoney();
  const [v, setV] = useState('');
  const kg = parseFloat(v) || 0;
  const label = buildPriceEmbedded(product.plu, round3(kg) * product.price);
  return (
    <ModalShell title={<><Scale size={22} color="#f5b300" /> Artículo por peso</>} subtitle={`${product.name} — ${money(product.price)} / kg`} onClose={() => resolve(null)}>
      <div className="option-list" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[0.25, 0.5, 1, 2].map((q) => (
          <button key={q} className="key key--sm" onClick={() => setV(String(q))}>{q} kg</button>
        ))}
      </div>
      <NumPad value={v} onChange={setV} mode="weight" hint={kg > 0 ? `= ${money(round3(kg) * product.price)}` : 'Ingrese el peso de la báscula'} onEnter={() => resolve(kg > 0 ? round3(kg) : null)} enterLabel="Agregar artículo" />
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>
        Consejo: las etiquetas de báscula (código de barras con precio incluido, p. ej. <span className="mono">{kg > 0 ? label : '2 02001 01250 x'}</span>) se pueden escanear directamente — la caja calcula el peso automáticamente.
      </p>
    </ModalShell>
  );
}

const PRICE_REASONS = ['Igualar precio', 'Empaque dañado', 'Etiqueta de anaquel distinta', 'Especial del gerente', 'Liquidación', 'Otro'];
export function PriceModal({ lineId, resolve }: { lineId: string; resolve: (v: { price: number; reason: string } | null) => void }) {
  const money = useMoney();
  const line = useCart((s) => s.txn?.lines.find((l) => l.id === lineId));
  const [v, setV] = useState('');
  const [reason, setReason] = useState(PRICE_REASONS[0]);
  return (
    <ModalShell title="Cambiar precio" subtitle={line ? `${line.name} — actual ${money(line.unitPrice)}` : undefined} onClose={() => resolve(null)}>
      <div className="option-list">
        {PRICE_REASONS.map((r) => (
          <button key={r} className={`key key--sm ${reason === r ? 'key--active' : ''}`} onClick={() => setReason(r)}>{r}</button>
        ))}
      </div>
      <NumPad value={v} onChange={setV} mode="amount" hint="Nuevo precio unitario" formatAmount={money} onEnter={() => { const p = parseAmountBuffer(v); if (p > 0) resolve({ price: p, reason }); }} enterLabel="Aplicar nuevo precio" />
    </ModalShell>
  );
}

const DISCOUNT_REASONS = ['Promoción del gerente', 'Dañado', 'Descuento de empleado', 'Igualar precio', 'Cliente frecuente', 'Próximo a caducar', 'Otro'];
export function DiscountModal({ target, mode, lineId, resolve }: { target: 'line' | 'txn'; mode: 'amount' | 'percent'; lineId?: string; resolve: (v: { value: number; reason: string } | null) => void }) {
  const money = useMoney();
  const line = useCart((s) => (lineId ? s.txn?.lines.find((l) => l.id === lineId) : undefined));
  const [v, setV] = useState('');
  const [reason, setReason] = useState(DISCOUNT_REASONS[0]);
  const quick = mode === 'percent' ? [5, 10, 15, 20, 25, 50] : [1, 2, 5, 10];
  return (
    <ModalShell title={`Descuento ${mode === 'percent' ? '%' : '$'} en ${target === 'line' ? 'el artículo' : 'toda la venta'}`} subtitle={line ? line.name : 'Se aplica al subtotal de la venta'} onClose={() => resolve(null)}>
      <div className="option-list" style={{ gridTemplateColumns: `repeat(${quick.length}, 1fr)` }}>
        {quick.map((q) => (
          <button key={q} className="key key--sm" onClick={() => setV(mode === 'percent' ? String(q) : String(q * 100))}>{mode === 'percent' ? `${q}%` : money(q)}</button>
        ))}
      </div>
      <div className="option-list">
        {DISCOUNT_REASONS.map((r) => (
          <button key={r} className={`key key--sm ${reason === r ? 'key--active' : ''}`} onClick={() => setReason(r)}>{r}</button>
        ))}
      </div>
      <NumPad value={v} onChange={setV} mode={mode === 'percent' ? 'qty' : 'amount'} hint={mode === 'percent' ? 'Porcentaje de descuento' : 'Monto de descuento'} formatAmount={money} onEnter={() => { const n = mode === 'percent' ? parseQtyBuffer(v) : parseAmountBuffer(v); if (n > 0) resolve({ value: n, reason }); }} enterLabel="Aplicar descuento" />
    </ModalShell>
  );
}

export function AmountModal({ title, subtitle, withReason, options, resolve }: { title: string; subtitle?: string; withReason?: boolean; options?: string[]; resolve: (v: { amount: number; reason: string } | null) => void }) {
  const money = useMoney();
  const [v, setV] = useState('');
  const [reason, setReason] = useState(options?.[0] ?? '');
  return (
    <ModalShell title={title} subtitle={subtitle} onClose={() => resolve(null)}>
      {withReason && options && (
        <div className="option-list">
          {options.map((r) => (
            <button key={r} className={`key key--sm ${reason === r ? 'key--active' : ''}`} onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
      )}
      <NumPad value={v} onChange={setV} mode="amount" hint="Monto" formatAmount={money} onEnter={() => { const n = parseAmountBuffer(v); if (n > 0) resolve({ amount: n, reason }); }} enterLabel="Confirmar" />
    </ModalShell>
  );
}

export function OpeningFloatModal({ employee, resolve }: { employee: Employee; resolve: (amount: number | null) => void }) {
  const money = useMoney();
  const store = useCatalog((s) => s.store);
  const [v, setV] = useState(String(Math.round(store.openingFloat * 100)));
  return (
    <ModalShell title={`Iniciar turno — ${employee.firstName}`} subtitle="Cuente el fondo inicial en el cajón. Esto inicia su turno y su primer segmento." onClose={() => resolve(null)}>
      <div className="option-list" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[100, 150, 200, 300].map((q) => (
          <button key={q} className="key key--sm" onClick={() => setV(String(q * 100))}>{money(q)}</button>
        ))}
      </div>
      <NumPad value={v} onChange={setV} mode="amount" hint="Fondo inicial" formatAmount={money} onEnter={() => resolve(parseAmountBuffer(v))} enterLabel="Iniciar turno" />
    </ModalShell>
  );
}
