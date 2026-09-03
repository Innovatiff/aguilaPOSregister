import { useMemo, useState } from 'react';
import { LogOut } from 'lucide-react';
import ModalShell from './ModalShell';
import { useUI } from '../../state/ui';
import { useCatalog } from '../../state/catalog';
import { pos } from '../../state/pos';
import { formatMoney, round2 } from '../../core/money';

const DENOMS: Array<[string, number]> = [['$100', 100], ['$50', 50], ['$20', 20], ['$10', 10], ['$5', 5], ['$2', 2], ['$1', 1], ['25¢', 0.25], ['10¢', 0.1], ['5¢', 0.05]];

export default function EndShiftModal() {
  const close = useUI((s) => s.closeModal);
  const store = useCatalog((s) => s.store);
  const money = (n: number) => formatMoney(n, store.locale, store.currency);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [manual, setManual] = useState('');
  const [notes, setNotes] = useState('');
  const [reveal, setReveal] = useState(false);
  const counted = useMemo(() => (manual ? parseFloat(manual) || 0 : round2(DENOMS.reduce((a, [k, v]) => a + (counts[k] ?? 0) * v, 0))), [counts, manual]);
  const expected = reveal ? (pos.buildSegmentReportNow()?.cash.expectedInDrawer ?? null) : null;
  const set = (k: string, v: number) => setCounts((c) => ({ ...c, [k]: Math.max(0, v) }));
  return (
    <ModalShell size="wide" title={<><LogOut size={22} color="#f5b300" /> End shift — count the drawer</>} subtitle="Blind count: enter how many of each you have. The Z report is generated and sent to the back office when you close." onClose={close}>
      <div className="form-grid">
        <div className="card">
          <h4>Denominations</h4>
          <table className="table">
            <tbody>
              {DENOMS.map(([k, v]) => (
                <tr key={k}>
                  <td style={{ width: 60 }}>{k}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button className="key key--sm" style={{ minHeight: 34, minWidth: 34 }} onClick={() => set(k, (counts[k] ?? 0) - 1)}>−</button>
                      <input className="input" style={{ width: 70, textAlign: 'center', padding: '6px 4px' }} type="number" min={0} value={counts[k] ?? ''} placeholder="0" onChange={(e) => set(k, parseInt(e.target.value || '0', 10))} />
                      <button className="key key--sm" style={{ minHeight: 34, minWidth: 34 }} onClick={() => set(k, (counts[k] ?? 0) + 1)}>+</button>
                    </div>
                  </td>
                  <td>{money((counts[k] ?? 0) * v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <div className="card">
            <h4>Or enter the total counted</h4>
            <input className="input" type="number" step="0.01" placeholder="e.g. 612.35" value={manual} onChange={(e) => setManual(e.target.value)} />
          </div>
          <div className="kpi">
            <span>Counted cash</span>
            <b>{money(counted)}</b>
          </div>
          <div className="card">
            <h4>Expected in drawer</h4>
            {expected === null ? (
              <button className="key key--sm" onClick={() => setReveal(true)}>Reveal expected (supervisor view)</button>
            ) : (
              <div>
                <b style={{ fontSize: 20 }}>{money(expected)}</b>
                <div className={`muted`} style={{ color: round2(counted - expected) === 0 ? '#86efac' : '#fca5a5' }}>
                  {round2(counted - expected) === 0 ? 'Balanced' : `${counted - expected > 0 ? 'Over' : 'Short'} ${money(Math.abs(round2(counted - expected)))}`}
                </div>
              </div>
            )}
          </div>
          <div className="form-row">
            <label className="label">Notes for the manager</label>
            <textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything unusual during the shift…" />
          </div>
        </div>
      </div>
      <div className="modal__actions">
        <button className="key key--ghost" onClick={close}>Cancel</button>
        <button className="key key--danger key--lg" onClick={() => pos.finalizeShift(counted, counts, notes)}>
          <LogOut size={18} /> Close shift & send Z report
        </button>
      </div>
    </ModalShell>
  );
}
