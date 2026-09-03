import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, FileBarChart2, Info, LogOut, Monitor, Settings } from 'lucide-react';
import ModalShell from './ModalShell';
import { useUI } from '../../state/ui';
import { pos } from '../../state/pos';
import { openCustomerDisplayWindow } from '../../hardware/customerDisplay';
import { useSync } from '../../sync/queue';
import { useSettings } from '../../state/settings';

export default function MenuModal() {
  const close = useUI((s) => s.closeModal);
  const nav = useNavigate();
  const { online, queue, lastSyncAt, sentCount } = useSync();
  const { apiBaseUrl } = useSettings();
  const go = (fn: () => void) => () => { close(); fn(); };
  return (
    <ModalShell title="Menú de la caja" onClose={close} size="wide">
      <div className="option-list" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <button className="key key--lg" onClick={go(() => nav('/reports'))}><FileBarChart2 size={20} /> Reportes / Reporte X</button>
        <button className="key key--lg key--info" onClick={go(() => void pos.cashDrop())}><ArrowDownToLine size={20} /> Depósito a caja fuerte</button>
        <button className="key key--lg key--warn" onClick={go(() => void pos.paidOut())}><ArrowUpFromLine size={20} /> Pago de gasto</button>
        <button className="key key--lg" onClick={go(() => openCustomerDisplayWindow())}><Monitor size={20} /> Pantalla del cliente</button>
        <button className="key key--lg" onClick={go(() => nav('/settings'))}><Settings size={20} /> Configuración y hardware</button>
        <button className="key key--lg" onClick={go(() => nav('/about'))}><Info size={20} /> Acerca de este software</button>
        <button className="key key--lg key--danger" style={{ gridColumn: '1 / -1' }} onClick={go(() => void pos.endShift())}><LogOut size={20} /> Cerrar turno y salir (reporte Z)</button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Administración: {apiBaseUrl} · {online ? 'conectado' : 'sin conexión'} · {queue.length} en cola · {sentCount} eventos enviados{lastSyncAt ? ` · última sincronización ${new Date(lastSyncAt).toLocaleTimeString('es-US')}` : ''}
      </p>
    </ModalShell>
  );
}
