// ---------------------------------------------------------------------------
// POS orchestration: every business operation of the register lives here.
// Components call `pos.*`; this module updates the stores, records events in the
// local journal, queues them for the back office and drives the hardware.
// ---------------------------------------------------------------------------
import type { Category, Employee, EventType, PosEvent, Product, Segment, Shift, TenderType, Transaction, Role } from '../core/types';
import { makeEvent, setEventSeq } from '../core/events';
import { buildSegmentReport } from '../core/report';
import { parseBarcode, type ParsedBarcode } from '../core/barcode';
import { parseAmountBuffer, parseQtyBuffer, round2, round3, formatMoney } from '../core/money';
import { TENDER_LABEL, BARCODE_KIND_LABEL, plural } from '../core/format';
import { uuid } from '../core/ids';
import { hashPin } from '../core/pin';
import * as cartOps from '../core/cart';
import { computeLine } from '../core/tax';
import { useSettings } from './settings';
import { useCatalog, findProductByBarcode, findProductByPlu, employeeFullName } from './catalog';
import { useSession, currentShift, currentSegment } from './session';
import { useJournal } from './journal';
import { useCart } from './cart';
import { ask, toast, useUI } from './ui';
import { useSync } from '../sync/queue';
import { api } from '../sync/api';
import { startSync } from '../sync';
import { onScan } from '../hardware/scanner';
import { getTerminal } from '../hardware/terminal';
import { publishDisplay, type DisplayPhase } from '../hardware/customerDisplay';
import { printText, receiptText } from '../hardware/printer';
import { sounds } from '../hardware/sounds';

const ROLE_RANK: Record<Role, number> = { cashier: 0, supervisor: 1, manager: 2 };

// ------------------------------------------------------------------ helpers
function taxes() {
  return useCatalog.getState().store.taxes;
}
function categories() {
  return useCatalog.getState().categories;
}
function money(n: number) {
  const { store } = useCatalog.getState();
  return formatMoney(n, store.locale, store.currency);
}
function play(fn: () => void) {
  if (useSettings.getState().soundEnabled) fn();
}

export function emit<T extends Record<string, unknown>>(type: EventType, summary: string, payload: T, txnId: string | null = null): PosEvent<T> {
  const s = useSession.getState();
  const shift = currentShift();
  const seg = currentSegment(shift);
  const ev = makeEvent(type, summary, payload, {
    registerId: useSettings.getState().registerId,
    employeeId: s.employee?.id ?? null,
    employeeName: s.employee ? employeeFullName(s.employee) : null,
    shiftId: shift?.id ?? null,
    segmentId: seg?.id ?? null,
    txnId,
  });
  useJournal.getState().recordEvent(ev);
  useSync.getState().enqueue(ev);
  return ev;
}

function emitFor(shift: Shift, segment: Segment | null, employee: Employee, type: EventType, summary: string, payload: Record<string, unknown>) {
  const ev = makeEvent(type, summary, payload, {
    registerId: useSettings.getState().registerId,
    employeeId: employee.id,
    employeeName: employeeFullName(employee),
    shiftId: shift.id,
    segmentId: segment?.id ?? null,
  });
  useJournal.getState().recordEvent(ev);
  useSync.getState().enqueue(ev);
  return ev;
}

function requireSession(): { employee: Employee; shift: Shift; segment: Segment } | null {
  const s = useSession.getState();
  const shift = currentShift();
  const segment = currentSegment(shift);
  if (!s.employee || !shift || !segment || s.status !== 'active') {
    toast('Inicie sesión para usar la caja', 'warning');
    return null;
  }
  return { employee: s.employee, shift, segment };
}

function ensureTxn(): Transaction | null {
  const ctx = requireSession();
  if (!ctx) return null;
  const cart = useCart.getState();
  if (cart.txn) return cart.txn;
  const number = useJournal.getState().nextReceiptNumber(useSettings.getState().registerId);
  const txn = cartOps.newTransaction({
    number,
    registerId: useSettings.getState().registerId,
    employeeId: ctx.employee.id,
    employeeName: employeeFullName(ctx.employee),
    shiftId: ctx.shift.id,
    segmentId: ctx.segment.id,
    taxes: taxes(),
  });
  useCart.getState().setTxn(txn);
  emit('SALE_START', `Venta ${number} iniciada`, { number }, txn.id);
  return txn;
}

function setTxn(txn: Transaction) {
  useCart.getState().setTxn(txn);
  useSession.getState().touch();
}

async function verifyPin(pin: string): Promise<Employee | null> {
  if (!/^\d{4,6}$/.test(pin)) return null;
  if (useSync.getState().online) {
    try {
      const r = await api.verifyPin(pin);
      return r.employee;
    } catch {
      /* fall back to local verification */
    }
  }
  for (const e of useCatalog.getState().employees) {
    if (!e.active) continue;
    if (e.pin && e.pin === pin) return e;
    if (e.pinHash && (await hashPin(e.id, pin)) === e.pinHash) return e;
  }
  return null;
}

/** Ask a supervisor/manager to approve a restricted action. Records the outcome. */
async function requireApproval(action: string, detail: string, minRole: 'supervisor' | 'manager' = 'supervisor'): Promise<Employee | null> {
  const me = useSession.getState().employee;
  if (me && ROLE_RANK[me.role] >= ROLE_RANK[minRole]) return me;
  const approver = await ask<Employee | null>((resolve) => ({ kind: 'pin', title: `Se requiere aprobación de ${minRole === 'manager' ? 'gerente' : 'supervisor'}`, subtitle: `${action}: ${detail}`, minRole, resolve }));
  if (approver) {
    emit('MANAGER_OVERRIDE', `${employeeFullName(approver)} aprobó: ${action} — ${detail}`, { action, detail, approvedBy: approver.id, approvedByName: employeeFullName(approver) }, useCart.getState().txn?.id ?? null);
    play(sounds.success);
  } else {
    emit('MANAGER_OVERRIDE_DENIED', `Aprobación no otorgada: ${action} — ${detail}`, { action, detail }, useCart.getState().txn?.id ?? null);
  }
  return approver;
}

