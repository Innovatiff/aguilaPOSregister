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
import { fmtTime, fmtDateTime, plural, TENDER_LABEL, TXN_STATUS_LABEL } from '../core/format';
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
        <button className="key key--sm" onClick={() => nav('/')}><ArrowLeft size={16} /> Volver a la caja</button>
        <h1>Reportes</h1>
        <span className="muted">Registro local · administración tiene el historial completo</span>
      </header>
      <div className="page__body">
        {report && (
          <section className="card">
            <ClosingReport report={report} live />
            {myShift && myShift.segments.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <h4 className="label">Segmentos anteriores de este turno</h4>
                <div className="list">
                  {myShift.segments.filter((s) => s.report).map((s) => (
                    <button key={s.id} className="list-item" style={{ textAlign: 'left' }} onClick={() => s.report && open({ kind: 'closing-report', report: s.report, mode: 'view' })}>
                      <div><b>Segmento {s.index + 1} — cerrado por {s.endReason === 'break' ? 'descanso' : 'fin de turno'}</b><span>{fmtTime(s.startedAt)} → {fmtTime(s.endedAt)}</span></div>
                      <span className="mono">{s.report ? money(s.report.total) : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
        <section className="card">
          <h3><Receipt size={18} style={{ verticalAlign: -3 }} /> Transacciones de hoy en esta caja ({today.length})</h3>
          <table className="table">
            <thead>
              <tr><th>Recibo</th><th>Hora</th><th>Cajero/a</th><th>Artículos</th><th>Forma de pago</th><th>Estado</th><th>Total</th></tr>
            </thead>
            <tbody>
              {today.map((t) => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => open({ kind: 'receipt', txn: t, reprint: true })}>
                  <td className="mono">{t.number}</td>
                  <td>{fmtTime(t.completedAt ?? t.startedAt)}</td>
                  <td>{t.employeeName}</td>
                  <td>{t.totals.itemCount}{t.totals.returnCount ? ` (-${t.totals.returnCount})` : ''}</td>
                  <td>{t.tenders.map((x) => TENDER_LABEL[x.type]).join(', ') || '—'}</td>
                  <td><span className={`badge ${t.status === 'completed' ? 'badge--success' : t.status === 'voided' ? 'badge--danger' : ''}`}>{TXN_STATUS_LABEL[t.status] ?? t.status}</span></td>
                  <td>{money(t.totals.total)} <Printer size={12} /></td>
                </tr>
              ))}
              {today.length === 0 && <tr><td colSpan={7} className="muted">Aún no hay transacciones hoy.</td></tr>}
            </tbody>
          </table>
        </section>
        {closedToday.length > 0 && (
          <section className="card">
            <h3>Turnos cerrados hoy</h3>
            <div className="list">
              {closedToday.map((s) => (
                <button key={s.id} className="list-item" style={{ textAlign: 'left' }} onClick={() => s.closing && open({ kind: 'closing-report', report: s.closing.report, mode: 'view' })}>
                  <div><b>{s.employeeName}</b><span>{fmtDateTime(s.startedAt)} → {fmtTime(s.endedAt)} · {plural(s.segments.length, 'segmento')}</span></div>
                  <span className="mono">{s.closing ? `${money(s.closing.report.total)} · ${s.closing.overShort === 0 ? 'cuadrado' : `${s.closing.overShort > 0 ? 'sobrante' : 'faltante'} ${money(Math.abs(s.closing.overShort))}`}` : ''}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
