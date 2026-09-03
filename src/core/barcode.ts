/**
 * Barcode helpers for USB "keyboard wedge" scanners.
 *  - UPC-A (12 digits) and EAN-13 (13 digits) with GS1 check digit validation
 *  - UPC-A "type 2" price-embedded labels printed by deli/meat scales:
 *      2 IIIII PPPPP C  -> item code (5) + price in cents (5) + check digit
 *  - Short numeric codes are treated as PLU entries (produce stickers: 4046 avocado etc.)
 */
export interface ParsedBarcode {
  raw: string;
  kind: 'upc-a' | 'ean-13' | 'price-embedded' | 'plu' | 'unknown';
  valid: boolean;
  /** normalized lookup code (for price-embedded: the 5-digit item code without leading zeros) */
  code: string;
  /** embedded price in dollars when kind === 'price-embedded' */
  embeddedPrice?: number;
}

export function gs1CheckDigit(body: string): string {
  const digits = body.split('').map(Number).reverse();
  let s = 0;
  digits.forEach((d, i) => {
    s += d * (i % 2 === 0 ? 3 : 1);
  });
  return String((10 - (s % 10)) % 10);
}

export function isValidGs1(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  return gs1CheckDigit(code.slice(0, -1)) === code.slice(-1);
}

export function parseBarcode(input: string): ParsedBarcode {
  const raw = input.trim();
  const digitsOnly = /^\d+$/.test(raw);
  if (!digitsOnly) return { raw, kind: 'unknown', valid: false, code: raw };

  // EAN-13 that is really a UPC-A with a leading zero
  let code = raw;
  if (code.length === 13 && code.startsWith('0')) code = code.slice(1);

  if (code.length === 12) {
    const valid = isValidGs1(code);
    if (code.startsWith('2')) {
      const item = code.slice(1, 6);
      const cents = parseInt(code.slice(6, 11), 10);
      return {
        raw,
        kind: 'price-embedded',
        valid,
        code: String(parseInt(item, 10)),
        embeddedPrice: cents / 100,
      };
    }
    return { raw, kind: 'upc-a', valid, code };
  }
  if (code.length === 13) {
    return { raw, kind: 'ean-13', valid: isValidGs1(code), code };
  }
  if (code.length >= 3 && code.length <= 6) {
    return { raw, kind: 'plu', valid: true, code: String(parseInt(code, 10)) };
  }
  return { raw, kind: 'unknown', valid: false, code };
}

/** Build a scale label (type-2 UPC-A) for a weighed product: used by the demo "scale" simulator. */
export function buildPriceEmbedded(itemCode: string | number, priceDollars: number): string {
  const item = String(itemCode).padStart(5, '0').slice(-5);
  const cents = String(Math.round(priceDollars * 100)).padStart(5, '0').slice(-5);
  const body = `2${item}${cents}`;
  return body + gs1CheckDigit(body);
}
