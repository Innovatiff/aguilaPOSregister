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
import { ROLE_LABEL } from '../core/format';

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
            <small>{ROLE_LABEL[employee.role] ?? employee.role}</small>
          </div>
        </div>
      )}
      <div className="statusbar__spacer" />
      <div className="statusbar__status" title={online ? 'Conectado con administración' : 'Sin conexión — los eventos se ponen en cola y se envían cuando vuelve la conexión'}>
        <i className={`dot ${online ? 'dot--on' : 'dot--off'}`} />
        {online ? 'Administración en línea' : 'Sin conexión'}
        {queued > 0 && <span className="chip chip--warn">{queued} en cola</span>}
      </div>
      <div className="statusbar__clock">
        {now.toLocaleTimeString('es-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        <small>{now.toLocaleDateString('es-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</small>
      </div>
      <div className="statusbar__actions">
        <button
          className="key key--sm"
          title="Abrir la pantalla del cliente (segunda pantalla)"
          onClick={() => {
            openCustomerDisplayWindow();
            emit('CUSTOMER_DISPLAY', 'Se abrió la ventana de la pantalla del cliente', { opened: true });
          }}
        >
          <Monitor size={18} />
          <small>Pantalla cliente</small>
        </button>
        <button className="key key--sm" onClick={() => nav('/reports')} title="Reporte X en vivo del segmento actual">
          <FileBarChart2 size={18} />
          <small>Reportes</small>
        </button>
        <button className="key key--sm key--warn" onClick={() => void pos.startBreak()} title="Cerrar el segmento actual y tomar un descanso">
          <Coffee size={18} />
          <small>Descanso</small>
        </button>
        <button className="key key--sm" onClick={() => pos.lock()} title="Bloquear la caja">
          <Lock size={18} />
          <small>Bloquear</small>
        </button>
        <button className="key key--sm" onClick={() => useUI.getState().openModal({ kind: 'menu' })}>
          <Menu size={18} />
          <small>Menú</small>
        </button>
      </div>
    </header>
  );
}
