import type { CartLine, Tender, Totals } from '../core/types';

/**
 * Second screen (customer-facing display). The register broadcasts its state on a BroadcastChannel;
 * the /customer route renders it. In a two-monitor setup the browser window is simply dragged to
 * the customer monitor and put in full screen.
 */
export type DisplayPhase = 'idle' | 'sale' | 'paying' | 'terminal' | 'complete';

export interface DisplayState {
  phase: DisplayPhase;
  storeName: string;
  registerId: string;
  cashierName: string | null;
  lines: Array<Pick<CartLine, 'id' | 'name' | 'qty' | 'unit' | 'unitPrice' | 'isReturn' | 'discount'> & { extended: number }>;
  totals: Totals | null;
  tenders: Tender[];
  balanceDue: number;
  changeDue: number;
  message: string | null;
  updatedAt: string;
}

const CHANNEL = 'aguila-customer-display';
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL);
  return channel;
}

export function publishDisplay(state: DisplayState) {
  try {
    getChannel()?.postMessage(state);
    localStorage.setItem('aguila.customer-display', JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function subscribeDisplay(cb: (s: DisplayState) => void): () => void {
  const ch = getChannel();
  const onMsg = (e: MessageEvent<DisplayState>) => cb(e.data);
  ch?.addEventListener('message', onMsg);
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'aguila.customer-display' && e.newValue) cb(JSON.parse(e.newValue) as DisplayState);
  };
  window.addEventListener('storage', onStorage);
  try {
    const cached = localStorage.getItem('aguila.customer-display');
    if (cached) cb(JSON.parse(cached) as DisplayState);
  } catch {
    /* ignore */
  }
  return () => {
    ch?.removeEventListener('message', onMsg);
    window.removeEventListener('storage', onStorage);
  };
}

export function openCustomerDisplayWindow(): Window | null {
  const url = `${window.location.origin}/customer`;
  return window.open(url, 'aguila-customer-display', 'popup=yes,width=1024,height=768');
}
