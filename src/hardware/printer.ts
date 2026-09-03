import type { StoreInfo, Transaction } from '../core/types';
import { computeLine } from '../core/tax';
import { fixed2 } from '../core/money';
import { TENDER_LABEL, fmtDateTime } from '../core/format';

const W = 42; // 80mm thermal paper, Font A

function pad(left: string, right: string, width = W): string {
  const l = left.slice(0, Math.max(0, width - right.length - 1));
  return l + ' '.repeat(Math.max(1, width - l.length - right.length)) + right;
}
function center(s: string, width = W): string {
  const t = s.slice(0, width);
  const gap = Math.floor((width - t.length) / 2);
  return ' '.repeat(Math.max(0, gap)) + t;
}
const rule = '-'.repeat(W);

/** Plain-text receipt in ESC/POS-friendly layout (what a thermal printer would print). */
export function receiptText(txn: Transaction, store: StoreInfo, opts: { reprint?: boolean } = {}): string {
  const out: string[] = [];
  out.push(center(store.name.toUpperCase()));
  out.push(center(store.address1.toUpperCase()));
  out.push(center(`${store.city.toUpperCase()} ${store.province} ${store.postalCode}`));
  out.push(center(`TEL: ${store.phone}`));
  out.push(center(store.email.toUpperCase()));
  const hst = store.taxes.find((t) => t.id === 'hst');
  if (hst?.registration) out.push(center(hst.registration));
  out.push(rule);
  if (opts.reprint) out.push(center('*** DUPLICATE RECEIPT ***'));
  if (txn.kind !== 'sale') out.push(center(txn.kind === 'return' ? '*** RETURN ***' : '*** SALE WITH RETURN ***'));
  out.push(pad(`Receipt ${txn.number}`, fmtDateTime(txn.completedAt ?? txn.startedAt)));
  out.push(pad(`Cashier: ${txn.employeeName}`, `Reg ${txn.registerId}`));
  out.push(rule);
  for (const l of txn.lines) {
    if (l.voided) continue;
    const c = computeLine(l);
    const flag = l.taxable ? ' H' : '  ';
    if (l.unit === 'kg') {
      out.push(l.name.slice(0, W));
      out.push(pad(`  ${l.qty.toFixed(3)} kg @ ${fixed2(l.unitPrice)}/kg`, fixed2(c.gross) + flag));
    } else if (l.qty !== 1) {
      out.push(l.name.slice(0, W));
      out.push(pad(`  ${l.qty} @ ${fixed2(l.unitPrice)}`, fixed2(c.gross) + flag));
    } else {
      out.push(pad((l.isReturn ? 'RETURN ' : '') + l.name, fixed2(c.gross) + flag));
    }
    if (l.priceOverride) out.push(pad(`  price changed from ${fixed2(l.priceOverride.from)}`, ''));
    if (l.discount) out.push(pad(`  Discount ${l.discount.type === 'percent' ? `${l.discount.value}%` : ''} (${l.discount.reason})`, `-${fixed2(c.discount)}`));
  }
  out.push(rule);
  out.push(pad('SUBTOTAL', fixed2(txn.totals.subtotal)));
  if (txn.totals.txnDiscount) out.push(pad(`DISCOUNT (${txn.txnDiscount?.reason ?? ''})`, `-${fixed2(txn.totals.txnDiscount)}`));
  out.push(pad(`HST 13%`, fixed2(txn.totals.tax)));
  out.push(pad('TOTAL', fixed2(txn.totals.total)));
  out.push(rule);
  for (const t of txn.tenders) {
    const label = TENDER_LABEL[t.type] ?? t.type;
    out.push(pad(label.toUpperCase() + (t.cardLast4 ? ` ****${t.cardLast4}` : ''), fixed2(t.amount)));
    if (t.ref) out.push(pad(`  Auth ${t.ref}`, ''));
  }
  if (txn.changeDue > 0) out.push(pad('CHANGE', fixed2(txn.changeDue)));
  out.push(rule);
  out.push(pad(`Items: ${txn.totals.itemCount}`, `H = HST 13%`));
  out.push('');
  if (store.receiptHeader) out.push(center(store.receiptHeader));
  if (store.receiptFooter) for (const line of wrap(store.receiptFooter, W)) out.push(center(line));
  out.push('');
  out.push(center(`*${txn.number}*`));
  return out.join('\n');
}

function wrap(s: string, width: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width) {
      lines.push(cur.trim());
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Sends the receipt to the browser print dialog (thermal driver in production). */
export function printText(text: string, title = 'Receipt') {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(`<!doctype html><html><head><title>${title}</title><style>
    @page { size: 80mm auto; margin: 4mm; }
    body { margin:0; font: 11px/1.25 "Courier New", ui-monospace, monospace; white-space: pre; color:#000; }
  </style></head><body>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</body></html>`);
  doc.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 2000);
  }, 150);
}
