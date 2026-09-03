/** Round to cents, avoiding floating point drift (e.g. 1.005 -> 1.01). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

export function sum(values: number[]): number {
  return round2(values.reduce((a, b) => a + b, 0));
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(n: number, locale = 'en-CA', currency = 'CAD'): string {
  const key = `${locale}|${currency}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: 'currency', currency });
    formatters.set(key, f);
  }
  return f.format(n);
}

/** Money without currency symbol, always 2 decimals, minus sign for negatives. */
export function fixed2(n: number): string {
  const v = round2(n);
  return (v < 0 ? '-' : '') + Math.abs(v).toFixed(2);
}

export function formatWeight(kg: number): string {
  return `${round3(kg).toFixed(3)} kg`;
}

/** Parse a keypad buffer like "1250" (cents entry) or "12.50" into dollars. */
export function parseAmountBuffer(buffer: string): number {
  if (!buffer) return 0;
  if (buffer.includes('.')) return round2(parseFloat(buffer) || 0);
  // cents-entry mode: digits typed without a decimal are cents (like a classic register)
  return round2(parseInt(buffer, 10) / 100 || 0);
}

/** Parse keypad buffer as a plain integer/decimal quantity. */
export function parseQtyBuffer(buffer: string): number {
  if (!buffer) return 0;
  return parseFloat(buffer) || 0;
}
