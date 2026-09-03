import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Lock, Menu, Monitor, FileBarChart2 } from 'lucide-react';
import { EagleMark } from './Icon';
import { useSession } from '../state/session';
import { useSettings } from '../state/settings';
import { useSync } from '../sync/queue';
import { useCatalog, employeeFullName } from '../state/catalog';
import { useUI } from '../state/ui';
import { pos } from '../state/pos';
import { openCustomerDisplayWindow } from '../hardware/customerDisplay';
import { emit } from '../state/pos';

export default function StatusBar() {
  const employee = useSession((s) => s.employee);
  const { registerId, registerName } = useSettings();
  const online = useSync((s) => s.online);
  const queued = useSync((s) => s.queue.length);
  const store = useCatalog((s) => s.store);
  const nav = useNavigate();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const initials = employee ? `${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}` : '?';
  return (
    <header className="statusbar">
      <div className="statusbar__brand">
        <EagleMark size={34} />
        <div>
          <b>{store.name}</b>
          <span>
            {registerId} · {registerName}
          </span>
        </div>
      </div>
      {employee && (
        <div className="statusbar__clerk">
          <div className="avatar">{initials}</div>
          <div>
            <b>{employeeFullName(employee)}</b>
            <small>{employee.role}</small>
          </div>
        </div>
      )}
      <div className="statusbar__spacer" />
      <div className="statusbar__status" title={online ? 'Connected to back office' : 'Offline — events are queued and sent when the connection returns'}>
        <i className={`dot ${online ? 'dot--on' : 'dot--off'}`} />
        {online ? 'Back office online' : 'Offline'}
        {queued > 0 && <span className="chip chip--warn">{queued} queued</span>}
      </div>
      <div className="statusbar__clock">
        {now.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        <small>{now.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</small>
      </div>
      <div className="statusbar__actions">
        <button
          className="key key--sm"
          title="Open the customer-facing display (second screen)"
          onClick={() => {
            openCustomerDisplayWindow();
            emit('CUSTOMER_DISPLAY', 'Customer display window opened', { opened: true });
          }}
        >
          <Monitor size={18} />
          <small>Customer screen</small>
        </button>
        <button className="key key--sm" onClick={() => nav('/reports')} title="Live X report for the current segment">
          <FileBarChart2 size={18} />
          <small>Reports</small>
        </button>
        <button className="key key--sm key--warn" onClick={() => void pos.startBreak()} title="Close the current segment and go on break">
          <Coffee size={18} />
          <small>Break</small>
        </button>
        <button className="key key--sm" onClick={() => pos.lock()} title="Lock the register">
          <Lock size={18} />
          <small>Lock</small>
        </button>
        <button className="key key--sm" onClick={() => useUI.getState().openModal({ kind: 'menu' })}>
          <Menu size={18} />
          <small>Menu</small>
        </button>
      </div>
    </header>
  );
}
