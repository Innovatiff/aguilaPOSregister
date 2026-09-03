// ---------------------------------------------------------------------------
// Shared domain model for the El Aguila POS suite.
// The management server (aguilaPOS) mirrors these shapes in server/src/lib/model.js
// ---------------------------------------------------------------------------

export type Role = 'manager' | 'supervisor' | 'cashier';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
  username: string;
  /** Demo-only: plaintext PIN when bundled locally. Server-side only the hash travels. */
  pin?: string | null;
  pinHash?: string | null;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  short: string;
  taxable: boolean;
  color: string;
  icon: string;
  sort: number;
  note?: string;
}

export type Unit = 'ea' | 'kg';

export interface Product {
  id: string;
  sku: string;
  plu: string;
  barcode: string | null;
  name: string;
  categoryId: string;
  price: number;
  cost: number;
  taxable: boolean;
  unit: Unit;
  soldByWeight: boolean;
  stock: number;
  reorderLevel: number;
  supplier?: string;
  active: boolean;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  registration?: string;
}

export interface StoreInfo {
  name: string;
  legalName?: string;
  address1: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  phone: string;
  email: string;
  currency: string;
  locale: string;
  timezone?: string;
  taxes: TaxRate[];
  receiptHeader?: string;
  receiptFooter?: string;
  openingFloat: number;
  managerApprovalThreshold: number;
}

export interface RegisterDevice {
  id: string;
  name: string;
  location?: string;
}

export type DiscountType = 'amount' | 'percent';

export interface Discount {
  type: DiscountType;
  value: number;
  reason: string;
  approvedBy?: string | null;
}

export interface PriceOverride {
  from: number;
  to: number;
  reason: string;
  approvedBy?: string | null;
}

export interface CartLine {
  id: string;
  productId: string | null;
  categoryId: string;
  name: string;
  plu?: string | null;
  barcode?: string | null;
  unitPrice: number;
  originalPrice: number;
  qty: number;
  unit: Unit;
  taxable: boolean;
  discount: Discount | null;
  priceOverride: PriceOverride | null;
  isReturn: boolean;
  voided: boolean;
  voidReason?: string | null;
  openDepartment: boolean;
  scanned: boolean;
  addedAt: string;
}

export interface LineComputed {
  /** unitPrice * qty (signed: returns are negative) before discount */
  gross: number;
  /** line discount amount (positive number) */
  discount: number;
  /** gross - discount (signed) */
  extended: number;
}

export interface Totals {
  /** sum of non-voided line extended amounts (returns negative) */
  subtotal: number;
  lineDiscounts: number;
  txnDiscount: number;
  /** subtotal - txnDiscount */
  netSales: number;
  taxableBase: number;
  tax: number;
  total: number;
  itemCount: number;
  returnCount: number;
}

export type TenderType = 'cash' | 'debit' | 'visa' | 'mastercard' | 'amex' | 'gift' | 'cheque' | 'other';

export interface Tender {
  id: string;
  type: TenderType;
  amount: number;
  at: string;
  /** terminal authorization / reference code */
  ref?: string | null;
  cardLast4?: string | null;
  label?: string | null;
}

export type TransactionStatus = 'open' | 'completed' | 'voided' | 'held';

export interface Transaction {
  id: string;
  number: string;
  registerId: string;
  employeeId: string;
  employeeName: string;
  shiftId: string;
  segmentId: string;
  startedAt: string;
  completedAt: string | null;
  status: TransactionStatus;
  lines: CartLine[];
  txnDiscount: Discount | null;
  totals: Totals;
  tenders: Tender[];
  changeDue: number;
  /** derived: sale, return or mixed */
  kind: 'sale' | 'return' | 'mixed';
  holdLabel?: string | null;
  voidReason?: string | null;
}

// -------------------------------- Shifts -----------------------------------

export type SegmentEndReason = 'break' | 'shift_end';

export interface Segment {
  id: string;
  shiftId: string;
  index: number;
  startedAt: string;
  endedAt: string | null;
  endReason: SegmentEndReason | null;
  report: SegmentReport | null;
}

