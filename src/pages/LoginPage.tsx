import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Info, Lock, Monitor, Settings, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import NumPad from '../components/NumPad';
import { EagleMark } from '../components/Icon';
import { useSession } from '../state/session';
import { useSettings } from '../state/settings';
import { useSync } from '../sync/queue';
import { useCatalog } from '../state/catalog';
import { pos } from '../state/pos';
import { openCustomerDisplayWindow } from '../hardware/customerDisplay';
import { fmtTime, elapsedSince } from '../core/format';

export default function LoginPage() {
  const status = useSession((s) => s.status);
  const lockedBy = useSession((s) => s.employee);
  const shifts = useSession((s) => s.shifts);
  const { registerId, registerName } = useSettings();
  const online = useSync((s) => s.online);
  const queued = useSync((s) => s.queue.length);
  const store = useCatalog((s) => s.store);
  const categories = useCatalog((s) => s.categories);
  const products = useCatalog((s) => s.products);
  const nav = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const onBreak = Object.values(shifts).filter((s) => s.status === 'on_break');

  const submit = async () => {
    if (pin.length < 4 || busy) return;
    setBusy(true);
    const r = await pos.signInWithPin(pin);
    setBusy(false);
    setPin('');
    if (!r.ok) setError(r.error ?? 'Try again');
  };

  return (
    <div className="login">
      <aside className="login__side">
        <div className="login__brand">
          <EagleMark size={56} />
          <div>
            <h1>{store.name}</h1>
            <p>
              {store.address1}, {store.city} {store.province} · {store.phone}
            </p>
          </div>
        </div>
        <div className="login__hero">
          <h2>
            Fast at the till.
            <br />
            Accountable in the back office.
          </h2>
          <p>
            Every sale, void, discount, no-sale and break is recorded and streamed to the manager’s dashboard. When an associate goes on break, their segment closes automatically with a full report.
          </p>
          <div className="login__facts">
            <div className="card">
              <b>{categories.length} departments</b>
              <span>same keys as today: amount + category</span>
            </div>
            <div className="card">
              <b>{products.length} items</b>
              <span>barcodes, PLU & scale labels</span>
            </div>
            <div className="card">
              <b>HST-aware</b>
              <span>groceries zero-rated, taxed items flagged</span>
            </div>
          </div>
        </div>
        <div className="login__foot">
          <span>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />} {online ? 'Connected to back office' : 'Offline — working locally'}
            {queued > 0 && ` · ${queued} events queued`} · {registerId} {registerName}
          </span>
          <span style={{ display: 'flex', gap: 6 }}>
            <button className="key key--sm key--ghost" onClick={() => openCustomerDisplayWindow()}><Monitor size={14} /> Customer screen</button>
            <button className="key key--sm key--ghost" onClick={() => nav('/settings')}><Settings size={14} /> Settings</button>
            <button className="key key--sm key--ghost" onClick={() => nav('/about')}><Info size={14} /> About</button>
          </span>
        </div>
      </aside>
      <main className="login__main">
        <div className="login__card">
          {status === 'locked' && lockedBy ? (
            <>
              <h3><Lock size={18} style={{ verticalAlign: -3 }} /> Register locked</h3>
              <p className="sub">Locked by {lockedBy.firstName} {lockedBy.lastName}. Enter their PIN, or a supervisor PIN, to unlock.</p>
            </>
          ) : (
            <>
              <h3><ShieldCheck size={18} style={{ verticalAlign: -3 }} /> Associate sign-in</h3>
              <p className="sub">Enter your PIN to start a shift{onBreak.length ? ' or return from break' : ''}.</p>
            </>
          )}
          {onBreak.length > 0 && (
            <div className="break-list">
              {onBreak.map((s) => {
                const seg = s.segments[s.segments.length - 1];
                return (
                  <div className="break-item" key={s.id}>
                    <Coffee size={20} color="#f5b300" />
                    <div style={{ flex: 1 }}>
                      <b>{s.employeeName} is on break</b>
                      <span>since {fmtTime(seg?.endedAt)} · {seg?.endedAt ? elapsedSince(seg.endedAt) : ''} · enter PIN to resume</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="pin-dots">{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className={i < pin.length ? 'on' : ''} style={{ display: i >= 4 && pin.length <= 4 ? 'none' : 'block' }} />)}</div>
          <div className="pin-error">{error}</div>
          <NumPad value={pin} onChange={(v) => { setPin(v); setError(''); }} mode="pin" onEnter={() => void submit()} enterLabel={busy ? 'Checking…' : 'Sign in'} />
          <details className="demo-hint">
            <summary>Demo accounts</summary>
            <div style={{ marginTop: 6 }}>
              Cashiers: María <code>1234</code>, José <code>2468</code>, Ana <code>1357</code>, Carlos <code>4321</code> · Supervisor Luis <code>5150</code> · Manager <code>9999</code>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
