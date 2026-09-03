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
            {r.scope === 'shift' ? 'Shift closing (Z) report' : live ? 'Current segment (X) report' : 'Segment closing report'}
          </h2>
          <div className="meta">
            {r.employeeName} · Register {r.registerId} · {fmtDateTime(r.startedAt)} → {live ? 'now' : fmtDateTime(r.endedAt)} · {fmtDuration(r.durationMin)}
          </div>
        </div>
        <button className="key key--sm" onClick={() => printText(closingReportText(r, store.name), 'Closing report')}>
          <Printer size={16} /> Print
        </button>
      </div>
      <div className="kpis">
        <div className="kpi"><span>Total collected</span><b>{money(r.total)}</b></div>
        <div className="kpi"><span>Transactions</span><b>{r.transactions}</b></div>
        <div className="kpi"><span>Items sold</span><b>{r.itemsSold}</b></div>
        <div className="kpi"><span>Average basket</span><b>{money(r.averageBasket)}</b></div>
        <div className="kpi"><span>HST collected</span><b>{money(r.tax)}</b></div>
        <div className={`kpi ${r.voids.lines + r.voids.transactions > 0 ? 'is-warn' : ''}`}><span>Voids</span><b>{r.voids.lines + r.voids.transactions}</b></div>
        <div className={`kpi ${r.noSales > 0 ? 'is-warn' : ''}`}><span>No sales</span><b>{r.noSales}</b></div>
        {closing && (
          <div className={`kpi ${closing.overShort === 0 ? 'is-good' : 'is-bad'}`}>
            <span>Drawer over / short</span>
            <b>{closing.overShort === 0 ? 'Balanced' : `${closing.overShort > 0 ? '+' : '-'}${money(Math.abs(closing.overShort))}`}</b>
          </div>
        )}
      </div>
      <div className="report__cols">
        <div className="card">
          <h4>Sales</h4>
          <table className="table">
            <tbody>
              <tr><td>Gross sales</td><td>{money(r.grossSales)}</td></tr>
              <tr><td>Item discounts</td><td className={r.lineDiscounts ? 'warn' : ''}>-{money(r.lineDiscounts)}</td></tr>
              <tr><td>Sale discounts</td><td className={r.txnDiscounts ? 'warn' : ''}>-{money(r.txnDiscounts)}</td></tr>
              <tr><td>Returns</td><td className={r.returns ? 'warn' : ''}>-{money(r.returns)}</td></tr>
              <tr><td>Net sales</td><td>{money(r.netSales)}</td></tr>
              <tr><td>HST 13%</td><td>{money(r.tax)}</td></tr>
              <tr className="total"><td>Total collected</td><td>{money(r.total)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Tenders</h4>
          <table className="table">
            <tbody>
              {Object.entries(r.tenders).map(([k, v]) => v && (
                <tr key={k}><td>{TENDER_LABEL[k] ?? k} <span className="muted">×{v.count}</span></td><td>{money(v.amount)}</td></tr>
              ))}
              {Object.keys(r.tenders).length === 0 && <tr><td className="muted">No payments yet</td><td /></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Cash drawer</h4>
          <table className="table">
            <tbody>
              <tr><td>Opening float</td><td>{money(r.cash.openingFloat)}</td></tr>
              <tr><td>Cash tendered</td><td>{money(r.cash.cashTendered)}</td></tr>
              <tr><td>Change given</td><td>-{money(r.cash.changeGiven)}</td></tr>
              <tr><td>Cash refunds</td><td>-{money(r.cash.cashRefunds)}</td></tr>
              <tr><td>Cash drops</td><td>-{money(r.cash.drops)}</td></tr>
              <tr><td>Paid outs</td><td>-{money(r.cash.paidOuts)}</td></tr>
              <tr className="total"><td>Expected in drawer</td><td>{money(r.cash.expectedInDrawer)}</td></tr>
              {closing && (
                <>
                  <tr><td>Counted</td><td>{money(closing.countedCash)}</td></tr>
                  <tr className="total"><td>Over / short</td><td className={closing.overShort === 0 ? '' : 'bad'}>{closing.overShort >= 0 ? '+' : '-'}{money(Math.abs(closing.overShort))}</td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Activity</h4>
          <table className="table">
            <tbody>
              <tr><td>Voided items</td><td className={r.voids.lines ? 'warn' : ''}>{r.voids.lines} · {money(r.voids.linesValue)}</td></tr>
              <tr><td>Voided sales</td><td className={r.voids.transactions ? 'warn' : ''}>{r.voids.transactions} · {money(r.voids.transactionsValue)}</td></tr>
              <tr><td>No sales (drawer opened)</td><td className={r.noSales ? 'warn' : ''}>{r.noSales}</td></tr>
              <tr><td>Price overrides</td><td>{r.priceOverrides}</td></tr>
              <tr><td>Discounts applied</td><td>{r.discountsApplied}</td></tr>
              <tr><td>Manager approvals</td><td>{r.managerOverrides}</td></tr>
              <tr><td>Unknown barcodes</td><td>{r.scanUnknown}</td></tr>
              <tr><td>Sales put on hold</td><td>{r.holds}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Sales by category</h4>
          {r.byCategory.length === 0 && <p className="muted">No sales yet.</p>}
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
          <h4>Top items</h4>
          <table className="table">
            <tbody>
              {r.topItems.map((t) => (
                <tr key={t.name}><td>{t.qty}× {t.name}</td><td>{money(t.amount)}</td></tr>
              ))}
              {r.topItems.length === 0 && <tr><td className="muted">No items yet</td><td /></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
