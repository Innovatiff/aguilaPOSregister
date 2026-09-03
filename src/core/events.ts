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
  SESSION_LOGIN: { label: 'Signed in', tone: 'info' },
  SESSION_LOGOUT: { label: 'Signed out', tone: 'neutral' },
  SESSION_LOCK: { label: 'Register locked', tone: 'neutral' },
  SESSION_UNLOCK: { label: 'Register unlocked', tone: 'neutral' },
  LOGIN_FAILED: { label: 'Failed PIN attempt', tone: 'danger' },
  SHIFT_START: { label: 'Shift started', tone: 'success' },
  BREAK_START: { label: 'Break — segment closed', tone: 'accent' },
  BREAK_END: { label: 'Back from break', tone: 'info' },
  SHIFT_END: { label: 'Shift closed (Z report)', tone: 'accent' },
  SALE_START: { label: 'Sale started', tone: 'neutral' },
  ITEM_ADD: { label: 'Item added', tone: 'neutral' },
  ITEM_VOID: { label: 'Item voided', tone: 'warning' },
  ITEM_QTY: { label: 'Quantity changed', tone: 'neutral' },
  ITEM_PRICE_OVERRIDE: { label: 'Price override', tone: 'warning' },
  ITEM_DISCOUNT: { label: 'Item discount', tone: 'warning' },
  TXN_DISCOUNT: { label: 'Sale discount', tone: 'warning' },
  TXN_VOID: { label: 'Sale voided', tone: 'danger' },
  TXN_HOLD: { label: 'Sale on hold', tone: 'neutral' },
  TXN_RECALL: { label: 'Sale recalled', tone: 'neutral' },
  TENDER: { label: 'Payment', tone: 'success' },
  TENDER_VOID: { label: 'Payment removed', tone: 'warning' },
  TXN_COMPLETE: { label: 'Sale completed', tone: 'success' },
  RETURN_MODE: { label: 'Return mode', tone: 'warning' },
  NO_SALE: { label: 'No sale (drawer opened)', tone: 'danger' },
  PRICE_LOOKUP: { label: 'Price check', tone: 'neutral' },
  MANAGER_OVERRIDE: { label: 'Manager approval', tone: 'accent' },
  MANAGER_OVERRIDE_DENIED: { label: 'Approval denied', tone: 'danger' },
  CASH_DROP: { label: 'Cash drop', tone: 'info' },
  PAID_OUT: { label: 'Paid out', tone: 'warning' },
  SCAN_UNKNOWN: { label: 'Unknown barcode', tone: 'warning' },
  RECEIPT_REPRINT: { label: 'Receipt reprinted', tone: 'neutral' },
  DRAWER_OPEN: { label: 'Drawer opened', tone: 'neutral' },
  TERMINAL_REQUEST: { label: 'Card terminal request', tone: 'info' },
  TERMINAL_RESPONSE: { label: 'Card terminal response', tone: 'info' },
  CUSTOMER_DISPLAY: { label: 'Customer display', tone: 'neutral' },
  REGISTER_ONLINE: { label: 'Register online', tone: 'success' },
  REGISTER_OFFLINE: { label: 'Register offline', tone: 'danger' },
  PRICE_CHANGE: { label: 'Price changed', tone: 'warning' },
  INVENTORY_ADJUST: { label: 'Inventory adjusted', tone: 'info' },
  INVENTORY_RECEIVE: { label: 'Stock received', tone: 'success' },
  INVENTORY_COUNT: { label: 'Stock counted', tone: 'info' },
  EMPLOYEE_UPDATE: { label: 'Employee updated', tone: 'info' },
  SETTINGS_UPDATE: { label: 'Settings changed', tone: 'info' },
};
