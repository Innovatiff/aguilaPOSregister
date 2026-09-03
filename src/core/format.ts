export function fmtTime(iso: string | null | undefined, locale = 'es-US'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function fmtTimeSec(iso: string | null | undefined, locale = 'es-US'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtDate(iso: string | null | undefined, locale = 'es-US'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function fmtDateTime(iso: string | null | undefined, locale = 'es-US'): string {
  if (!iso) return '—';
  return `${fmtDate(iso, locale)} ${fmtTime(iso, locale)}`;
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function elapsedSince(iso: string, now = Date.now()): string {
  const sec = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}

/** Simple Spanish pluralizer: plural(1, 'artículo') -> "1 artículo", plural(3, 'artículo') -> "3 artículos". */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${Math.abs(n) === 1 ? singular : pluralForm}`;
}

export const TENDER_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito Interac',
  visa: 'Visa',
  mastercard: 'MasterCard',
  amex: 'Amex',
  gift: 'Tarjeta de regalo',
  cheque: 'Cheque',
  other: 'Otro',
};

export const ROLE_LABEL: Record<string, string> = {
  cashier: 'Cajero/a',
  supervisor: 'Supervisor/a',
  manager: 'Gerente',
};

export const TXN_STATUS_LABEL: Record<string, string> = {
  open: 'abierta',
  completed: 'completada',
  voided: 'anulada',
  held: 'en espera',
};

export const BARCODE_KIND_LABEL: Record<string, string> = {
  'upc-a': 'UPC-A',
  'ean-13': 'EAN-13',
  'price-embedded': 'etiqueta de báscula',
  plu: 'PLU',
  'plu-entry': 'PLU',
  unknown: 'desconocido',
};

export const CATALOG_SOURCE_LABEL: Record<string, string> = {
  bundled: 'local',
  server: 'servidor',
};
