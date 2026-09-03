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
      title={mode === 'break' ? <><Coffee size={22} color="#f5b300" /> Review your segment before the break</> : mode === 'shift' ? 'Shift closed' : 'Closing report'}
      subtitle={mode === 'break' ? 'This report is sent to the back office the moment you confirm. Nothing else is required.' : mode === 'shift' ? 'The Z report and your drawer count were sent to the back office. Thank you!' : undefined}
      onClose={mode === 'break' ? close : close}
    >
      <ClosingReport report={report} closing={mode === 'shift' && closing ? closing : null} />
      <div className="modal__actions">
        {mode === 'break' ? (
          <>
            <button className="key key--ghost" onClick={close}>Not now</button>
            <button className="key key--warn key--lg" onClick={onConfirm}><Coffee size={18} /> Confirm & start break</button>
          </>
        ) : (
          <button className="key key--accent" onClick={close}>Done</button>
        )}
      </div>
    </ModalShell>
  );
}
