import { Ban, Copy, DoorOpen, Hash, Pause, Printer, RotateCcw, ScanBarcode, Search, Tag, Trash2, Undo2, XCircle, ListRestart } from 'lucide-react';
import { useCart } from '../state/cart';
import { useUI } from '../state/ui';
import { pos } from '../state/pos';
import { parseAmountBuffer } from '../core/money';

export default function FunctionKeys() {
  const buffer = useCart((s) => s.buffer);
  const pendingQty = useCart((s) => s.pendingQty);
  const returnMode = useCart((s) => s.returnMode);
  const held = useCart((s) => s.held.length);
  const selected = useCart((s) => s.selectedLineId);
  const last = useCart((s) => s.lastCompleted);
  const open = useUI((s) => s.openModal);
  return (
    <>
      <div className="display-strip">
        <div className={`display-strip__buffer ${buffer ? '' : 'is-empty'}`}>
          {buffer ? (
            <>
              {buffer} <span style={{ fontSize: 14, color: '#8f9cbb', marginLeft: 10 }}>= {parseAmountBuffer(buffer).toFixed(2)} as amount</span>
            </>
          ) : (
            'Type amount + category key · PLU + ENTER · or scan'
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {pendingQty && <span className="chip chip--accent">QTY {pendingQty} pending</span>}
          {returnMode && <span className="chip chip--warn">RETURN MODE</span>}
          {selected && <span className="chip chip--info">line selected</span>}
          {held > 0 && <span className="chip">{held} on hold</span>}
        </div>
      </div>
      <div className="fkeys">
        <button className="key key--sm" onClick={() => pos.clearKey()}>
          <XCircle size={16} /> Clear
        </button>
        <button className="key key--sm key--danger" onClick={() => void pos.noSale()}>
          <DoorOpen size={16} /> No Sale
        </button>
        <button className="key key--sm" onClick={() => pos.applyQuantityKey()}>
          <Hash size={16} /> @/For (Qty)
        </button>
        <button className="key key--sm key--info" onClick={() => pos.priceLookup()}>
          <Search size={16} /> Price Look-Up
        </button>
        <button className="key key--sm" onClick={() => pos.duplicateLast()}>
          <Copy size={16} /> Duplicate
        </button>
        <button className={`key key--sm ${returnMode ? 'key--warn key--active' : ''}`} onClick={() => pos.toggleReturnMode()}>
          <Undo2 size={16} /> Return
        </button>
        <button className="key key--sm" onClick={() => void pos.hold()}>
          <Pause size={16} /> Hold (Waiting)
        </button>

        <button className="key key--sm key--danger" onClick={() => void pos.voidSelected()}>
          <Trash2 size={16} /> Void Item
        </button>
        <button className="key key--sm key--danger" onClick={() => void pos.voidSale()}>
          <Ban size={16} /> Void Sale
        </button>
        <button className="key key--sm" onClick={() => open({ kind: 'recall' })}>
          <ListRestart size={16} /> Recall
          {held > 0 && <span className="badge-count">{held}</span>}
        </button>
        <button className="key key--sm key--warn" onClick={() => void pos.changePrice()}>
          <Tag size={16} /> Change Price
        </button>
        <button className="key key--sm" onClick={() => void pos.enterPlu()}>
          <Hash size={16} /> PLU Code
        </button>
        <button className="key key--sm" onClick={() => open({ kind: 'manual-scan' })}>
          <ScanBarcode size={16} /> Scan / Enter code
        </button>
        <button className="key key--sm" disabled={!last} onClick={() => last && open({ kind: 'receipt', txn: last, reprint: true })}>
          <Printer size={16} /> Reprint <RotateCcw size={12} />
        </button>
      </div>
    </>
  );
}
