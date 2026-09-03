import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cloud, CreditCard, Monitor, ScanBarcode, ShieldCheck, Wifi, Coffee, Printer } from 'lucide-react';
import { EagleMark } from '../components/Icon';

export default function AboutPage() {
  const nav = useNavigate();
  return (
    <div className="page">
      <header className="page__header">
        <button className="key key--sm" onClick={() => nav('/')}><ArrowLeft size={16} /> Back</button>
        <h1>About Aguila POS</h1>
      </header>
      <div className="page__body">
        <section className="card" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <EagleMark size={72} />
          <div>
            <h3 style={{ fontSize: 22, marginBottom: 4 }}>Aguila POS Suite — Register</h3>
            <p>Version 1.0.0 (demo build) · Touch-first point of sale for El Aguila Market · Part of the Aguila POS Suite with the Back Office manager application.</p>
            <p>Built by Innovatiff. This evaluation build contains demo data only.</p>
          </div>
        </section>
        <section className="card">
          <h3>What the register does</h3>
          <div className="feature-grid">
            <div className="feature"><b><ShieldCheck size={16} /> PIN sign-in & shifts</b><p>Each associate signs in with a PIN. Opening float, breaks and drawer counts are all recorded.</p></div>
            <div className="feature"><b><Coffee size={16} /> Break = closed segment</b><p>Going on break closes the associate’s segment and sends a complete report to the manager instantly.</p></div>
            <div className="feature"><b><ScanBarcode size={16} /> Scanning</b><p>USB scanners work out of the box: UPC/EAN, produce PLU stickers and deli-scale price labels.</p></div>
            <div className="feature"><b><CreditCard size={16} /> Payments</b><p>Cash quick keys, Interac debit, Visa, MasterCard, Amex, gift cards and split payments, with a semi-integrated terminal flow.</p></div>
            <div className="feature"><b><Monitor size={16} /> Customer display</b><p>A second screen shows the customer every item, the total and their change.</p></div>
            <div className="feature"><b><Wifi size={16} /> Offline-first</b><p>If the internet drops the register keeps selling; every event is queued and synced when back online.</p></div>
            <div className="feature"><b><Printer size={16} /> Receipts</b><p>80 mm thermal receipts with HST breakdown, reprints logged for the manager.</p></div>
            <div className="feature"><b><Cloud size={16} /> Live back office</b><p>Every movement — sales, voids, discounts, no-sales, price checks — streams to the manager’s dashboard.</p></div>
          </div>
        </section>
        <section className="card">
          <h3>Hardware roadmap</h3>
          <div className="list">
            <div className="list-item"><div><b>Payment terminal (Interac / Moneris)</b><span>Semi-integrated: the register sends the amount, the customer pays on the PIN pad, the approval flows back automatically.</span></div><span className="badge badge--warn">planned</span></div>
            <div className="list-item"><div><b>Dual screens</b><span>Associate touch screen + customer-facing display (already supported through the /customer window).</span></div><span className="badge badge--success">ready</span></div>
            <div className="list-item"><div><b>Barcode scanner</b><span>USB keyboard-wedge scanners for checkout and for inventory counts in the back office.</span></div><span className="badge badge--success">ready</span></div>
            <div className="list-item"><div><b>Receipt printer & cash drawer</b><span>ESC/POS thermal printer with printer-driven drawer kick.</span></div><span className="badge badge--warn">planned</span></div>
          </div>
        </section>
        <section className="card">
          <h3>Support</h3>
          <p>Innovatiff · support desk available Monday to Saturday · Remote assistance and on-site installation available in the Windsor–Essex region.</p>
          <p className="muted">© {new Date().getFullYear()} Innovatiff. All product names are trademarks of their respective owners.</p>
        </section>
      </div>
    </div>
  );
}
