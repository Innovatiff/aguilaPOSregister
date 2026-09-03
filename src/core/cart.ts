import type { CartLine, Category, Discount, PriceOverride, Product, TaxRate, Tender, Totals, Transaction } from './types';
import { computeTotals } from './tax';
import { round2, round3 } from './money';
import { uuid } from './ids';

export interface NewLineOptions {
  qty?: number;
  isReturn?: boolean;
  scanned?: boolean;
  unitPrice?: number;
}

export function lineFromProduct(product: Product, opts: NewLineOptions = {}): CartLine {
  const qty = product.soldByWeight ? round3(opts.qty ?? 1) : Math.max(1, Math.floor(opts.qty ?? 1));
  return {
    id: uuid(),
    productId: product.id,
    categoryId: product.categoryId,
    name: product.name,
    plu: product.plu,
    barcode: product.barcode,
    unitPrice: opts.unitPrice ?? product.price,
    originalPrice: product.price,
    qty,
    unit: product.unit,
    taxable: product.taxable,
    discount: null,
    priceOverride: null,
    isReturn: !!opts.isReturn,
    voided: false,
    openDepartment: false,
    scanned: !!opts.scanned,
    addedAt: new Date().toISOString(),
  };
}

/** Classic register flow: type an amount, press a department key. */
export function lineFromOpenDepartment(category: Category, amount: number, opts: NewLineOptions = {}): CartLine {
  return {
    id: uuid(),
    productId: null,
    categoryId: category.id,
    name: `${category.name} (artículo abierto)`,
    plu: null,
    barcode: null,
    unitPrice: round2(amount),
    originalPrice: round2(amount),
    qty: Math.max(1, Math.floor(opts.qty ?? 1)),
    unit: 'ea',
    taxable: category.taxable,
    discount: null,
    priceOverride: null,
    isReturn: !!opts.isReturn,
    voided: false,
    openDepartment: true,
    scanned: false,
    addedAt: new Date().toISOString(),
  };
}

export function newTransaction(ctx: {
  number: string;
  registerId: string;
  employeeId: string;
  employeeName: string;
  shiftId: string;
  segmentId: string;
  taxes: TaxRate[];
}): Transaction {
  return {
    id: uuid(),
    number: ctx.number,
    registerId: ctx.registerId,
    employeeId: ctx.employeeId,
    employeeName: ctx.employeeName,
    shiftId: ctx.shiftId,
    segmentId: ctx.segmentId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'open',
    lines: [],
    txnDiscount: null,
    totals: computeTotals([], null, ctx.taxes),
    tenders: [],
    changeDue: 0,
    kind: 'sale',
  };
}

export function recompute(txn: Transaction, taxes: TaxRate[]): Transaction {
  const totals: Totals = computeTotals(txn.lines, txn.txnDiscount, taxes);
  const active = txn.lines.filter((l) => !l.voided);
  const hasSale = active.some((l) => !l.isReturn);
  const hasReturn = active.some((l) => l.isReturn);
  const kind: Transaction['kind'] = hasSale && hasReturn ? 'mixed' : hasReturn ? 'return' : 'sale';
  return { ...txn, totals, kind };
}

export function addLine(txn: Transaction, line: CartLine, taxes: TaxRate[]): Transaction {
  return recompute({ ...txn, lines: [...txn.lines, line] }, taxes);
}

/** Merge identical unweighed products into the existing line (qty++), like most POS systems. */
export function addOrMergeProduct(txn: Transaction, product: Product, taxes: TaxRate[], opts: NewLineOptions = {}): { txn: Transaction; line: CartLine; merged: boolean } {
  if (!product.soldByWeight && !opts.unitPrice) {
    const idx = [...txn.lines]
      .map((l, i) => ({ l, i }))
      .reverse()
      .find(({ l }) => l.productId === product.id && !l.voided && !l.discount && !l.priceOverride && l.isReturn === !!opts.isReturn && l.unitPrice === product.price)?.i;
    if (idx !== undefined && txn.tenders.length === 0) {
      const lines = txn.lines.slice();
      const merged: CartLine = { ...lines[idx], qty: lines[idx].qty + Math.max(1, Math.floor(opts.qty ?? 1)) };
      lines[idx] = merged;
      return { txn: recompute({ ...txn, lines }, taxes), line: merged, merged: true };
    }
  }
  const line = lineFromProduct(product, opts);
  return { txn: addLine(txn, line, taxes), line, merged: false };
}

export function updateLine(txn: Transaction, lineId: string, patch: Partial<CartLine>, taxes: TaxRate[]): Transaction {
  const lines = txn.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l));
  return recompute({ ...txn, lines }, taxes);
}

export function voidLine(txn: Transaction, lineId: string, reason: string, taxes: TaxRate[]): Transaction {
  return updateLine(txn, lineId, { voided: true, voidReason: reason }, taxes);
}

export function setLineQty(txn: Transaction, lineId: string, qty: number, taxes: TaxRate[]): Transaction {
  const line = txn.lines.find((l) => l.id === lineId);
  if (!line) return txn;
  const q = line.unit === 'kg' ? round3(qty) : Math.max(1, Math.floor(qty));
  return updateLine(txn, lineId, { qty: q }, taxes);
}

export function overrideLinePrice(txn: Transaction, lineId: string, override: PriceOverride, taxes: TaxRate[]): Transaction {
  return updateLine(txn, lineId, { unitPrice: round2(override.to), priceOverride: override }, taxes);
}

export function discountLine(txn: Transaction, lineId: string, discount: Discount | null, taxes: TaxRate[]): Transaction {
  return updateLine(txn, lineId, { discount }, taxes);
}

export function discountTransaction(txn: Transaction, discount: Discount | null, taxes: TaxRate[]): Transaction {
  return recompute({ ...txn, txnDiscount: discount }, taxes);
}

export function tendered(txn: Transaction): number {
  return round2(txn.tenders.reduce((a, t) => a + t.amount, 0));
}

export function balanceDue(txn: Transaction): number {
  return round2(txn.totals.total - tendered(txn));
}

export function addTender(txn: Transaction, tender: Omit<Tender, 'id' | 'at'>): Transaction {
  const t: Tender = { ...tender, id: uuid(), at: new Date().toISOString(), amount: round2(tender.amount) };
  return { ...txn, tenders: [...txn.tenders, t] };
}

export function removeTender(txn: Transaction, tenderId: string): Transaction {
  return { ...txn, tenders: txn.tenders.filter((t) => t.id !== tenderId) };
}

/** A transaction is payable when it has at least one active line. */
export function isPayable(txn: Transaction): boolean {
  return txn.lines.some((l) => !l.voided);
}

/** Close the sale once tenders cover the total. Change is only given from cash. */
export function complete(txn: Transaction): Transaction {
  const paid = tendered(txn);
  const changeDue = round2(Math.max(0, paid - txn.totals.total));
  return { ...txn, status: 'completed', completedAt: new Date().toISOString(), changeDue };
}

export function lastActiveLine(txn: Transaction): CartLine | undefined {
  return [...txn.lines].reverse().find((l) => !l.voided);
}