export async function verifyApprover(pin: string, minRole: 'supervisor' | 'manager'): Promise<Employee | null> {
  const e = await verifyPin(pin);
  if (!e) return null;
  return ROLE_RANK[e.role] >= ROLE_RANK[minRole] ? e : null;
}

// ------------------------------------------------------------- customer display
function pushDisplay(phase?: DisplayPhase, message: string | null = null, extra: { changeDue?: number } = {}) {
  const { store } = useCatalog.getState();
  const { registerId } = useSettings.getState();
  const s = useSession.getState();
  const cart = useCart.getState();
  const txn = cart.txn;
  const derivedPhase: DisplayPhase = phase ?? (txn && txn.lines.some((l) => !l.voided) ? (txn.tenders.length ? 'paying' : 'sale') : 'idle');
  publishDisplay({
    phase: derivedPhase,
    storeName: store.name,
    registerId,
    cashierName: s.employee ? s.employee.firstName : null,
    lines: txn
      ? txn.lines
          .filter((l) => !l.voided)
          .map((l) => ({ id: l.id, name: l.name, qty: l.qty, unit: l.unit, unitPrice: l.unitPrice, isReturn: l.isReturn, discount: l.discount, extended: computeLine(l).extended }))
      : [],
    totals: txn?.totals ?? null,
    tenders: txn?.tenders ?? [],
    balanceDue: txn ? cartOps.balanceDue(txn) : 0,
    changeDue: extra.changeDue ?? 0,
    message,
    updatedAt: new Date().toISOString(),
  });
}

// ------------------------------------------------------------------ session
async function signInWithPin(pin: string): Promise<{ ok: boolean; error?: string }> {
  const s = useSession.getState();
  const employee = await verifyPin(pin);
  if (!employee) {
    s.bumpFailed();
    emit('LOGIN_FAILED', `Intento de PIN fallido (${s.failedPinAttempts + 1})`, { attempts: s.failedPinAttempts + 1 });
    play(sounds.error);
    return { ok: false, error: 'PIN no reconocido' };
  }
  s.resetFailed();

  if (s.status === 'locked' && s.employee) {
    if (employee.id === s.employee.id || ROLE_RANK[employee.role] >= ROLE_RANK.supervisor) {
      useSession.getState().setActive(s.employee);
      emit('SESSION_UNLOCK', employee.id === s.employee.id ? `${employeeFullName(employee)} desbloqueó la caja` : `${employeeFullName(employee)} desbloqueó la caja para ${employeeFullName(s.employee)}`, { by: employee.id });
      pushDisplay();
      return { ok: true };
    }
    play(sounds.error);
    return { ok: false, error: `Bloqueada por ${employeeFullName(s.employee)}. Solo esa persona o un supervisor puede desbloquearla.` };
  }

  const existing = useSession.getState().shifts[employee.id];
  if (existing && existing.status === 'on_break') {
    const lastSeg = existing.segments[existing.segments.length - 1];
    const breakMinutes = lastSeg?.endedAt ? Math.round((Date.now() - Date.parse(lastSeg.endedAt)) / 60000) : 0;
    const seg: Segment = { id: uuid(), shiftId: existing.id, index: existing.segments.length, startedAt: new Date().toISOString(), endedAt: null, endReason: null, report: null };
    const shift: Shift = { ...existing, status: 'open', segments: [...existing.segments, seg] };
    useSession.getState().upsertShift(shift);
    useSession.getState().setActive(employee);
    emitFor(shift, seg, employee, 'BREAK_END', `${employeeFullName(employee)} regresó del descanso (${breakMinutes} min)`, { breakMinutes, segmentIndex: seg.index });
    emit('SESSION_LOGIN', `${employeeFullName(employee)} inició sesión`, { role: employee.role, resumed: true });
    toast(`Bienvenido/a de nuevo, ${employee.firstName}. Nuevo segmento iniciado.`, 'success');
    pushDisplay();
    return { ok: true };
  }
  if (existing && existing.status === 'open') {
    useSession.getState().setActive(employee);
    emit('SESSION_LOGIN', `${employeeFullName(employee)} inició sesión`, { role: employee.role, resumed: true });
    pushDisplay();
    return { ok: true };
  }

  const openingFloat = await ask<number | null>((resolve) => ({ kind: 'opening-float', employee, resolve }));
  if (openingFloat === null) return { ok: false, error: 'Inicio de sesión cancelado' };
  const shiftId = uuid();
  const seg: Segment = { id: uuid(), shiftId, index: 0, startedAt: new Date().toISOString(), endedAt: null, endReason: null, report: null };
  const shift: Shift = {
    id: shiftId,
    registerId: useSettings.getState().registerId,
    employeeId: employee.id,
    employeeName: employeeFullName(employee),
    startedAt: seg.startedAt,
    endedAt: null,
    openingFloat: round2(openingFloat),
    status: 'open',
    segments: [seg],
    closing: null,
  };
  useSession.getState().upsertShift(shift);
  useSession.getState().setActive(employee);
  emit('SHIFT_START', `${employeeFullName(employee)} inició un turno con un fondo de ${money(openingFloat)}`, { openingFloat: round2(openingFloat), role: employee.role });
  emit('SESSION_LOGIN', `${employeeFullName(employee)} inició sesión`, { role: employee.role, resumed: false });
  play(sounds.success);
  toast(`Turno iniciado. ¡Que tenga un buen día, ${employee.firstName}!`, 'success');
  pushDisplay();
  return { ok: true };
}

