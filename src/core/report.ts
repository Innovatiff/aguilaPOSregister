import type { Category, PosEvent, SegmentReport, Shift, TenderType, Transaction } from './types';
import { computeLine } from './tax';
import { round2 } from './money';

export interface ReportInput {
  shift: Shift;
  /** null => whole-shift (Z) report */
  segmentId: string | null;
  startedAt: string;
  endedAt: string;
  transactions: Transaction[];
  events: PosEvent[];
  categories: Category[];
}

function inWindow(iso: string, start: string, end: string) {
  const t = Date.parse(iso);
  return t >= Date.parse(start) && t <= Date.parse(end);
}

/**
 * Builds the closing report for a segment (clock-in → break, break → break, break → clock-out)
 * or for a whole shift. Everything the associate did is summarized here and this exact object is
 * what the register sends to the back office on BREAK_START / SHIFT_END.
 */
export function buildSegmentReport(input: ReportInput): SegmentReport {
  const { shift, segmentId, startedAt, endedAt, categories } = input;
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const txns = input.transactions.filter(
    (t) => t.shiftId === shift.id && t.status === 'completed' && t.completedAt && inWindow(t.completedAt, startedAt, endedAt) && (segmentId ? t.segmentId === segmentId : true),
  );
  const events = input.events.filter((e) => e.shiftId === shift.id && inWindow(e.at, startedAt, endedAt) && (segmentId ? e.segmentId === segmentId : true));

  let itemsSold = 0;
  let grossSales = 0;
  let lineDiscounts = 0;
  let txnDiscounts = 0;
  let returns = 0;
  let netSales = 0;
  let tax = 0;
  let total = 0;
  let cashTendered = 0;
  let changeGiven = 0;
  let cashRefunds = 0;
  let voidedLines = 0;
  let voidedLinesValue = 0;
  const tenders: Partial<Record<TenderType, { count: number; amount: number }>> = {};
  const byCat = new Map<string, { qty: number; amount: number }>();
  const byItem = new Map<string, { qty: number; amount: number }>();

  for (const t of txns) {
    for (const l of t.lines) {
      const c = computeLine({ ...l, voided: false });
      if (l.voided) {
        voidedLines += 1;
        voidedLinesValue = round2(voidedLinesValue + Math.abs(c.extended));
        continue;
      }
      const units = l.unit === 'kg' ? 1 : l.qty;
      if (l.isReturn) {
        returns = round2(returns + Math.abs(c.extended));
      } else {
        itemsSold += units;
        grossSales = round2(grossSales + c.gross);
      }
      lineDiscounts = round2(lineDiscounts + c.discount);
      const cat = byCat.get(l.categoryId) ?? { qty: 0, amount: 0 };
      cat.qty += l.isReturn ? -units : units;
      cat.amount = round2(cat.amount + c.extended);
      byCat.set(l.categoryId, cat);
      const item = byItem.get(l.name) ?? { qty: 0, amount: 0 };
      item.qty += l.isReturn ? -units : units;
      item.amount = round2(item.amount + c.extended);
      byItem.set(l.name, item);
    }
    txnDiscounts = round2(txnDiscounts + t.totals.txnDiscount);
    netSales = round2(netSales + t.totals.netSales);
    tax = round2(tax + t.totals.tax);
    total = round2(total + t.totals.total);
    for (const td of t.tenders) {
      const agg = tenders[td.type] ?? { count: 0, amount: 0 };
      agg.count += 1;
      agg.amount = round2(agg.amount + td.amount);
      tenders[td.type] = agg;
      if (td.type === 'cash') {
        if (td.amount >= 0) cashTendered = round2(cashTendered + td.amount);
        else cashRefunds = round2(cashRefunds + Math.abs(td.amount));
      }
    }
    changeGiven = round2(changeGiven + t.changeDue);
  }

  const count = (type: string) => events.filter((e) => e.type === type).length;
  const drops = round2(events.filter((e) => e.type === 'CASH_DROP').reduce((a, e) => a + Number(e.payload.amount ?? 0), 0));
  const paidOuts = round2(events.filter((e) => e.type === 'PAID_OUT').reduce((a, e) => a + Number(e.payload.amount ?? 0), 0));
  const voidedTxnEvents = events.filter((e) => e.type === 'TXN_VOID');
  const openingFloat = segmentId && shift.segments.findIndex((s) => s.id === segmentId) > 0 ? 0 : shift.openingFloat;
  const expectedInDrawer = round2(openingFloat + cashTendered - changeGiven - cashRefunds - drops - paidOuts);

  const byCategory = [...byCat.entries()]
    .map(([categoryId, v]) => ({ categoryId, name: catName(categoryId), qty: v.qty, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount);
  const topItems = [...byItem.entries()]
    .map(([name, v]) => ({ name, qty: v.qty, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const durationMin = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60000));

  return {
    scope: segmentId ? 'segment' : 'shift',
    shiftId: shift.id,
    segmentId,
    registerId: shift.registerId,
    employeeId: shift.employeeId,
    employeeName: shift.employeeName,
    startedAt,
    endedAt,
    durationMin,
    transactions: txns.length,
    itemsSold,
    grossSales,
    lineDiscounts,
    txnDiscounts,
    returns,
    netSales,
    tax,
    total,
    averageBasket: txns.length ? round2(total / txns.length) : 0,
    tenders,
    cash: { openingFloat, cashTendered, changeGiven, cashRefunds, drops, paidOuts, expectedInDrawer },
    voids: {
      lines: voidedLines,
      linesValue: voidedLinesValue,
      transactions: voidedTxnEvents.length,
      transactionsValue: round2(voidedTxnEvents.reduce((a, e) => a + Number(e.payload.total ?? 0), 0)),
    },
    noSales: count('NO_SALE'),
    priceOverrides: count('ITEM_PRICE_OVERRIDE'),
    discountsApplied: count('ITEM_DISCOUNT') + count('TXN_DISCOUNT'),
    managerOverrides: count('MANAGER_OVERRIDE'),
    scanUnknown: count('SCAN_UNKNOWN'),
    holds: count('TXN_HOLD'),
    byCategory,
    topItems,
    transactionIds: txns.map((t) => t.id),
  };
}
