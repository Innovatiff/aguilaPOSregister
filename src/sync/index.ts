import { api } from './api';
import { useSync } from './queue';
import { useCatalog } from '../state/catalog';
import { useSession, currentShift } from '../state/session';
import { useCart } from '../state/cart';
import { useSettings } from '../state/settings';
import { makeEvent } from '../core/events';

let started = false;
let flushing = false;

async function flush() {
  const { queue } = useSync.getState();
  if (flushing || queue.length === 0) return;
  flushing = true;
  try {
    const batch = queue.slice(0, 100);
    const res = await api.pushEvents(batch);
    useSync.getState().ack(res.accepted);
    if (res.rejected?.length) {
      // Rejected events are malformed; drop them so they do not block the queue forever.
      useSync.getState().ack(res.rejected.map((r) => r.id));
      console.warn('[sync] rejected events', res.rejected);
    }
    markOnline(true);
  } catch (e) {
    markOnline(false, e instanceof Error ? e.message : String(e));
  } finally {
    flushing = false;
  }
}

function markOnline(online: boolean, error: string | null = null) {
  const was = useSync.getState().online;
  useSync.getState().setOnline(online, error);
  if (was !== online) {
    const { registerId } = useSettings.getState();
    const shift = currentShift();
    const s = useSession.getState();
    const ev = makeEvent(online ? 'REGISTER_ONLINE' : 'REGISTER_OFFLINE', online ? 'La caja se reconectó con administración' : `La caja perdió la conexión${error ? `: ${error}` : ''}`, { error }, {
      registerId,
      employeeId: s.employee?.id ?? null,
      employeeName: s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : null,
      shiftId: shift?.id ?? null,
      segmentId: shift?.segments.find((x) => !x.endedAt)?.id ?? null,
    });
    useSync.getState().enqueue(ev);
  }
}

async function heartbeat() {
  const s = useSession.getState();
  const shift = currentShift();
  const cart = useCart.getState();
  try {
    const res = await api.heartbeat({
      status: s.status,
      employeeId: s.employee?.id ?? null,
      employeeName: s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : null,
      shiftId: shift?.id ?? null,
      shiftStatus: shift?.status ?? null,
      openSale: cart.txn ? { number: cart.txn.number, lines: cart.txn.lines.filter((l) => !l.voided).length, total: cart.txn.totals.total } : null,
      queued: useSync.getState().queue.length,
      version: '1.0.0',
      catalogVersion: useCatalog.getState().version,
    });
    markOnline(true);
    if (res.catalogVersion && res.catalogVersion !== useCatalog.getState().version) await refreshCatalog();
  } catch (e) {
    markOnline(false, e instanceof Error ? e.message : String(e));
  }
}

export async function refreshCatalog() {
  try {
    const data = await api.catalog();
    if (data.version !== useCatalog.getState().version) useCatalog.getState().setCatalog(data);
    return true;
  } catch {
    return false;
  }
}

export async function bootstrap() {
  try {
    const b = await api.bootstrap();
    useCatalog.getState().setStore(b.store, b.registers);
    useCatalog.getState().setCatalog(b.catalog);
    useCatalog.getState().setEmployees(b.employees);
    markOnline(true);
    return true;
  } catch (e) {
    markOnline(false, e instanceof Error ? e.message : String(e));
    return false;
  }
}

export function startSync() {
  if (started) return;
  started = true;
  void bootstrap().then(() => flush());
  setInterval(() => void flush(), 3000);
  setInterval(() => void heartbeat(), 15000);
  setTimeout(() => void heartbeat(), 1500);
  // flush immediately when something is queued
  useSync.subscribe((s, prev) => {
    if (s.queue.length > prev.queue.length) void flush();
  });
}

export const syncNow = flush;
