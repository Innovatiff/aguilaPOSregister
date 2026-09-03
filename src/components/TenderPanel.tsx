import { Banknote, CreditCard, Landmark, Wallet } from 'lucide-react';
import { pos } from '../state/pos';

export default function TenderPanel() {
  return (
    <section className="tenders">
      <div className="row2">
        <button className="key key--success" onClick={() => pos.tenderCash(5)}>$5 Efectivo</button>
        <button className="key key--success" onClick={() => pos.tenderCash(10)}>$10 Efectivo</button>
      </div>
      <div className="row2">
        <button className="key key--success" onClick={() => pos.tenderCash(20)}>$20 Efectivo</button>
        <button className="key key--success" onClick={() => pos.tenderCash(50)}>$50 Efectivo</button>
      </div>
      <div className="row2">
        <button className="key key--success" onClick={() => pos.tenderCash(100)}>$100 Efectivo</button>
        <button className="key key--success" onClick={() => pos.tenderCash()} title="Monto exacto, o el monto escrito en el teclado">
          <Banknote size={18} /> Efectivo
          <small>exacto / escrito</small>
        </button>
      </div>
      <button className="key key--info key--lg" onClick={() => void pos.tenderCard('debit')}>
        <Landmark size={20} /> Débito Interac
      </button>
      <div className="row2">
        <button className="key key--info" onClick={() => void pos.tenderCard('visa')}>
          <CreditCard size={18} /> Visa
        </button>
        <button className="key key--info" onClick={() => void pos.tenderCard('mastercard')}>
          <CreditCard size={18} /> MasterCard
        </button>
      </div>
      <div className="row2">
        <button className="key key--sm" onClick={() => void pos.tenderCard('amex')}>Amex</button>
        <button className="key key--sm" onClick={() => void pos.tenderOther('gift')}>
          <Wallet size={16} /> Tarjeta de regalo
        </button>
      </div>
      <button className="key key--sm" onClick={() => void pos.tenderOther('cheque')}>Otros pagos (cheque)</button>
    </section>
  );
}
