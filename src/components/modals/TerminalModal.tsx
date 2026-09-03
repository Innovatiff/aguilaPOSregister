import { useEffect, useState } from 'react';
import { CreditCard, Wifi } from 'lucide-react';
import ModalShell from './ModalShell';
import { getTerminal, TERMINAL_PHASE_LABEL, type TerminalPhase } from '../../hardware/terminal';
import { useSettings } from '../../state/settings';
import { useCatalog } from '../../state/catalog';
import { formatMoney } from '../../core/money';
import { TENDER_LABEL } from '../../core/format';
import type { TenderType } from '../../core/types';

export default function TerminalModal({ amount, tenderType }: { amount: number; tenderType: TenderType }) {
  const { terminalAutoApprove, terminalMode } = useSettings();
  const store = useCatalog((s) => s.store);
  const terminal = getTerminal(terminalAutoApprove);
  const [phase, setPhase] = useState<TerminalPhase>(terminal.phase);
  const [detail, setDetail] = useState<string>('');
  useEffect(() => terminal.subscribe((p, d) => { setPhase(p); setDetail(d ?? ''); }), [terminal]);
  const money = (n: number) => formatMoney(n, store.locale, store.currency);
  const waiting = phase === 'connecting' || phase === 'waiting_for_card' || phase === 'processing';
  return (
    <ModalShell title={<><CreditCard size={22} color="#38bdf8" /> {TENDER_LABEL[tenderType]} — {amount < 0 ? 'reembolso' : 'pago'}</>} subtitle={`${terminalMode === 'simulated' ? 'Terminal simulada' : terminalMode} · semi-integrada: el monto se envía al PIN pad y el cliente completa el pago ahí.`}>
      <div className="terminal">
        <div className="terminal__amount">{money(Math.abs(amount))}</div>
        <div className="terminal__device">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8f9cbb', fontSize: 11, marginBottom: 8 }}>
            <span>MONERIS · SIM</span>
            <Wifi size={12} />
          </div>
          <div className="terminal__screen">
            {phase === 'connecting' && 'CONECTANDO…'}
            {phase === 'waiting_for_card' && `COMPRA ${money(Math.abs(amount))}\n\nACERQUE / INSERTE / DESLICE\nLA TARJETA`}
            {phase === 'processing' && 'PROCESANDO\nESPERE POR FAVOR…'}
            {phase === 'approved' && `APROBADO\n${detail.replace('APROBADO  ', '')}`}
            {phase === 'declined' && 'RECHAZADO'}
            {phase === 'cancelled' && 'CANCELADO'}
            {phase === 'idle' && 'LISTO'}
          </div>
        </div>
        <div className={`terminal__phase ${phase} ${waiting ? 'pulse' : ''}`}>{detail || (TERMINAL_PHASE_LABEL[phase] ?? phase)}</div>
      </div>
      <div className="modal__actions" style={{ justifyContent: 'center' }}>
        {waiting && <button className="key key--ghost" onClick={() => terminal.cancel()}>Cancelar</button>}
        {terminalMode === 'simulated' && phase === 'waiting_for_card' && (
          <>
            <button className="key key--danger" onClick={() => terminal.simulateDecline()}>Simular rechazo</button>
            <button className="key key--success" onClick={() => terminal.simulateTap()}>Simular tarjeta del cliente</button>
          </>
        )}
      </div>
    </ModalShell>
  );
}
