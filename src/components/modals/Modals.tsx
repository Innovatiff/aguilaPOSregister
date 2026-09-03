import { useUI } from '../../state/ui';
import PinPadModal from './PinPadModal';
import { AmountModal, DiscountModal, OpeningFloatModal, PriceModal, QtyModal, WeightModal } from './NumberModals';
import { ConfirmModal, HoldModal, ManualScanModal, PriceLookupModal, ReasonModal, RecallModal, UnknownBarcodeModal } from './TextModals';
import TerminalModal from './TerminalModal';
import { ChangeModal, ReceiptModal } from './ChangeModal';
import ClosingReportModal from './ClosingReportModal';
import EndShiftModal from './EndShiftModal';
import MenuModal from './MenuModal';

export default function Modals() {
  const modal = useUI((s) => s.modal);
  if (!modal) return null;
  switch (modal.kind) {
    case 'pin':
      return <PinPadModal title={modal.title} subtitle={modal.subtitle} minRole={modal.minRole ?? 'supervisor'} resolve={modal.resolve} />;
    case 'qty':
      return <QtyModal lineId={modal.lineId} resolve={modal.resolve} />;
    case 'weight':
      return <WeightModal product={modal.product} resolve={modal.resolve} />;
    case 'price':
      return <PriceModal lineId={modal.lineId} resolve={modal.resolve} />;
    case 'discount':
      return <DiscountModal target={modal.target} mode={modal.mode} lineId={modal.lineId} resolve={modal.resolve} />;
    case 'amount':
      return <AmountModal title={modal.title} subtitle={modal.subtitle} withReason={modal.withReason} options={modal.options} resolve={modal.resolve} />;
    case 'opening-float':
      return <OpeningFloatModal employee={modal.employee} resolve={modal.resolve} />;
    case 'hold':
      return <HoldModal resolve={modal.resolve} />;
    case 'reason':
      return <ReasonModal title={modal.title} options={modal.options} resolve={modal.resolve} />;
    case 'confirm':
      return <ConfirmModal title={modal.title} message={modal.message} danger={modal.danger} confirmLabel={modal.confirmLabel} resolve={modal.resolve} />;
    case 'unknown-barcode':
      return <UnknownBarcodeModal parsed={modal.parsed} />;
    case 'manual-scan':
      return <ManualScanModal />;
    case 'price-lookup':
      return <PriceLookupModal />;
    case 'recall':
      return <RecallModal />;
    case 'terminal':
      return <TerminalModal amount={modal.amount} tenderType={modal.tenderType} />;
    case 'change':
      return <ChangeModal txn={modal.txn} />;
    case 'receipt':
      return <ReceiptModal txn={modal.txn} reprint={modal.reprint} />;
    case 'closing-report':
      return <ClosingReportModal report={modal.report} mode={modal.mode} onConfirm={modal.onConfirm} />;
    case 'end-shift':
      return <EndShiftModal />;
    case 'menu':
      return <MenuModal />;
    case 'open-dept':
      return <ConfirmModal title={`${modal.category.name} open item`} message={`Add an open item of ${modal.amount.toFixed(2)} to ${modal.category.name}?`} resolve={modal.resolve} />;
    case 'break-confirm':
      return null;
    default:
      return null;
  }
}
