import { Banknote, CreditCard, Landmark, Wallet } from 'lucide-react';
import { pos } from '../state/pos';

export default function TenderPanel() {
  return (
    <section className="tenders">
      <div className="row2">
        <button className="key key--success" onClick={() => pos.tenderCash(5)}>$5 Cash</button>
        <button className="key key--success" onClick={() => pos.tenderCash(10)}>$10 Cash</button>
      </div>
      <div className="row2">
        <button className="key key--success" onClick={() => pos.tenderCash(20)}>$20 Cash</button>
        <button className="key key--success" onClick={() => pos.tenderCash(50)}>$50 Cash</button>
      </div>
      <div className="row2">
        <button className="key key--success" onClick={() => pos.tenderCash(100)}>$100 Cash</button>
        <button className="key key--success" onClick={() => pos.tenderCash()} title="Exact amount, or the amount typed on the keypad">
          <Banknote size={18} /> Cash
          <small>exact / typed</small>
        </button>
      </div>
      <button className="key key--info key--lg" onClick={() => void pos.tenderCard('debit')}>
        <Landmark size={20} /> Interac Debit
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
          <Wallet size={16} /> Gift card
        </button>
      </div>
      <button className="key key--sm" onClick={() => void pos.tenderOther('cheque')}>Other payments (cheque)</button>
    </section>
  );
}
