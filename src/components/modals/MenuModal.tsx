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
    <ModalShell title="Register menu" onClose={close} size="wide">
      <div className="option-list" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <button className="key key--lg" onClick={go(() => nav('/reports'))}><FileBarChart2 size={20} /> Reports / X report</button>
        <button className="key key--lg key--info" onClick={go(() => void pos.cashDrop())}><ArrowDownToLine size={20} /> Cash drop (safe)</button>
        <button className="key key--lg key--warn" onClick={go(() => void pos.paidOut())}><ArrowUpFromLine size={20} /> Paid out</button>
        <button className="key key--lg" onClick={go(() => openCustomerDisplayWindow())}><Monitor size={20} /> Customer display</button>
        <button className="key key--lg" onClick={go(() => nav('/settings'))}><Settings size={20} /> Settings & hardware</button>
        <button className="key key--lg" onClick={go(() => nav('/about'))}><Info size={20} /> About this software</button>
        <button className="key key--lg key--danger" style={{ gridColumn: '1 / -1' }} onClick={go(() => void pos.endShift())}><LogOut size={20} /> End shift & sign out (Z report)</button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Back office: {apiBaseUrl} · {online ? 'connected' : 'offline'} · {queue.length} queued · {sentCount} events sent{lastSyncAt ? ` · last sync ${new Date(lastSyncAt).toLocaleTimeString()}` : ''}
      </p>
    </ModalShell>
  );
}
