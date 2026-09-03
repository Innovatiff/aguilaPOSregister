import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import ModalShell from './ModalShell';
import NumPad from '../NumPad';
import { pos } from '../../state/pos';
import type { Employee } from '../../core/types';

interface Props {
  title: string;
  subtitle?: string;
  minRole: 'supervisor' | 'manager';
  resolve: (e: Employee | null) => void;
}

export default function PinPadModal({ title, subtitle, minRole, resolve }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (pin.length < 4 || busy) return;
    setBusy(true);
    const e = await pos.verifyApprover(pin, minRole);
    setBusy(false);
    if (e) resolve(e);
    else {
      setError(`PIN de ${minRole === 'manager' ? 'gerente' : 'supervisor'} no válido`);
      setPin('');
    }
  };
  return (
    <ModalShell title={<><ShieldCheck size={22} color="#f5b300" /> {title}</>} subtitle={subtitle} onClose={() => resolve(null)}>
      <div className="pin-dots">{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className={i < pin.length ? 'on' : ''} style={{ display: i >= 4 && pin.length <= 4 ? 'none' : 'block' }} />)}</div>
      <div className="pin-error">{error}</div>
      <NumPad value={pin} onChange={(v) => { setPin(v); setError(''); }} mode="pin" onEnter={() => void submit()} enterLabel={busy ? 'Verificando…' : 'Aprobar'} />
    </ModalShell>
  );
}