function lock() {
  const s = useSession.getState();
  if (s.status !== 'active' || !s.employee) return;
  emit('SESSION_LOCK', `${employeeFullName(s.employee)} bloqueó la caja`, {});
  s.setLocked();
}

function buildCurrentSegmentReport(shift: Shift, segment: Segment, endedAt: string) {
  const j = useJournal.getState();
  return buildSegmentReport({ shift, segmentId: segment.id, startedAt: segment.startedAt, endedAt, transactions: j.transactions, events: j.events, categories: categories() });
}

async function startBreak() {
  const ctx = requireSession();
  if (!ctx) return;
  if (useCart.getState().txn && cartOps.isPayable(useCart.getState().txn!)) {
    toast('Termine o ponga en espera la venta actual antes de tomar el descanso', 'warning');
    return;
  }
  const ok = await ask<boolean>((resolve) => ({ kind: 'confirm', title: '¿Tomar descanso?', message: `Esto cierra su segmento actual y envía el reporte a administración. La caja quedará bloqueada hasta que usted u otro asociado inicie sesión.`, confirmLabel: 'Cerrar segmento e iniciar descanso', resolve }));
  if (!ok) return;
  const endedAt = new Date().toISOString();
  const report = buildCurrentSegmentReport(ctx.shift, ctx.segment, endedAt);
  useUI.getState().openModal({
    kind: 'closing-report',
    report,
    mode: 'break',
    onConfirm: () => {
      const seg: Segment = { ...ctx.segment, endedAt, endReason: 'break', report };
      const shift: Shift = { ...ctx.shift, status: 'on_break', segments: ctx.shift.segments.map((s) => (s.id === seg.id ? seg : s)) };
      useSession.getState().upsertShift(shift);
      emitFor(shift, seg, ctx.employee, 'BREAK_START', `${employeeFullName(ctx.employee)} tomó un descanso — segmento ${seg.index + 1} cerrado: ${plural(report.transactions, 'venta')}, ${money(report.total)}`, { report, segmentIndex: seg.index });
      emit('SESSION_LOGOUT', `${employeeFullName(ctx.employee)} cerró sesión (descanso)`, { reason: 'break' });
      useSession.getState().setSignedOut();
      useCart.getState().setTxn(null);
      useCart.getState().clearBuffer();
      useUI.getState().closeModal();
      pushDisplay('idle', 'Esta caja está cerrada temporalmente. Por favor use la siguiente caja.');
      toast('Descanso iniciado. Reporte del segmento enviado a administración.', 'success');
    },
  });
}

async function endShift() {
  const ctx = requireSession();
  if (!ctx) return;
  if (useCart.getState().txn && cartOps.isPayable(useCart.getState().txn!)) {
    toast('Termine o ponga en espera la venta actual antes de cerrar el turno', 'warning');
    return;
  }
  useUI.getState().openModal({ kind: 'end-shift' });
}

function finalizeShift(countedCash: number, denominations: Record<string, number>, notes: string) {
  const ctx = requireSession();
  if (!ctx) return;
  const endedAt = new Date().toISOString();
  const segReport = buildCurrentSegmentReport(ctx.shift, ctx.segment, endedAt);
  const seg: Segment = { ...ctx.segment, endedAt, endReason: 'shift_end', report: segReport };
  const shiftWithSeg: Shift = { ...ctx.shift, segments: ctx.shift.segments.map((s) => (s.id === seg.id ? seg : s)) };
  const j = useJournal.getState();
  const report = buildSegmentReport({ shift: shiftWithSeg, segmentId: null, startedAt: ctx.shift.startedAt, endedAt, transactions: j.transactions, events: j.events, categories: categories() });
  const expectedCash = report.cash.expectedInDrawer;
  const overShort = round2(countedCash - expectedCash);
  const closed: Shift = { ...shiftWithSeg, status: 'closed', endedAt, closing: { countedCash: round2(countedCash), expectedCash, overShort, denominations, notes, report } };
  emitFor(closed, seg, ctx.employee, 'SHIFT_END', `${employeeFullName(ctx.employee)} cerró el turno — ${plural(report.transactions, 'venta')}, ${money(report.total)}, cajón ${overShort === 0 ? 'cuadrado' : overShort > 0 ? `con sobrante de ${money(overShort)}` : `con faltante de ${money(Math.abs(overShort))}`}`, {
    report,
    segmentReport: segReport,
    closing: { countedCash: round2(countedCash), expectedCash, overShort, denominations, notes },
  });
  emit('SESSION_LOGOUT', `${employeeFullName(ctx.employee)} cerró sesión (fin de turno)`, { reason: 'shift_end' });
  useJournal.getState().recordClosedShift(closed);
  useSession.getState().removeShift(closed.id);
  useSession.getState().setSignedOut();
  useCart.getState().setTxn(null);
  useUI.getState().openModal({ kind: 'closing-report', report, mode: 'shift' });
  pushDisplay('idle', 'Esta caja está cerrada. Por favor use la siguiente caja.');
  play(sounds.success);
}

// --------------------------------------------------------------------- cart
type AddMethod = 'scan' | 'plu' | 'tile' | 'search' | 'duplicate' | 'open_dept';

async function addProduct(product: Product, method: AddMethod, opts: { qty?: number; unitPrice?: number } = {}) {
  const txn0 = ensureTxn();
  if (!txn0) return;
  const cart = useCart.getState();
  let qty = opts.qty ?? cart.pendingQty ?? undefined;
  if (product.soldByWeight && qty === undefined) {
    const kg = await ask<number | null>((resolve) => ({ kind: 'weight', product, resolve }));
    if (!kg) return;
    qty = kg;
  }
  const txn = useCart.getState().txn ?? txn0;
  const { txn: next, line, merged } = cartOps.addOrMergeProduct(txn, product, taxes(), { qty, isReturn: cart.returnMode, scanned: method === 'scan', unitPrice: opts.unitPrice });
  setTxn(next);
  useCart.getState().setPendingQty(null);
  useCart.getState().clearBuffer();
  useCart.getState().selectLine(line.id);
  const ext = computeLine(line).extended;
  emit('ITEM_ADD', `${cart.returnMode ? 'Devolución ' : ''}${line.unit === 'kg' ? `${line.qty.toFixed(3)} kg` : `${line.qty}×`} ${line.name} — ${money(Math.abs(ext))}${merged ? ' (agrupado)' : ''}`, { line, method, merged, lineTotal: ext }, next.id);
  play(method === 'scan' ? sounds.scan : sounds.key);
}

