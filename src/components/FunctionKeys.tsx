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
              {buffer} <span style={{ fontSize: 14, color: '#8f9cbb', marginLeft: 10 }}>= {parseAmountBuffer(buffer).toFixed(2)} como monto</span>
            </>
          ) : (
            'Escriba monto + tecla de categoría · PLU + ENTRAR · o escanee'
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {pendingQty && <span className="chip chip--accent">CANT. {pendingQty} pendiente</span>}
          {returnMode && <span className="chip chip--warn">MODO DEVOLUCIÓN</span>}
          {selected && <span className="chip chip--info">línea seleccionada</span>}
          {held > 0 && <span className="chip">{held} en espera</span>}
        </div>
      </div>
      <div className="fkeys">
        <button className="key key--sm" onClick={() => pos.clearKey()}>
          <XCircle size={16} /> Borrar
        </button>
        <button className="key key--sm key--danger" onClick={() => void pos.noSale()}>
          <DoorOpen size={16} /> Sin venta
        </button>
        <button className="key key--sm" onClick={() => pos.applyQuantityKey()}>
          <Hash size={16} /> Cant. (@)
        </button>
        <button className="key key--sm key--info" onClick={() => pos.priceLookup()}>
          <Search size={16} /> Consultar precio
        </button>
        <button className="key key--sm" onClick={() => pos.duplicateLast()}>
          <Copy size={16} /> Repetir
        </button>
        <button className={`key key--sm ${returnMode ? 'key--warn key--active' : ''}`} onClick={() => pos.toggleReturnMode()}>
          <Undo2 size={16} /> Devolución
        </button>
        <button className="key key--sm" onClick={() => void pos.hold()}>
          <Pause size={16} /> En espera
        </button>

        <button className="key key--sm key--danger" onClick={() => void pos.voidSelected()}>
          <Trash2 size={16} /> Anular artículo
        </button>
        <button className="key key--sm key--danger" onClick={() => void pos.voidSale()}>
          <Ban size={16} /> Anular venta
        </button>
        <button className="key key--sm" onClick={() => open({ kind: 'recall' })}>
          <ListRestart size={16} /> Recuperar
          {held > 0 && <span className="badge-count">{held}</span>}
        </button>
        <button className="key key--sm key--warn" onClick={() => void pos.changePrice()}>
          <Tag size={16} /> Cambiar precio
        </button>
        <button className="key key--sm" onClick={() => void pos.enterPlu()}>
          <Hash size={16} /> Código PLU
        </button>
        <button className="key key--sm" onClick={() => open({ kind: 'manual-scan' })}>
          <ScanBarcode size={16} /> Escanear / Ingresar código
        </button>
        <button className="key key--sm" disabled={!last} onClick={() => last && open({ kind: 'receipt', txn: last, reprint: true })}>
          <Printer size={16} /> Reimprimir <RotateCcw size={12} />
        </button>
      </div>
    </>
  );
}
