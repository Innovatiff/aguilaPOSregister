import { Coffee } from 'lucide-react';
import ModalShell from './ModalShell';
import ClosingReport from '../ClosingReport';
import { useUI } from '../../state/ui';
import { useJournal } from '../../state/journal';
import type { SegmentReport } from '../../core/types';

export default function ClosingReportModal({ report, mode, onConfirm }: { report: SegmentReport; mode: 'break' | 'shift' | 'view'; onConfirm?: () => void }) {
  const close = useUI((s) => s.closeModal);
  const closing = useJournal((s) => s.closedShifts.find((sh) => sh.id === report.shiftId)?.closing ?? null);
  return (
    <ModalShell
      size="xl"
      title={mode === 'break' ? <><Coffee size={22} color="#f5b300" /> Revise su segmento antes del descanso</> : mode === 'shift' ? 'Turno cerrado' : 'Reporte de cierre'}
      subtitle={mode === 'break' ? 'Este reporte se envía a administración en cuanto confirme. No se requiere nada más.' : mode === 'shift' ? 'El reporte Z y su conteo del cajón se enviaron a administración. ¡Gracias!' : undefined}
      onClose={mode === 'break' ? close : close}
    >
      <ClosingReport report={report} closing={mode === 'shift' && closing ? closing : null} />
      <div className="modal__actions">
        {mode === 'break' ? (
          <>
            <button className="key key--ghost" onClick={close}>Ahora no</button>
            <button className="key key--warn key--lg" onClick={onConfirm}><Coffee size={18} /> Confirmar e iniciar descanso</button>
          </>
        ) : (
          <button className="key key--accent" onClick={close}>Listo</button>
        )}
      </div>
    </ModalShell>
  );
}
