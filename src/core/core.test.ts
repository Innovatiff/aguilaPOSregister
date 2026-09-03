import { describe, it, expect } from 'vitest';
import { computeTotals, computeLine } from './tax';
import { parseAmountBuffer, round2 } from './money';
import { parseBarcode, buildPriceEmbedded, gs1CheckDigit, isValidGs1 } from './barcode';
import { addOrMergeProduct, addTender, balanceDue, complete, discountTransaction, lineFromOpenDepartment, lineFromProduct, newTransaction, voidLine } from './cart';
import { buildSegmentReport } from './report';
import type { Category, PosEvent, Product, Shift, TaxRate } from './types';

const HST: TaxRate[] = [{ id: 'hst', name: 'HST', rate: 0.13 }];
const grocery: Category = { id: 'grocery', name: 'Grocery', short: 'GROCERY', taxable: false, color: '#000', icon: 'x', sort: 1 };
const toys: Category = { id: 'toys', name: 'Toys', short: 'TOYS', taxable: true, color: '#000', icon: 'x', sort: 2 };
const tortillas: Product = { id: 'p1', sku: 'AG-1', plu: '1008', barcode: '070001079190', name: 'Corn Tortillas 30ct', categoryId: 'grocery', price: 3.29, cost: 1.8, taxable: false, unit: 'ea', soldByWeight: false, stock: 10, reorderLevel: 2, active: true };
const pinata: Product = { id: 'p2', sku: 'AG-2', plu: '6201', barcode: null, name: 'Piñata Star', categoryId: 'toys', price: 29.99, cost: 12, taxable: true, unit: 'ea', soldByWeight: false, stock: 5, reorderLevel: 1, active: true };
const asada: Product = { id: 'p3', sku: 'AG-3', plu: '2001', barcode: null, name: 'Carne Asada', categoryId: 'meat', price: 24.99, cost: 17.5, taxable: false, unit: 'kg', soldByWeight: true, stock: 20, reorderLevel: 5, active: true };

const ctx = { number: 'REG-01-000001', registerId: 'REG-01', employeeId: 'e-003', employeeName: 'María López', shiftId: 's1', segmentId: 'seg1', taxes: HST };

describe('money', () => {
  it('rounds half-cents predictably', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });
  it('parses keypad buffers in cents mode and decimal mode', () => {
    expect(parseAmountBuffer('1250')).toBe(12.5);
    expect(parseAmountBuffer('12.5')).toBe(12.5);
    expect(parseAmountBuffer('5')).toBe(0.05);
    expect(parseAmountBuffer('')).toBe(0);
  });
});

describe('tax engine (Ontario HST 13%)', () => {
  it('does not tax zero-rated groceries but taxes merchandise', () => {
    const t = computeTotals([lineFromProduct(tortillas), lineFromProduct(pinata)], null, HST);
    expect(t.subtotal).toBe(33.28);
    expect(t.taxableBase).toBe(29.99);
    expect(t.tax).toBe(3.9);
    expect(t.total).toBe(37.18);
    expect(t.itemCount).toBe(2);
  });
  it('applies line percent discounts before tax', () => {
    const line = { ...lineFromProduct(pinata), discount: { type: 'percent' as const, value: 10, reason: 'Damaged' } };
    const c = computeLine(line);
    expect(c.discount).toBe(3.0);
    expect(c.extended).toBe(26.99);
    const t = computeTotals([line], null, HST);
    expect(t.tax).toBe(3.51);
  });
  it('allocates transaction discounts proportionally to the taxable portion', () => {
    const lines = [lineFromProduct(tortillas), lineFromProduct(pinata)];
    const t = computeTotals(lines, { type: 'amount', value: 3.28, reason: 'Promo' }, HST);
    expect(t.txnDiscount).toBe(3.28);
    expect(t.netSales).toBe(30.0);
    // taxable share = 29.99/33.28 of 3.28 = 2.956 -> taxable base 27.03
    expect(t.taxableBase).toBe(27.03);
    expect(t.tax).toBe(3.51);
    expect(t.total).toBe(33.51);
  });
  it('handles returns as negative amounts', () => {
    const t = computeTotals([lineFromProduct(pinata, { isReturn: true })], null, HST);
    expect(t.subtotal).toBe(-29.99);
    expect(t.tax).toBe(-3.9);
    expect(t.total).toBe(-33.89);
    expect(t.returnCount).toBe(1);
  });
  it('prices weighed items by kg to three decimals', () => {
    const l = lineFromProduct(asada, { qty: 0.4567 });
    expect(l.qty).toBe(0.457);
    expect(computeLine(l).extended).toBe(11.42);
  });
});