function addOpenDepartment(category: Category, amount: number) {
  const txn = ensureTxn();
  if (!txn) return;
  const cart = useCart.getState();
  const line = cartOps.lineFromOpenDepartment(category, amount, { qty: cart.pendingQty ?? 1, isReturn: cart.returnMode });
  const next = cartOps.addLine(txn, line, taxes());
  setTxn(next);
  useCart.getState().setPendingQty(null);
  useCart.getState().clearBuffer();
  useCart.getState().selectLine(line.id);
  emit('ITEM_ADD', `${cart.returnMode ? 'Devolución ' : ''}${line.qty}× artículo abierto de ${category.name} a ${money(amount)}`, { line, method: 'open_dept' as AddMethod, merged: false, lineTotal: computeLine(line).extended }, next.id);
  play(sounds.key);
  toast(`${category.name}: ${money(amount)} agregado`, 'success');
}

/** Category key: with an amount typed it rings an open-department item; otherwise it opens the item grid. */
function handleCategoryTap(category: Category) {
  const { buffer } = useCart.getState();
  if (buffer) {
    const amount = parseAmountBuffer(buffer);
    if (amount <= 0) {
      toast('Primero ingrese un monto', 'warning');
      return;
    }
    addOpenDepartment(category, amount);
    return;
  }
  useCart.getState().setView('items', category.id);
}

async function handleScan(raw: string) {
  const parsed = parseBarcode(raw);
  const ctx = requireSession();
  if (!ctx) return;
  if (parsed.kind === 'price-embedded') {
    const product = findProductByPlu(parsed.code);
    if (product && parsed.embeddedPrice !== undefined) {
      if (product.soldByWeight) {
        const kg = round3(parsed.embeddedPrice / product.price);
        await addProduct(product, 'scan', { qty: kg });
      } else {
        await addProduct(product, 'scan', { unitPrice: parsed.embeddedPrice });
      }
      return;
    }
  } else if (parsed.kind === 'upc-a' || parsed.kind === 'ean-13') {
    const product = findProductByBarcode(parsed.code) ?? findProductByBarcode(parsed.raw);
    if (product) {
      await addProduct(product, 'scan');
      return;
    }
  } else if (parsed.kind === 'plu') {
    const product = findProductByPlu(parsed.code);
    if (product) {
      await addProduct(product, 'scan');
      return;
    }
  }
  play(sounds.error);
  emit('SCAN_UNKNOWN', `Se escaneó un código desconocido ${parsed.raw} (${BARCODE_KIND_LABEL[parsed.kind] ?? parsed.kind})`, { code: parsed.raw, kind: parsed.kind, valid: parsed.valid }, useCart.getState().txn?.id ?? null);
  useUI.getState().openModal({ kind: 'unknown-barcode', parsed });
}

async function enterPlu() {
  const { buffer } = useCart.getState();
  if (!buffer) {
    toast('Escriba un código PLU y luego presione ENTRAR', 'info');
    return;
  }
  const product = findProductByPlu(buffer) ?? findProductByBarcode(buffer);
  if (!product) {
    play(sounds.error);
    toast(`PLU ${buffer} no encontrado`, 'danger');
    emit('SCAN_UNKNOWN', `PLU ${buffer} no encontrado`, { code: buffer, kind: 'plu-entry', valid: false }, useCart.getState().txn?.id ?? null);
    useCart.getState().clearBuffer();
    return;
  }
  useCart.getState().clearBuffer();
  await addProduct(product, 'plu');
}

/** "@/For": type a quantity then press it; the next item rings with that quantity. */
function applyQuantityKey() {
  const cart = useCart.getState();
  const q = parseQtyBuffer(cart.buffer);
  if (cart.selectedLineId && cart.txn && !cart.buffer) {
    void setQtySelected();
    return;
  }
  if (q <= 0 || q > 999) {
    toast('Primero escriba una cantidad (p. ej. 3, luego Cant. y después el artículo)', 'info');
    return;
  }
  cart.setPendingQty(q);
  cart.clearBuffer();
  toast(`Cantidad ${q} — ahora elija un artículo`, 'info');
}

async function setQtySelected() {
  const cart = useCart.getState();
  const txn = cart.txn;
  const line = txn?.lines.find((l) => l.id === cart.selectedLineId && !l.voided);
  if (!txn || !line) {
    toast('Primero seleccione una línea', 'info');
    return;
  }
  if (txn.tenders.length) {
    toast('Elimine los pagos antes de cambiar cantidades', 'warning');
    return;
  }
  let qty: number | null = cart.buffer ? parseQtyBuffer(cart.buffer) : null;
  if (qty === null) qty = await ask<number | null>((resolve) => ({ kind: 'qty', lineId: line.id, resolve }));
  if (!qty || qty <= 0) return;
  const next = cartOps.setLineQty(txn, line.id, qty, taxes());
  setTxn(next);
  cart.clearBuffer();
  emit('ITEM_QTY', `${line.name}: cantidad ${line.qty} → ${qty}`, { lineId: line.id, name: line.name, from: line.qty, to: qty }, txn.id);
}

