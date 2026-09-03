import type { EventType, PosEvent } from './types';
import { uuid } from './ids';

export interface EventContext {
  registerId: string;
  employeeId: string | null;
  employeeName: string | null;
  shiftId: string | null;
  segmentId: string | null;
  txnId?: string | null;
}

let seqCounter = 0;
export function setEventSeq(n: number) {
  seqCounter = n;
}

export function makeEvent<T extends Record<string, unknown>>(type: EventType, summary: string, payload: T, ctx: EventContext): PosEvent<T> {
  seqCounter += 1;
  return {
    id: uuid(),
    seq: seqCounter,
    type,
    at: new Date().toISOString(),
    registerId: ctx.registerId,
    employeeId: ctx.employeeId,
    employeeName: ctx.employeeName,
    shiftId: ctx.shiftId,
    segmentId: ctx.segmentId,
    txnId: ctx.txnId ?? null,
    summary,
    payload,
  };
}

/** Display metadata for event types (shared look between register & back office). */
export const EVENT_META: Record<EventType, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent' }> = {
  SESSION_LOGIN: { label: 'Inicio de sesión', tone: 'info' },
  SESSION_LOGOUT: { label: 'Cierre de sesión', tone: 'neutral' },
  SESSION_LOCK: { label: 'Caja bloqueada', tone: 'neutral' },
  SESSION_UNLOCK: { label: 'Caja desbloqueada', tone: 'neutral' },
  LOGIN_FAILED: { label: 'Intento de PIN fallido', tone: 'danger' },
  SHIFT_START: { label: 'Turno iniciado', tone: 'success' },
  BREAK_START: { label: 'Descanso — segmento cerrado', tone: 'accent' },
  BREAK_END: { label: 'Regreso del descanso', tone: 'info' },
  SHIFT_END: { label: 'Turno cerrado (reporte Z)', tone: 'accent' },
  SALE_START: { label: 'Venta iniciada', tone: 'neutral' },
  ITEM_ADD: { label: 'Artículo agregado', tone: 'neutral' },
  ITEM_VOID: { label: 'Artículo anulado', tone: 'warning' },
  ITEM_QTY: { label: 'Cantidad modificada', tone: 'neutral' },
  ITEM_PRICE_OVERRIDE: { label: 'Cambio de precio', tone: 'warning' },
  ITEM_DISCOUNT: { label: 'Descuento en artículo', tone: 'warning' },
  TXN_DISCOUNT: { label: 'Descuento en venta', tone: 'warning' },
  TXN_VOID: { label: 'Venta anulada', tone: 'danger' },
  TXN_HOLD: { label: 'Venta en espera', tone: 'neutral' },
  TXN_RECALL: { label: 'Venta recuperada', tone: 'neutral' },
  TENDER: { label: 'Pago', tone: 'success' },
  TENDER_VOID: { label: 'Pago eliminado', tone: 'warning' },
  TXN_COMPLETE: { label: 'Venta completada', tone: 'success' },
  RETURN_MODE: { label: 'Modo devolución', tone: 'warning' },
  NO_SALE: { label: 'Sin venta (cajón abierto)', tone: 'danger' },
  PRICE_LOOKUP: { label: 'Consulta de precio', tone: 'neutral' },
  MANAGER_OVERRIDE: { label: 'Aprobación de gerente', tone: 'accent' },
  MANAGER_OVERRIDE_DENIED: { label: 'Aprobación denegada', tone: 'danger' },
  CASH_DROP: { label: 'Depósito a caja fuerte', tone: 'info' },
  PAID_OUT: { label: 'Pago de gasto', tone: 'warning' },
  SCAN_UNKNOWN: { label: 'Código desconocido', tone: 'warning' },
  RECEIPT_REPRINT: { label: 'Recibo reimpreso', tone: 'neutral' },
  DRAWER_OPEN: { label: 'Cajón abierto', tone: 'neutral' },
  TERMINAL_REQUEST: { label: 'Solicitud a terminal de tarjeta', tone: 'info' },
  TERMINAL_RESPONSE: { label: 'Respuesta de terminal de tarjeta', tone: 'info' },
  CUSTOMER_DISPLAY: { label: 'Pantalla del cliente', tone: 'neutral' },
  REGISTER_ONLINE: { label: 'Caja en línea', tone: 'success' },
  REGISTER_OFFLINE: { label: 'Caja sin conexión', tone: 'danger' },
  PRICE_CHANGE: { label: 'Precio modificado', tone: 'warning' },
  INVENTORY_ADJUST: { label: 'Inventario ajustado', tone: 'info' },
  INVENTORY_RECEIVE: { label: 'Mercancía recibida', tone: 'success' },
  INVENTORY_COUNT: { label: 'Inventario contado', tone: 'info' },
  EMPLOYEE_UPDATE: { label: 'Empleado actualizado', tone: 'info' },
  SETTINGS_UPDATE: { label: 'Configuración modificada', tone: 'info' },
};