describe('barcodes', () => {
  it('validates GS1 check digits', () => {
    expect(gs1CheckDigit('03600029145')).toBe('2');
    expect(isValidGs1('036000291452')).toBe(true);
    expect(isValidGs1('036000291453')).toBe(false);
  });
  it('parses UPC-A, EAN-13-with-leading-zero and PLU stickers', () => {
    expect(parseBarcode('036000291452')).toMatchObject({ kind: 'upc-a', valid: true, code: '036000291452' });
    expect(parseBarcode('0036000291452')).toMatchObject({ kind: 'upc-a', valid: true });
    expect(parseBarcode('4046')).toMatchObject({ kind: 'plu', code: '4046' });
    expect(parseBarcode('abc')).toMatchObject({ kind: 'unknown', valid: false });
  });
  it('decodes price-embedded scale labels (type-2 UPC)', () => {
    const label = buildPriceEmbedded('2001', 12.5);
    expect(label).toHaveLength(12);
    const parsed = parseBarcode(label);
    expect(parsed.kind).toBe('price-embedded');
    expect(parsed.valid).toBe(true);
    expect(parsed.code).toBe('2001');
    expect(parsed.embeddedPrice).toBe(12.5);
  });
});

describe('cart', () => {
  it('merges identical scanned items into one line and completes with change', () => {
    let txn = newTransaction(ctx);
    ({ txn } = addOrMergeProduct(txn, tortillas, HST, { scanned: true }));
    const r = addOrMergeProduct(txn, tortillas, HST, { scanned: true });
    txn = r.txn;
    expect(r.merged).toBe(true);
    expect(txn.lines).toHaveLength(1);
    expect(txn.lines[0].qty).toBe(2);
    expect(txn.totals.total).toBe(6.58);
    txn = addTender(txn, { type: 'cash', amount: 10 });
    expect(balanceDue(txn)).toBe(-3.42);
    txn = complete(txn);
    expect(txn.status).toBe('completed');
    expect(txn.changeDue).toBe(3.42);
  });
  it('supports open-department entry (amount + category key) and voids', () => {
    let txn = newTransaction(ctx);
    const open = lineFromOpenDepartment(toys, 12.34);
    txn = { ...txn, lines: [open] };
    txn = discountTransaction(txn, null, HST);
    expect(txn.totals.tax).toBe(1.6);
    txn = voidLine(txn, open.id, 'Wrong item', HST);
    expect(txn.totals.total).toBe(0);
    expect(txn.lines[0].voided).toBe(true);
  });
});

describe('segment (break) closing report', () => {
  it('summarizes sales, tenders, expected cash and activity for the segment', () => {
    const shift: Shift = {
      id: 's1', registerId: 'REG-01', employeeId: 'e-003', employeeName: 'María López', startedAt: '2026-09-03T09:00:00.000Z', endedAt: null, openingFloat: 200, status: 'open', closing: null,
      segments: [{ id: 'seg1', shiftId: 's1', index: 0, startedAt: '2026-09-03T09:00:00.000Z', endedAt: null, endReason: null, report: null }],
    };
    let a = newTransaction(ctx);
    ({ txn: a } = addOrMergeProduct(a, pinata, HST));
    a = addTender(a, { type: 'cash', amount: 40 });
    a = complete(a);
    a = { ...a, completedAt: '2026-09-03T10:00:00.000Z' };
    let b = newTransaction({ ...ctx, number: 'REG-01-000002' });
    ({ txn: b } = addOrMergeProduct(b, tortillas, HST, { qty: 3 }));
    b = addTender(b, { type: 'debit', amount: b.totals.total, ref: 'A1B2C3' });
    b = complete(b);
    b = { ...b, completedAt: '2026-09-03T10:30:00.000Z' };
    const events: PosEvent[] = [
      { id: 'ev1', seq: 1, type: 'NO_SALE', at: '2026-09-03T10:10:00.000Z', registerId: 'REG-01', employeeId: 'e-003', employeeName: 'María López', shiftId: 's1', segmentId: 'seg1', txnId: null, summary: 'No sale', payload: { reason: 'Change for customer' } },
      { id: 'ev2', seq: 2, type: 'CASH_DROP', at: '2026-09-03T10:20:00.000Z', registerId: 'REG-01', employeeId: 'e-003', employeeName: 'María López', shiftId: 's1', segmentId: 'seg1', txnId: null, summary: 'Drop', payload: { amount: 20 } },
    ];
    const rep = buildSegmentReport({ shift, segmentId: 'seg1', startedAt: shift.startedAt, endedAt: '2026-09-03T11:00:00.000Z', transactions: [a, b], events, categories: [grocery, toys] });
    expect(rep.transactions).toBe(2);
    expect(rep.itemsSold).toBe(4);
    expect(rep.total).toBe(round2(a.totals.total + b.totals.total));
    expect(rep.tenders.cash).toEqual({ count: 1, amount: 40 });
    expect(rep.tenders.debit?.count).toBe(1);
    expect(rep.cash.changeGiven).toBe(a.changeDue);
    expect(rep.cash.expectedInDrawer).toBe(round2(200 + 40 - a.changeDue - 20));
    expect(rep.noSales).toBe(1);
    expect(rep.durationMin).toBe(120);
    expect(rep.byCategory[0].name).toBe('Toys');
    expect(rep.topItems.map((t) => t.name)).toContain('Corn Tortillas 30ct');
  });
});