function duplicateLast() {
  const cart = useCart.getState();
  const txn = cart.txn;
  const last = txn ? cartOps.lastActiveLine(txn) : undefined;
  if (!txn || !last) {
    toast('Nada que repetir', 'info');
    return;
  }
  if (last.openDepartment) {
    const cat = categories().find((c) => c.id === last.categoryId);
    if (cat) addOpenDepartment(cat, last.unitPrice);
    return;
  }
  const product = useCatalog.getState().products.find((p) => p.id === last.productId);
  if (product) void addProduct(product, 'duplicate', { qty: last.unit === 'kg' ? last.qty : 1 });
}

async function voidSelected() {
  const cart = useCart.getState();
  const txn = cart.txn;
  const line = txn?.lines.find((l) => l.id === cart.selectedLineId && !l.voided) ?? (txn ? cartOps.lastActiveLine(txn) : undefined);
  if (!txn || !line) {
    toast('Seleccione la línea que desea anular', 'info');
    return;
  }
  const amount = Math.abs(computeLine(line).extended);
  const settings = useSettings.getState();
  if (amount > settings.approval.voidAbove || txn.tenders.length > 0) {
    const ok = await requireApproval('Anular artículo', `${line.name} ${money(amount)}`);
    if (!ok) return;
  }
  const reason = await ask<string | null>((resolve) => ({ kind: 'reason', title: `Anular ${line.name}`, options: ['El cliente cambió de opinión', 'Artículo equivocado', 'Escaneado dos veces', 'Disputa de precio', 'Dañado', 'Otro'], resolve }));
  if (!reason) return;
  const next = cartOps.voidLine(txn, line.id, reason, taxes());
  setTxn(next);
  cart.selectLine(cartOps.lastActiveLine(next)?.id ?? null);
  emit('ITEM_VOID', `Se anuló ${line.name} (${money(amount)}) — ${reason}`, { line, reason, amount }, txn.id);
  play(sounds.error);
}

async function voidSale() {
  const txn = useCart.getState().txn;
  if (!txn) {
    toast('No hay una venta en curso', 'info');
    return;
  }
  const total = txn.totals.total;
  if (Math.abs(total) > useSettings.getState().approval.voidAbove || txn.tenders.length > 0) {
    const ok = await requireApproval('Anular venta', `${txn.number} ${money(total)}`);
    if (!ok) return;
  }
  const reason = await ask<string | null>((resolve) => ({ kind: 'reason', title: `Anular venta ${txn.number}`, options: ['El cliente se fue', 'El pago falló', 'Cliente equivocado', 'Capacitación', 'Otro'], resolve }));
  if (!reason) return;
  const voided: Transaction = { ...txn, status: 'voided', completedAt: new Date().toISOString(), voidReason: reason };
  useJournal.getState().recordTransaction(voided);
  emit('TXN_VOID', `Se anuló la venta ${txn.number} (${money(total)}, ${plural(txn.lines.filter((l) => !l.voided).length, 'artículo')}) — ${reason}`, { number: txn.number, total, lines: txn.lines.filter((l) => !l.voided).length, reason, transaction: voided }, txn.id);
  useCart.getState().setTxn(null);
  useCart.getState().clearBuffer();
  useCart.getState().selectLine(null);
  useCart.getState().setReturnMode(false);
  pushDisplay('idle');
  play(sounds.error);
  toast('Venta anulada', 'warning');
}

async function changePrice() {
  const cart = useCart.getState();
  const txn = cart.txn;
  const line = txn?.lines.find((l) => l.id === cart.selectedLineId && !l.voided) ?? (txn ? cartOps.lastActiveLine(txn) : undefined);
  if (!txn || !line) {
    toast('Seleccione la línea para cambiar su precio', 'info');
    return;
  }
  const typed = cart.buffer ? parseAmountBuffer(cart.buffer) : null;
  let approver: Employee | null = useSession.getState().employee;
  if (useSettings.getState().approval.priceOverrideRequiresManager) {
    approver = await requireApproval('Cambio de precio', `${line.name} ${money(line.unitPrice)}`);
    if (!approver) return;
  }
  const answer = typed && typed > 0 ? { price: typed, reason: 'Cambio de precio' } : await ask<{ price: number; reason: string } | null>((resolve) => ({ kind: 'price', lineId: line.id, resolve }));
  if (!answer) return;
  const next = cartOps.overrideLinePrice(txn, line.id, { from: line.unitPrice, to: answer.price, reason: answer.reason, approvedBy: approver?.id ?? null }, taxes());
  setTxn(next);
  cart.clearBuffer();
  emit('ITEM_PRICE_OVERRIDE', `${line.name}: precio ${money(line.unitPrice)} → ${money(answer.price)} (${answer.reason})`, { lineId: line.id, name: line.name, from: line.unitPrice, to: answer.price, reason: answer.reason, approvedBy: approver?.id ?? null }, txn.id);
}

