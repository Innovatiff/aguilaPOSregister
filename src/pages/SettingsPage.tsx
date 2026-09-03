import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Monitor, Printer, RefreshCw, ScanBarcode, Scale, Trash2 } from 'lucide-react';
import { useSettings, type TerminalMode, type PrintMode } from '../state/settings';
import { useCatalog } from '../state/catalog';
import { useSync } from '../sync/queue';
import { bootstrap, syncNow } from '../sync';
import { simulateScan } from '../hardware/scanner';
import { buildPriceEmbedded } from '../core/barcode';
import { getTerminal, type TerminalPhase } from '../hardware/terminal';
import { printText } from '../hardware/printer';
import { openCustomerDisplayWindow } from '../hardware/customerDisplay';
import { toast } from '../state/ui';
import { useSession } from '../state/session';

export default function SettingsPage() {
  const nav = useNavigate();
  const s = useSettings();
  const catalog = useCatalog();
  const sync = useSync();
  const status = useSession((st) => st.status);
  const [scanCode, setScanCode] = useState('');
  const [scaleProduct, setScaleProduct] = useState(catalog.products.find((p) => p.soldByWeight)?.id ?? '');
  const [scaleKg, setScaleKg] = useState('0.750');
  const [termPhase, setTermPhase] = useState<TerminalPhase>('idle');
  const terminal = getTerminal(s.terminalAutoApprove);
  useEffect(() => terminal.subscribe((p) => setTermPhase(p)), [terminal]);
  const weighed = catalog.products.filter((p) => p.soldByWeight);
  const sp = catalog.products.find((p) => p.id === scaleProduct);
  const label = sp ? buildPriceEmbedded(sp.plu, (parseFloat(scaleKg) || 0) * sp.price) : '';
  const barcoded = catalog.products.filter((p) => p.barcode);

  return (
    <div className="page">
      <header className="page__header">
        <button className="key key--sm" onClick={() => nav('/')}><ArrowLeft size={16} /> Back</button>
        <h1>Settings & hardware</h1>
        <span className="muted">{status === 'active' ? 'Signed in' : 'Signed out'} · v1.0.0</span>
      </header>
      <div className="page__body">
        <div className="page__cols">
          <section className="card">
            <h3>Back office connection</h3>
            <div className="form-row"><label className="label">API base URL</label><input className="input" value={s.apiBaseUrl} onChange={(e) => s.update({ apiBaseUrl: e.target.value })} /></div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="form-row"><label className="label">Register ID</label><input className="input" value={s.registerId} onChange={(e) => s.update({ registerId: e.target.value })} /></div>
              <div className="form-row"><label className="label">Register name</label><input className="input" value={s.registerName} onChange={(e) => s.update({ registerName: e.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginTop: 10 }}><label className="label">Device key</label><input className="input" value={s.registerKey} onChange={(e) => s.update({ registerKey: e.target.value })} /></div>
            <p>
              Status: <span className={`badge ${sync.online ? 'badge--success' : 'badge--danger'}`}>{sync.online ? 'online' : 'offline'}</span> · {sync.queue.length} queued · {sync.sentCount} sent · catalog {catalog.version} ({catalog.source}){sync.lastError ? ` · last error: ${sync.lastError}` : ''}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="key key--sm key--info" onClick={() => void syncNow()}><RefreshCw size={16} /> Sync now</button>
              <button className="key key--sm" onClick={() => void bootstrap().then((ok) => toast(ok ? 'Catalog, store & employees refreshed from back office' : 'Back office not reachable', ok ? 'success' : 'danger'))}>Reload catalog from server</button>
            </div>
          </section>
          <section className="card">
            <h3>Hardware</h3>
            <div className="form-grid">
              <div className="form-row">
                <label className="label">Payment terminal</label>
                <select className="select" value={s.terminalMode} onChange={(e) => s.update({ terminalMode: e.target.value as TerminalMode })}>
                  <option value="simulated">Simulated terminal (demo)</option>
                  <option value="moneris">Moneris — semi-integrated (coming)</option>
                  <option value="globalpayments">Global Payments — semi-integrated (coming)</option>
                  <option value="none">Stand-alone terminal (manual confirm)</option>
                </select>
              </div>
              <div className="form-row">
                <label className="label">Receipt printing</label>
                <select className="select" value={s.printMode} onChange={(e) => s.update({ printMode: e.target.value as PrintMode })}>
                  <option value="preview">Show receipt, print on request</option>
                  <option value="auto">Print automatically</option>
                  <option value="off">Do not print</option>
                </select>
              </div>
            </div>
            <div className="list" style={{ marginTop: 10 }}>
              <label className="switch"><span>Auto-approve simulated card payments</span><input type="checkbox" checked={s.terminalAutoApprove} onChange={(e) => s.update({ terminalAutoApprove: e.target.checked })} /></label>
              <label className="switch"><span>Customer-facing display enabled</span><input type="checkbox" checked={s.customerDisplayEnabled} onChange={(e) => s.update({ customerDisplayEnabled: e.target.checked })} /></label>
              <label className="switch"><span>Key & scanner sounds</span><input type="checkbox" checked={s.soundEnabled} onChange={(e) => s.update({ soundEnabled: e.target.checked })} /></label>
            </div>
          </section>
          <section className="card">
            <h3>Approvals & controls</h3>
            <div className="form-grid">
              <div className="form-row"><label className="label">Void needs approval above ($)</label><input className="input" type="number" value={s.approval.voidAbove} onChange={(e) => s.update({ approval: { ...s.approval, voidAbove: parseFloat(e.target.value) || 0 } })} /></div>
              <div className="form-row"><label className="label">Discount approval above (%)</label><input className="input" type="number" value={s.approval.discountAbovePct} onChange={(e) => s.update({ approval: { ...s.approval, discountAbovePct: parseFloat(e.target.value) || 0 } })} /></div>
              <div className="form-row"><label className="label">Discount approval above ($)</label><input className="input" type="number" value={s.approval.discountAboveAmount} onChange={(e) => s.update({ approval: { ...s.approval, discountAboveAmount: parseFloat(e.target.value) || 0 } })} /></div>
            </div>
            <div className="list" style={{ marginTop: 10 }}>
              <label className="switch"><span>Price changes need supervisor PIN</span><input type="checkbox" checked={s.approval.priceOverrideRequiresManager} onChange={(e) => s.update({ approval: { ...s.approval, priceOverrideRequiresManager: e.target.checked } })} /></label>
              <label className="switch"><span>Returns need supervisor PIN</span><input type="checkbox" checked={s.approval.returnsRequireManager} onChange={(e) => s.update({ approval: { ...s.approval, returnsRequireManager: e.target.checked } })} /></label>
            </div>
          </section>
          <section className="card">
            <h3>Hardware test bench</h3>
            <p>Use these to demo the hardware integrations without physical devices.</p>
            <h4 className="label"><ScanBarcode size={14} /> Barcode scanner (keyboard wedge)</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="select" value={scanCode} onChange={(e) => setScanCode(e.target.value)}>
                <option value="">Pick a catalog item…</option>
                {barcoded.slice(0, 60).map((p) => <option key={p.id} value={p.barcode!}>{p.name} — {p.barcode}</option>)}
              </select>
              <button className="key key--sm key--accent" disabled={!scanCode || status !== 'active'} onClick={() => { simulateScan(scanCode); toast(`Scanned ${scanCode}`, 'info'); nav('/'); }}>Scan</button>
            </div>
            <h4 className="label" style={{ marginTop: 12 }}><Scale size={14} /> Deli scale label (price-embedded UPC)</h4>
            <div className="form-grid">
              <select className="select" value={scaleProduct} onChange={(e) => setScaleProduct(e.target.value)}>
                {weighed.map((p) => <option key={p.id} value={p.id}>{p.name} — ${p.price}/kg</option>)}
              </select>
              <input className="input" value={scaleKg} onChange={(e) => setScaleKg(e.target.value)} placeholder="kg" />
            </div>
            <p className="mono" style={{ fontSize: 13 }}>Label barcode: {label} {sp ? `(→ $${((parseFloat(scaleKg) || 0) * sp.price).toFixed(2)})` : ''}</p>
            <button className="key key--sm key--accent" disabled={!label || status !== 'active'} onClick={() => { simulateScan(label); nav('/'); }}>Scan scale label</button>
            <h4 className="label" style={{ marginTop: 12 }}><CreditCard size={14} /> Payment terminal</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge--info">{termPhase}</span>
              <button className="key key--sm" onClick={() => void terminal.startPayment(1.0, 'debit')}>Send $1.00 test</button>
              <button className="key key--sm key--success" onClick={() => terminal.simulateTap()}>Tap</button>
              <button className="key key--sm key--danger" onClick={() => terminal.cancel()}>Cancel</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button className="key key--sm" onClick={() => printText('EL AGUILA MARKET\nPRINTER TEST OK\n' + new Date().toLocaleString(), 'Printer test')}><Printer size={16} /> Test print</button>
              <button className="key key--sm" onClick={() => openCustomerDisplayWindow()}><Monitor size={16} /> Open customer display</button>
            </div>
          </section>
          <section className="card">
            <h3>Local data</h3>
            <p>The register keeps a 7-day local journal of sales and events so it keeps working if the network is down. Everything is also sent to the back office.</p>
            <button
              className="key key--sm key--danger"
              onClick={() => {
                if (!confirm('Clear ALL local register data (journal, held sales, session, settings)? Events already synced are kept in the back office.')) return;
                for (const k of Object.keys(localStorage)) if (k.startsWith('aguila.')) localStorage.removeItem(k);
                location.href = '/';
              }}
            >
              <Trash2 size={16} /> Reset this register
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
