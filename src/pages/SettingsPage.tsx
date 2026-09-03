import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Monitor, Printer, RefreshCw, ScanBarcode, Scale, Trash2 } from 'lucide-react';
import { useSettings, type TerminalMode, type PrintMode } from '../state/settings';
import { useCatalog } from '../state/catalog';
import { useSync } from '../sync/queue';
import { bootstrap, syncNow } from '../sync';
import { simulateScan } from '../hardware/scanner';
import { buildPriceEmbedded } from '../core/barcode';
import { getTerminal, TERMINAL_PHASE_LABEL, type TerminalPhase } from '../hardware/terminal';
import { printText } from '../hardware/printer';
import { openCustomerDisplayWindow } from '../hardware/customerDisplay';
import { toast } from '../state/ui';
import { useSession } from '../state/session';
import { CATALOG_SOURCE_LABEL } from '../core/format';

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
        <button className="key key--sm" onClick={() => nav('/')}><ArrowLeft size={16} /> Volver</button>
        <h1>Configuración y hardware</h1>
        <span className="muted">{status === 'active' ? 'Sesión iniciada' : 'Sesión cerrada'} · v1.0.0</span>
      </header>
      <div className="page__body">
        <div className="page__cols">
          <section className="card">
            <h3>Conexión con administración</h3>
            <div className="form-row"><label className="label">URL base de la API</label><input className="input" value={s.apiBaseUrl} onChange={(e) => s.update({ apiBaseUrl: e.target.value })} /></div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="form-row"><label className="label">ID de la caja</label><input className="input" value={s.registerId} onChange={(e) => s.update({ registerId: e.target.value })} /></div>
              <div className="form-row"><label className="label">Nombre de la caja</label><input className="input" value={s.registerName} onChange={(e) => s.update({ registerName: e.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginTop: 10 }}><label className="label">Clave del dispositivo</label><input className="input" value={s.registerKey} onChange={(e) => s.update({ registerKey: e.target.value })} /></div>
            <p>
              Estado: <span className={`badge ${sync.online ? 'badge--success' : 'badge--danger'}`}>{sync.online ? 'en línea' : 'sin conexión'}</span> · {sync.queue.length} en cola · {sync.sentCount} enviados · catálogo {catalog.version} ({CATALOG_SOURCE_LABEL[catalog.source] ?? catalog.source}){sync.lastError ? ` · último error: ${sync.lastError}` : ''}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="key key--sm key--info" onClick={() => void syncNow()}><RefreshCw size={16} /> Sincronizar ahora</button>
              <button className="key key--sm" onClick={() => void bootstrap().then((ok) => toast(ok ? 'Catálogo, tienda y empleados actualizados desde administración' : 'No se pudo conectar con administración', ok ? 'success' : 'danger'))}>Recargar catálogo del servidor</button>
            </div>
          </section>
          <section className="card">
            <h3>Hardware</h3>
            <div className="form-grid">
              <div className="form-row">
                <label className="label">Terminal de pago</label>
                <select className="select" value={s.terminalMode} onChange={(e) => s.update({ terminalMode: e.target.value as TerminalMode })}>
                  <option value="simulated">Terminal simulada (demo)</option>
                  <option value="moneris">Moneris — semi-integrada (próximamente)</option>
                  <option value="globalpayments">Global Payments — semi-integrada (próximamente)</option>
                  <option value="none">Terminal independiente (confirmación manual)</option>
                </select>
              </div>
              <div className="form-row">
                <label className="label">Impresión de recibos</label>
                <select className="select" value={s.printMode} onChange={(e) => s.update({ printMode: e.target.value as PrintMode })}>
                  <option value="preview">Mostrar recibo, imprimir a solicitud</option>
                  <option value="auto">Imprimir automáticamente</option>
                  <option value="off">No imprimir</option>
                </select>
              </div>
            </div>
            <div className="list" style={{ marginTop: 10 }}>
              <label className="switch"><span>Aprobar automáticamente pagos con tarjeta simulados</span><input type="checkbox" checked={s.terminalAutoApprove} onChange={(e) => s.update({ terminalAutoApprove: e.target.checked })} /></label>
              <label className="switch"><span>Pantalla del cliente habilitada</span><input type="checkbox" checked={s.customerDisplayEnabled} onChange={(e) => s.update({ customerDisplayEnabled: e.target.checked })} /></label>
              <label className="switch"><span>Sonidos de teclas y escáner</span><input type="checkbox" checked={s.soundEnabled} onChange={(e) => s.update({ soundEnabled: e.target.checked })} /></label>
            </div>
          </section>
          <section className="card">
            <h3>Aprobaciones y controles</h3>
            <div className="form-grid">
              <div className="form-row"><label className="label">Anulación requiere aprobación arriba de ($)</label><input className="input" type="number" value={s.approval.voidAbove} onChange={(e) => s.update({ approval: { ...s.approval, voidAbove: parseFloat(e.target.value) || 0 } })} /></div>
              <div className="form-row"><label className="label">Descuento requiere aprobación arriba de (%)</label><input className="input" type="number" value={s.approval.discountAbovePct} onChange={(e) => s.update({ approval: { ...s.approval, discountAbovePct: parseFloat(e.target.value) || 0 } })} /></div>
              <div className="form-row"><label className="label">Descuento requiere aprobación arriba de ($)</label><input className="input" type="number" value={s.approval.discountAboveAmount} onChange={(e) => s.update({ approval: { ...s.approval, discountAboveAmount: parseFloat(e.target.value) || 0 } })} /></div>
            </div>
            <div className="list" style={{ marginTop: 10 }}>
              <label className="switch"><span>Los cambios de precio requieren PIN de supervisor</span><input type="checkbox" checked={s.approval.priceOverrideRequiresManager} onChange={(e) => s.update({ approval: { ...s.approval, priceOverrideRequiresManager: e.target.checked } })} /></label>
              <label className="switch"><span>Las devoluciones requieren PIN de supervisor</span><input type="checkbox" checked={s.approval.returnsRequireManager} onChange={(e) => s.update({ approval: { ...s.approval, returnsRequireManager: e.target.checked } })} /></label>
            </div>
          </section>
          <section className="card">
            <h3>Banco de pruebas de hardware</h3>
            <p>Use estas herramientas para demostrar las integraciones de hardware sin dispositivos físicos.</p>
            <h4 className="label"><ScanBarcode size={14} /> Escáner de códigos de barras (tipo teclado)</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="select" value={scanCode} onChange={(e) => setScanCode(e.target.value)}>
                <option value="">Elija un artículo del catálogo…</option>
                {barcoded.slice(0, 60).map((p) => <option key={p.id} value={p.barcode!}>{p.name} — {p.barcode}</option>)}
              </select>
              <button className="key key--sm key--accent" disabled={!scanCode || status !== 'active'} onClick={() => { simulateScan(scanCode); toast(`Escaneado ${scanCode}`, 'info'); nav('/'); }}>Escanear</button>
            </div>
            <h4 className="label" style={{ marginTop: 12 }}><Scale size={14} /> Etiqueta de báscula (UPC con precio incluido)</h4>
            <div className="form-grid">
              <select className="select" value={scaleProduct} onChange={(e) => setScaleProduct(e.target.value)}>
                {weighed.map((p) => <option key={p.id} value={p.id}>{p.name} — ${p.price}/kg</option>)}
              </select>
              <input className="input" value={scaleKg} onChange={(e) => setScaleKg(e.target.value)} placeholder="kg" />
            </div>
            <p className="mono" style={{ fontSize: 13 }}>Código de la etiqueta: {label} {sp ? `(→ $${((parseFloat(scaleKg) || 0) * sp.price).toFixed(2)})` : ''}</p>
            <button className="key key--sm key--accent" disabled={!label || status !== 'active'} onClick={() => { simulateScan(label); nav('/'); }}>Escanear etiqueta de báscula</button>
            <h4 className="label" style={{ marginTop: 12 }}><CreditCard size={14} /> Terminal de pago</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge--info">{TERMINAL_PHASE_LABEL[termPhase] ?? termPhase}</span>
              <button className="key key--sm" onClick={() => void terminal.startPayment(1.0, 'debit')}>Enviar prueba de $1.00</button>
              <button className="key key--sm key--success" onClick={() => terminal.simulateTap()}>Acercar tarjeta</button>
              <button className="key key--sm key--danger" onClick={() => terminal.cancel()}>Cancelar</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button className="key key--sm" onClick={() => printText('EL ÁGUILA MARKET\nPRUEBA DE IMPRESORA OK\n' + new Date().toLocaleString('es-US'), 'Prueba de impresora')}><Printer size={16} /> Impresión de prueba</button>
              <button className="key key--sm" onClick={() => openCustomerDisplayWindow()}><Monitor size={16} /> Abrir pantalla del cliente</button>
            </div>
          </section>
          <section className="card">
            <h3>Datos locales</h3>
            <p>La caja conserva un registro local de 7 días de ventas y eventos para seguir funcionando si la red falla. Todo se envía también a administración.</p>
            <button
              className="key key--sm key--danger"
              onClick={() => {
                if (!confirm('¿Borrar TODOS los datos locales de esta caja (registro, ventas en espera, sesión, configuración)? Los eventos ya sincronizados se conservan en administración.')) return;
                for (const k of Object.keys(localStorage)) if (k.startsWith('aguila.')) localStorage.removeItem(k);
                location.href = '/';
              }}
            >
              <Trash2 size={16} /> Restablecer esta caja
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