async function discount(target: 'line' | 'txn', mode: 'amount' | 'percent') {
  const cart = useCart.getState();
  const txn = cart.txn;
  if (!txn || !cartOps.isPayable(txn)) {
    toast('Agregue artículos antes de aplicar un descuento', 'info');
    return;
  }
  const line = target === 'line' ? txn.lines.find((l) => l.id === cart.selectedLineId && !l.voided) ?? cartOps.lastActiveLine(txn) : undefined;
  if (target === 'line' && !line) return;
  const typed = cart.buffer ? parseQtyBuffer(cart.buffer) : null;
  const typedValue = typed && typed > 0 ? (mode === 'amount' ? parseAmountBuffer(cart.buffer) : typed) : null;
  const answer = typedValue ? { value: typedValue, reason: 'Promoción del gerente' } : await ask<{ value: number; reason: string } | null>((resolve) => ({ kind: 'discount', target, mode, lineId: line?.id, resolve }));
  if (!answer || answer.value <= 0) return;
  const base = target === 'line' && line ? Math.abs(computeLine({ ...line, discount: null }).gross) : txn.totals.subtotal;
  const amount = mode === 'percent' ? round2(base * (answer.value / 100)) : Math.min(base, answer.value);
  const s = useSettings.getState().approval;
  if ((mode === 'percent' && answer.value > s.discountAbovePct) || amount > s.discountAboveAmount) {
    const ok = await requireApproval('Descuento', `${mode === 'percent' ? `${answer.value}%` : money(answer.value)} en ${target === 'line' && line ? line.name : txn.number}`);
    if (!ok) return;
  }
  const disc = { type: mode, value: answer.value, reason: answer.reason };
  if (target === 'line' && line) {
    setTxn(cartOps.discountLine(txn, line.id, disc, taxes()));
    emit('ITEM_DISCOUNT', `Descuento ${mode === 'percent' ? `${answer.value}%` : money(answer.value)} en ${line.name} (${answer.reason}) = -${money(amount)}`, { lineId: line.id, name: line.name, discount: disc, amount }, txn.id);
  } else {
    setTxn(cartOps.discountTransaction(txn, disc, taxes()));
    emit('TXN_DISCOUNT', `Descuento en venta ${mode === 'percent' ? `${answer.value}%` : money(answer.value)} (${answer.reason}) = -${money(amount)}`, { discount: disc, amount }, txn.id);
  }
  cart.clearBuffer();
}

async function hold() {
  const txn = useCart.getState().txn;
  if (!txn || !cartOps.isPayable(txn)) {
    toast('No hay una venta para poner en espera', 'info');
    return;
  }
  if (txn.tenders.length) {
    toast('Elimine los pagos antes de poner la venta en espera', 'warning');
    return;
  }
  const label = await ask<string | null>((resolve) => ({ kind: 'hold', resolve }));
  if (label === null) return;
  const held: Transaction = { ...txn, status: 'held', holdLabel: label || `Cliente ${useCart.getState().held.length + 1}` };
  useCart.getState().setHeld([...useCart.getState().held, held]);
  useCart.getState().setTxn(null);
  useCart.getState().selectLine(null);
  emit('TXN_HOLD', `Venta ${txn.number} puesta en espera (${held.holdLabel}) — ${money(txn.totals.total)}`, { number: txn.number, total: txn.totals.total, label: held.holdLabel }, txn.id);
  pushDisplay('idle');
  toast(`Venta en espera: ${held.holdLabel}`, 'info');
}

function recall(held: Transaction) {
  const cart = useCart.getState();
  if (cart.txn && cartOps.isPayable(cart.txn)) {
    toast('Primero ponga en espera o termine la venta actual', 'warning');
    return;
  }
  const ctx = requireSession();
  if (!ctx) return;
  const txn: Transaction = cartOps.recompute({ ...held, status: 'open', holdLabel: null, employeeId: ctx.employee.id, employeeName: employeeFullName(ctx.employee), shiftId: ctx.shift.id, segmentId: ctx.segment.id }, taxes());
  cart.setHeld(cart.held.filter((h) => h.id !== held.id));
  cart.setTxn(txn);
  cart.selectLine(cartOps.lastActiveLine(txn)?.id ?? null);
  useUI.getState().closeModal();
  emit('TXN_RECALL', `Se recuperó la venta en espera ${txn.number} (${held.holdLabel}) — ${money(txn.totals.total)}`, { number: txn.number, total: txn.totals.total, label: held.holdLabel }, txn.id);
}

function toggleReturnMode() {
  const cart = useCart.getState();
  const on = !cart.returnMode;
  cart.setReturnMode(on);
  emit('RETURN_MODE', on ? 'Modo devolución ACTIVADO' : 'Modo devolución DESACTIVADO', { on }, cart.txn?.id ?? null);
  toast(on ? 'MODO DEVOLUCIÓN — los artículos se registran como reembolsos' : 'Modo devolución desactivado', on ? 'warning' : 'info');
}

async function noSale() {
  const ctx = requireSession();
  if (!ctx) return;
  const reason = await ask<string | null>((resolve) => ({ kind: 'reason', title: 'Sin venta — abrir cajón', options: ['Dar cambio a un cliente', 'Contar el cajón', 'Agregar billetes chicos / monedas', 'Sacar algo de debajo del cajón', 'Solicitud del gerente', 'Otro'], resolve }));
  if (!reason) return;
  emit('NO_SALE', `Cajón abierto sin venta — ${reason}`, { reason });
  play(sounds.drawer);
  toast('Cajón abierto (sin venta)', 'warning');
}

async function cashDrop() {
  const ctx = requireSession();
  if (!ctx) return;
  const a = await ask<{ amount: number; reason: string } | null>((resolve) => ({ kind: 'amount', title: 'Depósito a caja fuerte', subtitle: 'Retira efectivo del cajón; el total esperado en el cajón se reduce.', withReason: true, options: ['Exceso de efectivo — a caja fuerte', 'Depósito bancario', 'Solicitud del gerente'], resolve }));
  if (!a || a.amount <= 0) return;
  emit('CASH_DROP', `Depósito a caja fuerte ${money(a.amount)} — ${a.reason}`, { amount: a.amount, reason: a.reason });
  play(sounds.drawer);
  toast(`Depósito a caja fuerte de ${money(a.amount)} registrado`, 'success');
}

async function paidOut() {
  const ctx = requireSession();
  if (!ctx) return;
  const approver = await requireApproval('Pago de gasto', 'efectivo retirado para pagar un gasto');
  if (!approver) return;
  const a = await ask<{ amount: number; reason: string } | null>((resolve) => ({ kind: 'amount', title: 'Pago de gasto', subtitle: 'Efectivo pagado desde el cajón por un gasto de la tienda.', withReason: true, options: ['Entrega de proveedor (contra entrega)', 'Artículos de limpieza', 'Caja chica', 'Reembolso sin recibo', 'Otro'], resolve }));
  if (!a || a.amount <= 0) return;
  emit('PAID_OUT', `Pago de gasto ${money(a.amount)} — ${a.reason}`, { amount: a.amount, reason: a.reason, approvedBy: approver.id });
  play(sounds.drawer);
  toast(`Pago de gasto de ${money(a.amount)} registrado`, 'success');
}

