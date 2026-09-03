import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Receipt } from 'lucide-react';
import ClosingReport from '../components/ClosingReport';
import { pos } from '../state/pos';
import { useJournal } from '../state/journal';
import { useUI } from '../state/ui';
import { useCatalog } from '../state/catalog';
import { useSession } from '../state/session';
import { formatMoney } from '../core/money';
import { fmtTime, fmtDateTime, TENDER_LABEL } from '../core/format';
import type { SegmentReport } from '../core/types';

export default function ReportsPage() {
  const nav = useNavigate();
  const journal = useJournal();
  const store = useCatalog((s) => s.store);
  const employee = useSession((s) => s.employee);
  const shifts = useSession((s) => s.shifts);
  const open = useUI((s) => s.openModal);
  const money = (n: number) => formatMoney(n, store.locale, store.currency);
  const [report, setReport] = useState<SegmentReport | null>(null);
  useEffect(() => {
    const tick = () => setReport(pos.buildSegmentReportNow());
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, [journal.transactions.length, journal.events.length]);
  const todayKey = new Date().toDateString();
  const today = journal.transactions.filter((t) => new Date(t.startedAt).toDateString() === todayKey).slice().reverse();
  const myShift = employee ? shifts[employee.id] : null;
  const closedToday = journal.closedShifts.filter((s) => new Date(s.startedAt).toDateString() === todayKey);
  return (
    <div className="page">
      <header className="page__header">
        <button className="key key--sm" onClick={() => nav('/')}><ArrowLeft size={16} /> Back to register</button>
        <h1>Reports</h1>
        <span className="muted">Local journal · the back office has the full history</span>
      </header>
      <div className="page__body">
        {report && (
          <section className="card">
            <ClosingReport report={report} live />
            {myShift && myShift.segments.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <h4 className="label">Earlier segments this shift</h4>
                <div className="list">
                  {myShift.segments.filter((s) => s.report).map((s) => (
                    <button key={s.id} className="list-item" style={{ textAlign: 'left' }} onClick={() => s.report && open({ kind: 'closing-report', report: s.report, mode: 'view' })}>
                      <div><b>Segment {s.index + 1} — closed for {s.endReason === 'break' ? 'break' : 'end of shift'}</b><span>{fmtTime(s.startedAt)} → {fmtTime(s.endedAt)}</span></div>
                      <span className="mono">{s.report ? money(s.report.total) : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
        <section className="card">
          <h3><Receipt size={18} style={{ verticalAlign: -3 }} /> Today’s transactions on this register ({today.length})</h3>
          <table className="table">
            <thead>
              <tr><th>Receipt</th><th>Time</th><th>Cashier</th><th>Items</th><th>Tender</th><th>Status</th><th>Total</th></tr>
            </thead>
            <tbody>
              {today.map((t) => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => open({ kind: 'receipt', txn: t, reprint: true })}>
                  <td className="mono">{t.number}</td>
                  <td>{fmtTime(t.completedAt ?? t.startedAt)}</td>
                  <td>{t.employeeName}</td>
                  <td>{t.totals.itemCount}{t.totals.returnCount ? ` (-${t.totals.returnCount})` : ''}</td>
                  <td>{t.tenders.map((x) => TENDER_LABEL[x.type]).join(', ') || '—'}</td>
                  <td><span className={`badge ${t.status === 'completed' ? 'badge--success' : t.status === 'voided' ? 'badge--danger' : ''}`}>{t.status}</span></td>
                  <td>{money(t.totals.total)} <Printer size={12} /></td>
                </tr>
              ))}
              {today.length === 0 && <tr><td colSpan={7} className="muted">No transactions yet today.</td></tr>}
            </tbody>
          </table>
        </section>
        {closedToday.length > 0 && (
          <section className="card">
            <h3>Closed shifts today</h3>
            <div className="list">
              {closedToday.map((s) => (
                <button key={s.id} className="list-item" style={{ textAlign: 'left' }} onClick={() => s.closing && open({ kind: 'closing-report', report: s.closing.report, mode: 'view' })}>
                  <div><b>{s.employeeName}</b><span>{fmtDateTime(s.startedAt)} → {fmtTime(s.endedAt)} · {s.segments.length} segments</span></div>
                  <span className="mono">{s.closing ? `${money(s.closing.report.total)} · ${s.closing.overShort === 0 ? 'balanced' : `${s.closing.overShort > 0 ? 'over' : 'short'} ${money(Math.abs(s.closing.overShort))}`}` : ''}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
