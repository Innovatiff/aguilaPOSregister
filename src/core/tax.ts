import type { CartLine, Discount, LineComputed, TaxRate, Totals } from './types';
import { round2 } from './money';

/**
 * Ontario HST: 13% on taxable goods. Basic groceries, most produce, meat, dairy and eggs are
 * zero-rated; snacks, candy, single-serve beverages, prepared single bakery items and all
 * non-food merchandise are taxable. Taxability is a property of the product/category, so the
 * engine only needs the `taxable` flag on each line.
 */
export function computeLine(line: CartLine): LineComputed {
  if (line.voided) return { gross: 0, discount: 0, extended: 0 };
  const sign = line.isReturn ? -1 : 1;
  const gross = round2(line.unitPrice * line.qty) * sign;
  let discount = 0;
  if (line.discount) {
    if (line.discount.type === 'percent') {
      discount = round2(Math.abs(gross) * (line.discount.value / 100));
    } else {
      discount = round2(Math.min(Math.abs(gross), line.discount.value));
    }
  }
  const extended = round2(gross - discount * sign);
  return { gross, discount, extended };
}

export function txnDiscountAmount(subtotal: number, discount: Discount | null): number {
  if (!discount || subtotal <= 0) return 0;
  if (discount.type === 'percent') return round2(subtotal * (discount.value / 100));
  return round2(Math.min(subtotal, discount.value));
}

export function computeTotals(lines: CartLine[], txnDiscount: Discount | null, taxes: TaxRate[]): Totals {
  const active = lines.filter((l) => !l.voided);
  let subtotal = 0;
  let lineDiscounts = 0;
  let taxableBase = 0;
  let itemCount = 0;
  let returnCount = 0;
  for (const line of active) {
    const c = computeLine(line);
    subtotal = round2(subtotal + c.extended);
    lineDiscounts = round2(lineDiscounts + c.discount);
    if (line.taxable) taxableBase = round2(taxableBase + c.extended);
    const units = line.unit === 'kg' ? 1 : line.qty;
    if (line.isReturn) returnCount += units;
    else itemCount += units;
  }
  const txnDisc = txnDiscountAmount(subtotal, txnDiscount);
  // Allocate the transaction discount proportionally to the taxable portion.
  const taxableAfterTxnDisc = subtotal > 0 ? round2(taxableBase - txnDisc * (taxableBase / subtotal)) : taxableBase;
  const rate = taxes.reduce((a, t) => a + t.rate, 0);
  const tax = round2(taxableAfterTxnDisc * rate);
  const netSales = round2(subtotal - txnDisc);
  const total = round2(netSales + tax);
  return {
    subtotal,
    lineDiscounts,
    txnDiscount: txnDisc,
    netSales,
    taxableBase: taxableAfterTxnDisc,
    tax,
    total,
    itemCount,
    returnCount,
  };
}