function priceLookup() {
  const ctx = requireSession();
  if (!ctx) return;
  useUI.getState().openModal({ kind: 'price-lookup' });
}

function logPriceLookup(code: string, product: Product | undefined) {
  emit('PRICE_LOOKUP', product ? `Consulta de precio: ${product.name} = ${money(product.price)}${product.soldByWeight ? '/kg' : ''}` : `Consulta de precio: ${code} no encontrado`, { code, productId: product?.id ?? null, name: product?.name ?? null, price: product?.price ?? null });
}

function clearKey() {
  const cart = useCart.getState();
  if (cart.buffer) {
    cart.clearBuffer();
    return;
  }
  if (cart.pendingQty) {
    cart.setPendingQty(null);
    toast('Cantidad pendiente borrada', 'info');
    return;
  }
  if (cart.view !== 'categories') {
    cart.setView('categories', null);
    cart.setSearch('');
    return;
  }
  cart.selectLine(null);
}

// ------------------------------------------------------------------ tenders
function finishTransaction(txn: Transaction) {
  const done = cartOps.complete(txn);
  useJournal.getState().recordTransaction(done);
  for (const l of done.lines) {
    if (l.voided || !l.productId) continue;
    useCatalog.getState().adjustStock(l.productId, l.isReturn ? l.qty : -l.qty);
  }
  const { store } = useCatalog.getState();
  const receipt = receiptText(done, store);
  emit('TXN_COMPLETE', `Venta ${done.number} completada — ${money(done.totals.total)} (${plural(done.totals.itemCount, 'artículo')}, ${done.tenders.map((t) => TENDER_LABEL[t.type] ?? t.type).join(' + ')})${done.changeDue ? `, cambio ${money(done.changeDue)}` : ''}`, { transaction: done, receipt }, done.id);
  useCart.getState().setLastCompleted(done);
  useCart.getState().setTxn(null);
  useCart.getState().selectLine(null);
  useCart.getState().clearBuffer();
  useCart.getState().setReturnMode(false);
  useCart.getState().setView('categories', null);
  const cashUsed = done.tenders.some((t) => t.type === 'cash');
  if (cashUsed) play(sounds.drawer);
  else play(sounds.success);
  pushDisplay('complete', '¡Gracias por su compra en El Águila Market!', { changeDue: done.changeDue });
  const mode = useSettings.getState().printMode;
  if (mode === 'auto') printText(receipt, `Recibo ${done.number}`);
  useUI.getState().openModal({ kind: 'change', txn: done });
}

function tenderCash(fixedAmount?: number) {
  const txn = useCart.getState().txn;
  if (!txn || !cartOps.isPayable(txn)) {
    toast('Agregue artículos antes de cobrar', 'info');
    return;
  }
  const due = cartOps.balanceDue(txn);
  const buffer = useCart.getState().buffer;
  let amount = fixedAmount ?? (buffer ? parseAmountBuffer(buffer) : due);
  if (due < 0) amount = due; // refund: cash back to the customer
  if (amount === 0 && due !== 0) {
    toast('Ingrese un monto', 'warning');
    return;
  }
  const next = cartOps.addTender(txn, { type: 'cash', amount });
  setTxn(next);
  useCart.getState().clearBuffer();
  emit('TENDER', `Efectivo ${money(amount)} en ${txn.number} (saldo ${money(Math.max(0, cartOps.balanceDue(next)))})`, { tender: next.tenders[next.tenders.length - 1], balanceAfter: cartOps.balanceDue(next) }, txn.id);
  if (cartOps.balanceDue(next) <= 0.000001) finishTransaction(next);
  else pushDisplay('paying');
}

async function tenderCard(type: TenderType) {
  const txn = useCart.getState().txn;
  if (!txn || !cartOps.isPayable(txn)) {
    toast('Agregue artículos antes de cobrar', 'info');
    return;
  }
  const due = cartOps.balanceDue(txn);
  const buffer = useCart.getState().buffer;
  let amount = buffer ? parseAmountBuffer(buffer) : due;
  if (due < 0) amount = due;
  if (amount === 0 || (due > 0 && amount > due)) {
    toast(amount > due ? 'El monto con tarjeta no puede exceder el saldo pendiente' : 'Ingrese un monto', 'warning');
    return;
  }
  useCart.getState().clearBuffer();
  const settings = useSettings.getState();
  if (settings.terminalMode === 'none') {
    // Stand-alone terminal: the cashier keys the amount on the PIN pad and confirms approval here.
    const ok = await ask<boolean>((resolve) => ({ kind: 'confirm', title: `${(TENDER_LABEL[type] ?? type).toUpperCase()} ${money(Math.abs(amount))}`, message: 'Procese el pago en la terminal independiente y luego confirme que fue aprobado.', confirmLabel: 'Aprobado', resolve }));
    if (!ok) return;
    const next = cartOps.addTender(txn, { type, amount, ref: 'MANUAL' });
    setTxn(next);
    emit('TENDER', `${TENDER_LABEL[type] ?? type} ${money(amount)} en ${txn.number} (terminal manual)`, { tender: next.tenders[next.tenders.length - 1], balanceAfter: cartOps.balanceDue(next) }, txn.id);
    if (cartOps.balanceDue(next) <= 0.000001) finishTransaction(next);
    return;
  }
  const terminal = getTerminal(settings.terminalAutoApprove);
  useUI.getState().openModal({ kind: 'terminal', amount, tenderType: type });
  pushDisplay('terminal', `Por favor siga las instrucciones en la terminal de pago — ${money(Math.abs(amount))}`);
  emit('TERMINAL_REQUEST', `Se envió ${amount < 0 ? 'reembolso' : 'pago'} de ${money(Math.abs(amount))} (${TENDER_LABEL[type] ?? type}) a la terminal`, { amount, tenderType: type, terminalId: 'SIM-MONERIS-01' }, txn.id);
  const result = await terminal.startPayment(amount, type);
  emit('TERMINAL_RESPONSE', `Terminal: ${result.message}${result.authCode ? ` aut. ${result.authCode}` : ''} por ${money(Math.abs(amount))}`, { ...result } as unknown as Record<string, unknown>, txn.id);
  // the modal shows the final status for a moment
  setTimeout(() => {
    const m = useUI.getState().modal;
    if (m?.kind === 'terminal') useUI.getState().closeModal();
  }, result.approved ? 900 : 1600);
  if (!result.approved) {
    play(sounds.error);
    toast(`Pago con tarjeta: ${result.message.toLowerCase()}`, 'danger');
    pushDisplay();
    return;
  }
  const current = useCart.getState().txn;
  if (!current || current.id !== txn.id) return;
  const next = cartOps.addTender(current, { type, amount, ref: result.authCode ?? null, cardLast4: result.cardLast4 ?? null, label: result.cardBrand ?? null });
  setTxn(next);
  emit('TENDER', `${result.cardBrand ?? TENDER_LABEL[type] ?? type} ${money(amount)} en ${txn.number} — aprobado ${result.authCode}`, { tender: next.tenders[next.tenders.length - 1], balanceAfter: cartOps.balanceDue(next) }, txn.id);
  if (cartOps.balanceDue(next) <= 0.000001) finishTransaction(next);
  else pushDisplay('paying');
}

