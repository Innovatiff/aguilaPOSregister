import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cloud, CreditCard, Monitor, ScanBarcode, ShieldCheck, Wifi, Coffee, Printer } from 'lucide-react';
import { EagleMark } from '../components/Icon';

export default function AboutPage() {
  const nav = useNavigate();
  return (
    <div className="page">
      <header className="page__header">
        <button className="key key--sm" onClick={() => nav('/')}><ArrowLeft size={16} /> Volver</button>
        <h1>Acerca de Aguila POS</h1>
      </header>
      <div className="page__body">
        <section className="card" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <EagleMark size={72} />
          <div>
            <h3 style={{ fontSize: 22, marginBottom: 4 }}>Aguila POS Suite — Caja</h3>
            <p>Versión 1.0.0 (versión de demostración) · Punto de venta táctil para El Águila Market · Parte de Aguila POS Suite junto con la aplicación de administración Back Office.</p>
            <p>Desarrollado por Innovatiff. Esta versión de evaluación contiene únicamente datos de demostración.</p>
          </div>
        </section>
        <section className="card">
          <h3>Qué hace la caja</h3>
          <div className="feature-grid">
            <div className="feature"><b><ShieldCheck size={16} /> Inicio de sesión con PIN y turnos</b><p>Cada asociado inicia sesión con un PIN. El fondo inicial, los descansos y los conteos del cajón quedan registrados.</p></div>
            <div className="feature"><b><Coffee size={16} /> Descanso = segmento cerrado</b><p>Al tomar un descanso se cierra el segmento del asociado y se envía un reporte completo al gerente al instante.</p></div>
            <div className="feature"><b><ScanBarcode size={16} /> Escaneo</b><p>Los escáneres USB funcionan sin configuración: UPC/EAN, etiquetas PLU de frutas y verduras y etiquetas de precio de la báscula.</p></div>
            <div className="feature"><b><CreditCard size={16} /> Pagos</b><p>Teclas rápidas de efectivo, débito Interac, Visa, MasterCard, Amex, tarjetas de regalo y pagos divididos, con un flujo de terminal semi-integrada.</p></div>
            <div className="feature"><b><Monitor size={16} /> Pantalla del cliente</b><p>Una segunda pantalla muestra al cliente cada artículo, el total y su cambio.</p></div>
            <div className="feature"><b><Wifi size={16} /> Funciona sin conexión</b><p>Si se cae el internet la caja sigue vendiendo; cada evento se pone en cola y se sincroniza al volver la conexión.</p></div>
            <div className="feature"><b><Printer size={16} /> Recibos</b><p>Recibos térmicos de 80 mm con desglose de HST; las reimpresiones quedan registradas para el gerente.</p></div>
            <div className="feature"><b><Cloud size={16} /> Administración en vivo</b><p>Cada movimiento — ventas, anulaciones, descuentos, aperturas de cajón, consultas de precio — se transmite al panel del gerente.</p></div>
          </div>
        </section>
        <section className="card">
          <h3>Plan de hardware</h3>
          <div className="list">
            <div className="list-item"><div><b>Terminal de pago (Interac / Moneris)</b><span>Semi-integrada: la caja envía el monto, el cliente paga en el PIN pad y la aprobación regresa automáticamente.</span></div><span className="badge badge--warn">planeado</span></div>
            <div className="list-item"><div><b>Doble pantalla</b><span>Pantalla táctil del asociado + pantalla para el cliente (ya disponible mediante la ventana /customer).</span></div><span className="badge badge--success">listo</span></div>
            <div className="list-item"><div><b>Escáner de códigos de barras</b><span>Escáneres USB tipo teclado para la caja y para conteos de inventario en administración.</span></div><span className="badge badge--success">listo</span></div>
            <div className="list-item"><div><b>Impresora de recibos y cajón de efectivo</b><span>Impresora térmica ESC/POS con apertura del cajón controlada por la impresora.</span></div><span className="badge badge--warn">planeado</span></div>
          </div>
        </section>
        <section className="card">
          <h3>Soporte</h3>
          <p>Innovatiff · mesa de soporte disponible de lunes a sábado · Asistencia remota e instalación en sitio disponibles en la región de Windsor–Essex.</p>
          <p className="muted">© {new Date().getFullYear()} Innovatiff. Todos los nombres de productos son marcas registradas de sus respectivos propietarios.</p>
        </section>
      </div>
    </div>
  );
}
