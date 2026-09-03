import { Printer } from 'lucide-react';
import type { SegmentReport } from '../core/types';
import { formatMoney } from '../core/money';
import { fmtDateTime, fmtDuration, TENDER_LABEL } from '../core/format';
import { closingReportText } from '../core/reportText';
import { printText } from '../hardware/printer';
import { useCatalog } from '../state/catalog';

interface Props {
  report: SegmentReport;
  closing?: { countedCash: number; expectedCash: number; overShort: number } | null;
  live?: boolean;
}

export default function ClosingReport({ report: r, closing, live }: Props) {
  const store = useCatalog((s) => s.store);
  const money = (n: number) => formatMoney(n, store.locale, store.currency);
  const maxCat = Math.max(1, ...r.byCategory.map((c) => Math.abs(c.amount)));
  return (
    <div className="report">
      <div className="report__head">
        <div>
          <h2>
            {r.scope === 'shift' ? 'Reporte de cierre de turno (Z)' : live ? 'Reporte del segmento actual (X)' : 'Reporte de cierre de segmento'}
          </h2>
          <div className="meta">
            {r.employeeName} · Caja {r.registerId} · {fmtDateTime(r.startedAt)} → {live ? 'ahora' : fmtDateTime(r.endedAt)} · {fmtDuration(r.durationMin)}
          </div>
        </div>
        <button className="key key--sm" onClick={() => printText(closingReportText(r, store.name), 'Reporte de cierre')}>
          <Printer size={16} /> Imprimir
        </button>
      </div>
      <div className="kpis">
        <div className="kpi"><span>Total cobrado</span><b>{money(r.total)}</b></div>
        <div className="kpi"><span>Transacciones</span><b>{r.transactions}</b></div>
        <div className="kpi"><span>Artículos vendidos</span><b>{r.itemsSold}</b></div>
        <div className="kpi"><span>Ticket promedio</span><b>{money(r.averageBasket)}</b></div>
        <div className="kpi"><span>HST cobrado</span><b>{money(r.tax)}</b></div>
        <div className={`kpi ${r.voids.lines + r.voids.transactions > 0 ? 'is-warn' : ''}`}><span>Anulaciones</span><b>{r.voids.lines + r.voids.transactions}</b></div>
        <div className={`kpi ${r.noSales > 0 ? 'is-warn' : ''}`}><span>Sin venta</span><b>{r.noSales}</b></div>
        {closing && (
          <div className={`kpi ${closing.overShort === 0 ? 'is-good' : 'is-bad'}`}>
            <span>Sobrante / faltante del cajón</span>
            <b>{closing.overShort === 0 ? 'Cuadrado' : `${closing.overShort > 0 ? '+' : '-'}${money(Math.abs(closing.overShort))}`}</b>
          </div>
        )}
      </div>
      <div className="report__cols">
        <div className="card">
          <h4>Ventas</h4>
          <table className="table">
            <tbody>
              <tr><td>Ventas brutas</td><td>{money(r.grossSales)}</td></tr>
              <tr><td>Descuentos en artículos</td><td className={r.lineDiscounts ? 'warn' : ''}>-{money(r.lineDiscounts)}</td></tr>
              <tr><td>Descuentos en ventas</td><td className={r.txnDiscounts ? 'warn' : ''}>-{money(r.txnDiscounts)}</td></tr>
              <tr><td>Devoluciones</td><td className={r.returns ? 'warn' : ''}>-{money(r.returns)}</td></tr>
              <tr><td>Ventas netas</td><td>{money(r.netSales)}</td></tr>
              <tr><td>HST 13%</td><td>{money(r.tax)}</td></tr>
              <tr className="total"><td>Total cobrado</td><td>{money(r.total)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Formas de pago</h4>
          <table className="table">
            <tbody>
              {Object.entries(r.tenders).map(([k, v]) => v && (
                <tr key={k}><td>{TENDER_LABEL[k] ?? k} <span className="muted">×{v.count}</span></td><td>{money(v.amount)}</td></tr>
              ))}
              {Object.keys(r.tenders).length === 0 && <tr><td className="muted">Aún no hay pagos</td><td /></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Cajón de efectivo</h4>
          <table className="table">
            <tbody>
              <tr><td>Fondo inicial</td><td>{money(r.cash.openingFloat)}</td></tr>
              <tr><td>Efectivo recibido</td><td>{money(r.cash.cashTendered)}</td></tr>
              <tr><td>Cambio entregado</td><td>-{money(r.cash.changeGiven)}</td></tr>
              <tr><td>Reembolsos en efectivo</td><td>-{money(r.cash.cashRefunds)}</td></tr>
              <tr><td>Depósitos a caja fuerte</td><td>-{money(r.cash.drops)}</td></tr>
              <tr><td>Pagos de gastos</td><td>-{money(r.cash.paidOuts)}</td></tr>
              <tr className="total"><td>Esperado en el cajón</td><td>{money(r.cash.expectedInDrawer)}</td></tr>
              {closing && (
                <>
                  <tr><td>Contado</td><td>{money(closing.countedCash)}</td></tr>
                  <tr className="total"><td>Sobrante / faltante</td><td className={closing.overShort === 0 ? '' : 'bad'}>{closing.overShort >= 0 ? '+' : '-'}{money(Math.abs(closing.overShort))}</td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Actividad</h4>
          <table className="table">
            <tbody>
              <tr><td>Artículos anulados</td><td className={r.voids.lines ? 'warn' : ''}>{r.voids.lines} · {money(r.voids.linesValue)}</td></tr>
              <tr><td>Ventas anuladas</td><td className={r.voids.transactions ? 'warn' : ''}>{r.voids.transactions} · {money(r.voids.transactionsValue)}</td></tr>
              <tr><td>Sin venta (cajón abierto)</td><td className={r.noSales ? 'warn' : ''}>{r.noSales}</td></tr>
              <tr><td>Cambios de precio</td><td>{r.priceOverrides}</td></tr>
              <tr><td>Descuentos aplicados</td><td>{r.discountsApplied}</td></tr>
              <tr><td>Aprobaciones de gerente</td><td>{r.managerOverrides}</td></tr>
              <tr><td>Códigos desconocidos</td><td>{r.scanUnknown}</td></tr>
              <tr><td>Ventas en espera</td><td>{r.holds}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Ventas por categoría</h4>
          {r.byCategory.length === 0 && <p className="muted">Aún no hay ventas.</p>}
          {r.byCategory.map((c) => (
            <div key={c.categoryId} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{c.name} <span className="muted">({c.qty})</span></span>
                <span className="mono">{money(c.amount)}</span>
              </div>
              <div className="bar"><i style={{ width: `${(Math.abs(c.amount) / maxCat) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="card">
          <h4>Artículos más vendidos</h4>
          <table className="table">
            <tbody>
              {r.topItems.map((t) => (
                <tr key={t.name}><td>{t.qty}× {t.name}</td><td>{money(t.amount)}</td></tr>
              ))}
              {r.topItems.length === 0 && <tr><td className="muted">Aún no hay artículos</td><td /></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