async function tenderOther(type: TenderType) {
  const txn = useCart.getState().txn;
  if (!txn || !cartOps.isPayable(txn)) {
    toast('Agregue artículos antes de cobrar', 'info');
    return;
  }
  const due = cartOps.balanceDue(txn);
  const buffer = useCart.getState().buffer;
  let amount = buffer ? parseAmountBuffer(buffer) : due;
  if (due < 0) amount = due;
  if (amount === 0 || (due > 0 && amount > due && type !== 'cash')) {
    toast('Ingrese un monto válido', 'warning');
    return;
  }
  const ref = type === 'gift' || type === 'cheque' ? await ask<string | null>((resolve) => ({ kind: 'hold', resolve })) : null;
  if ((type === 'gift' || type === 'cheque') && ref === null) return;
  useCart.getState().clearBuffer();
  const next = cartOps.addTender(txn, { type, amount, ref: ref || null });
  setTxn(next);
  emit('TENDER', `${TENDER_LABEL[type] ?? type} ${money(amount)} en ${txn.number}`, { tender: next.tenders[next.tenders.length - 1], balanceAfter: cartOps.balanceDue(next) }, txn.id);
  if (cartOps.balanceDue(next) <= 0.000001) finishTransaction(next);
  else pushDisplay('paying');
}

function removeTender(tenderId: string) {
  const txn = useCart.getState().txn;
  const t = txn?.tenders.find((x) => x.id === tenderId);
  if (!txn || !t) return;
  if (t.type !== 'cash' && t.ref && t.ref !== 'MANUAL') {
    toast('Los pagos con tarjeta se revierten en la terminal (anule la venta para revertirlos)', 'warning');
    return;
  }
  setTxn(cartOps.removeTender(txn, tenderId));
  emit('TENDER_VOID', `Se eliminó ${TENDER_LABEL[t.type] ?? t.type} ${money(t.amount)} de ${txn.number}`, { tender: t }, txn.id);
}

function reprint(txn: Transaction) {
  const { store } = useCatalog.getState();
  printText(receiptText(txn, store, { reprint: true }), `Recibo ${txn.number}`);
  emit('RECEIPT_REPRINT', `Recibo ${txn.number} reimpreso`, { number: txn.number }, txn.id);
}

function printCurrentReceipt(txn: Transaction) {
  const { store } = useCatalog.getState();
  printText(receiptText(txn, store), `Recibo ${txn.number}`);
}

function selectLine(id: string | null) {
  useCart.getState().selectLine(id);
}

// ------------------------------------------------------------------ init
let initialized = false;
export function initPos() {
  if (initialized) return;
  initialized = true;
  const j = useJournal.getState();
  j.prune();
  setEventSeq(j.events.length ? Math.max(...j.events.map((e) => e.seq)) : 0);
  startSync();
  onScan((code) => void handleScan(code));
  useCart.subscribe((s, prev) => {
    if (s.txn !== prev.txn) {
      const m = useUI.getState().modal;
      if (m?.kind === 'terminal' || m?.kind === 'change') return;
      pushDisplay();
    }
  });
  pushDisplay();
}

export const pos = {
  signInWithPin,
  verifyApprover,
  lock,
  startBreak,
  endShift,
  finalizeShift,
  addProduct,
  addOpenDepartment,
  handleCategoryTap,
  handleScan,
  enterPlu,
  applyQuantityKey,
  setQtySelected,
  duplicateLast,
  voidSelected,
  voidSale,
  changePrice,
  discount,
  hold,
  recall,
  toggleReturnMode,
  noSale,
  cashDrop,
  paidOut,
  priceLookup,
  logPriceLookup,
  clearKey,
  tenderCash,
  tenderCard,
  tenderOther,
  removeTender,
  reprint,
  printCurrentReceipt,
  selectLine,
  pushDisplay,
  buildSegmentReportNow(): ReturnType<typeof buildSegmentReport> | null {
    const ctx = requireSession();
    if (!ctx) return null;
    return buildCurrentSegmentReport(ctx.shift, ctx.segment, new Date().toISOString());
  },
  parseBarcode: (raw: string): ParsedBarcode => parseBarcode(raw),
};
