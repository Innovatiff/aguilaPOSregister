export function fmtTime(iso: string | null | undefined, locale = 'en-CA'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function fmtTimeSec(iso: string | null | undefined, locale = 'en-CA'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtDate(iso: string | null | undefined, locale = 'en-CA'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function fmtDateTime(iso: string | null | undefined, locale = 'en-CA'): string {
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

export const TENDER_LABEL: Record<string, string> = {
  cash: 'Cash',
  debit: 'Interac Debit',
  visa: 'Visa',
  mastercard: 'MasterCard',
  amex: 'Amex',
  gift: 'Gift Card',
  cheque: 'Cheque',
  other: 'Other',
};