export type ShiftStatus = 'open' | 'on_break' | 'closed';

export interface Shift {
  id: string;
  registerId: string;
  employeeId: string;
  employeeName: string;
  startedAt: string;
  endedAt: string | null;
  openingFloat: number;
  status: ShiftStatus;
  segments: Segment[];
  closing: ShiftClosing | null;
}

export interface ShiftClosing {
  countedCash: number;
  expectedCash: number;
  overShort: number;
  denominations: Record<string, number>;
  notes?: string | null;
  report: SegmentReport;
}

export interface TenderSummary {
  count: number;
  amount: number;
}

export interface SegmentReport {
  scope: 'segment' | 'shift';
  shiftId: string;
  segmentId: string | null;
  registerId: string;
  employeeId: string;
  employeeName: string;
  startedAt: string;
  endedAt: string;
  durationMin: number;
  transactions: number;
  itemsSold: number;
  grossSales: number;
  lineDiscounts: number;
  txnDiscounts: number;
  returns: number;
  netSales: number;
  tax: number;
  total: number;
  averageBasket: number;
  tenders: Partial<Record<TenderType, TenderSummary>>;
  cash: {
    openingFloat: number;
    cashTendered: number;
    changeGiven: number;
    cashRefunds: number;
    drops: number;
    paidOuts: number;
    expectedInDrawer: number;
  };
  voids: { lines: number; linesValue: number; transactions: number; transactionsValue: number };
  noSales: number;
  priceOverrides: number;
  discountsApplied: number;
  managerOverrides: number;
  scanUnknown: number;
  holds: number;
  byCategory: Array<{ categoryId: string; name: string; qty: number; amount: number }>;
  topItems: Array<{ name: string; qty: number; amount: number }>;
  transactionIds: string[];
}

// -------------------------------- Events -----------------------------------

export type EventType =
  | 'SESSION_LOGIN'
  | 'SESSION_LOGOUT'
  | 'SESSION_LOCK'
  | 'SESSION_UNLOCK'
  | 'LOGIN_FAILED'
  | 'SHIFT_START'
  | 'BREAK_START'
  | 'BREAK_END'
  | 'SHIFT_END'
  | 'SALE_START'
  | 'ITEM_ADD'
  | 'ITEM_VOID'
  | 'ITEM_QTY'
  | 'ITEM_PRICE_OVERRIDE'
  | 'ITEM_DISCOUNT'
  | 'TXN_DISCOUNT'
  | 'TXN_VOID'
  | 'TXN_HOLD'
  | 'TXN_RECALL'
  | 'TENDER'
  | 'TENDER_VOID'
  | 'TXN_COMPLETE'
  | 'RETURN_MODE'
  | 'NO_SALE'
  | 'PRICE_LOOKUP'
  | 'MANAGER_OVERRIDE'
  | 'MANAGER_OVERRIDE_DENIED'
  | 'CASH_DROP'
  | 'PAID_OUT'
  | 'SCAN_UNKNOWN'
  | 'RECEIPT_REPRINT'
  | 'DRAWER_OPEN'
  | 'TERMINAL_REQUEST'
  | 'TERMINAL_RESPONSE'
  | 'CUSTOMER_DISPLAY'
  | 'REGISTER_ONLINE'
  | 'REGISTER_OFFLINE'
  | 'PRICE_CHANGE'
  | 'INVENTORY_ADJUST'
  | 'INVENTORY_RECEIVE'
  | 'INVENTORY_COUNT'
  | 'EMPLOYEE_UPDATE'
  | 'SETTINGS_UPDATE';

export interface PosEvent<T = Record<string, unknown>> {
  id: string;
  seq: number;
  type: EventType;
  at: string;
  registerId: string;
  employeeId: string | null;
  employeeName: string | null;
  shiftId: string | null;
  segmentId: string | null;
  txnId: string | null;
  /** short human readable line for the live feed */
  summary: string;
  payload: T;
}
