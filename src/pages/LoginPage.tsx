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
import { fmtTime, elapsedSince, plural } from '../core/format';

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
    if (!r.ok) setError(r.error ?? 'Intente de nuevo');
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
            Rápido en la caja.
            <br />
            Transparente para la administración.
          </h2>
          <p>
            Cada venta, anulación, descuento, apertura de cajón y descanso se registra y se envía en tiempo real al panel del gerente. Cuando un asociado toma un descanso, su segmento se cierra automáticamente con un reporte completo.
          </p>
          <div className="login__facts">
            <div className="card">
              <b>{plural(categories.length, 'departamento')}</b>
              <span>las mismas teclas de siempre: monto + categoría</span>
            </div>
            <div className="card">
              <b>{plural(products.length, 'artículo')}</b>
              <span>códigos de barras, PLU y etiquetas de báscula</span>
            </div>
            <div className="card">
              <b>Compatible con HST</b>
              <span>abarrotes sin impuesto, artículos gravados marcados</span>
            </div>
          </div>
        </div>
        <div className="login__foot">
          <span>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />} {online ? 'Conectado con administración' : 'Sin conexión — trabajando localmente'}
            {queued > 0 && ` · ${plural(queued, 'evento')} en cola`} · {registerId} {registerName}
          </span>
          <span style={{ display: 'flex', gap: 6 }}>
            <button className="key key--sm key--ghost" onClick={() => openCustomerDisplayWindow()}><Monitor size={14} /> Pantalla del cliente</button>
            <button className="key key--sm key--ghost" onClick={() => nav('/settings')}><Settings size={14} /> Configuración</button>
            <button className="key key--sm key--ghost" onClick={() => nav('/about')}><Info size={14} /> Acerca de</button>
          </span>
        </div>
      </aside>
      <main className="login__main">
        <div className="login__card">
          {status === 'locked' && lockedBy ? (
            <>
              <h3><Lock size={18} style={{ verticalAlign: -3 }} /> Caja bloqueada</h3>
              <p className="sub">Bloqueada por {lockedBy.firstName} {lockedBy.lastName}. Ingrese su PIN, o el PIN de un supervisor, para desbloquear.</p>
            </>
          ) : (
            <>
              <h3><ShieldCheck size={18} style={{ verticalAlign: -3 }} /> Inicio de sesión del asociado</h3>
              <p className="sub">Ingrese su PIN para iniciar un turno{onBreak.length ? ' o regresar del descanso' : ''}.</p>
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
                      <b>{s.employeeName} está en descanso</b>
                      <span>desde {fmtTime(seg?.endedAt)} · {seg?.endedAt ? elapsedSince(seg.endedAt) : ''} · ingrese el PIN para continuar</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="pin-dots">{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className={i < pin.length ? 'on' : ''} style={{ display: i >= 4 && pin.length <= 4 ? 'none' : 'block' }} />)}</div>
          <div className="pin-error">{error}</div>
          <NumPad value={pin} onChange={(v) => { setPin(v); setError(''); }} mode="pin" onEnter={() => void submit()} enterLabel={busy ? 'Verificando…' : 'Iniciar sesión'} />
          <details className="demo-hint">
            <summary>Cuentas de demostración</summary>
            <div style={{ marginTop: 6 }}>
              Cajeros: María <code>1234</code>, José <code>2468</code>, Ana <code>1357</code>, Carlos <code>4321</code> · Supervisor Luis <code>5150</code> · Gerente <code>9999</code>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
