import type { TenderType } from '../core/types';

/**
 * Payment terminal abstraction (semi-integrated flow).
 * The POS sends the amount; the customer taps/inserts on the PIN pad; the terminal answers with
 * approval + auth code. In production this adapter talks to the Moneris / Global Payments cloud
 * or LAN API. The simulator below reproduces the same state machine for demos.
 */
export type TerminalPhase = 'idle' | 'connecting' | 'waiting_for_card' | 'processing' | 'approved' | 'declined' | 'cancelled' | 'error';

export interface TerminalResult {
  approved: boolean;
  amount: number;
  tenderType: TenderType;
  authCode?: string;
  cardLast4?: string;
  cardBrand?: string;
  entryMode?: 'tap' | 'chip' | 'swipe';
  message: string;
  terminalId: string;
}

export interface PaymentTerminal {
  readonly phase: TerminalPhase;
  startPayment(amount: number, tenderType: TenderType): Promise<TerminalResult>;
  cancel(): void;
  subscribe(cb: (phase: TerminalPhase, detail?: string) => void): () => void;
  /** simulator controls (no-ops on real hardware) */
  simulateTap(): void;
  simulateDecline(): void;
}

const BRANDS: Record<string, string> = { debit: 'Interac', visa: 'Visa', mastercard: 'MasterCard', amex: 'Amex' };

export class SimulatedTerminal implements PaymentTerminal {
  phase: TerminalPhase = 'idle';
  private subs = new Set<(phase: TerminalPhase, detail?: string) => void>();
  private pending: { amount: number; tenderType: TenderType; resolve: (r: TerminalResult) => void } | null = null;
  private timers: number[] = [];
  private autoApprove: boolean;
  terminalId = 'SIM-MONERIS-01';

  constructor(opts: { autoApprove?: boolean } = {}) {
    this.autoApprove = !!opts.autoApprove;
  }

  private setPhase(p: TerminalPhase, detail?: string) {
    this.phase = p;
    for (const s of this.subs) s(p, detail);
  }

  private clearTimers() {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
  }

  subscribe(cb: (phase: TerminalPhase, detail?: string) => void) {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }

  startPayment(amount: number, tenderType: TenderType): Promise<TerminalResult> {
    this.cancel();
    return new Promise((resolve) => {
      this.pending = { amount, tenderType, resolve };
      this.setPhase('connecting', 'Contacting terminal…');
      this.timers.push(
        window.setTimeout(() => {
          this.setPhase('waiting_for_card', 'Customer: tap, insert or swipe card');
          if (this.autoApprove) this.timers.push(window.setTimeout(() => this.simulateTap(), 2500));
        }, 700),
      );
    });
  }

  simulateTap() {
    if (!this.pending || this.phase !== 'waiting_for_card') return;
    this.setPhase('processing', 'Processing… please wait');
    this.timers.push(
      window.setTimeout(() => {
        const p = this.pending;
        if (!p) return;
        const authCode = Math.random().toString(36).slice(2, 8).toUpperCase();
        const last4 = String(Math.floor(1000 + Math.random() * 9000));
        this.setPhase('approved', `APPROVED  Auth ${authCode}`);
        this.pending = null;
        p.resolve({ approved: true, amount: p.amount, tenderType: p.tenderType, authCode, cardLast4: last4, cardBrand: BRANDS[p.tenderType] ?? 'Card', entryMode: 'tap', message: 'APPROVED', terminalId: this.terminalId });
      }, 1300),
    );
  }

  simulateDecline() {
    if (!this.pending || (this.phase !== 'waiting_for_card' && this.phase !== 'processing')) return;
    this.clearTimers();
    const p = this.pending;
    this.pending = null;
    this.setPhase('declined', 'DECLINED — insufficient funds (simulated)');
    p.resolve({ approved: false, amount: p.amount, tenderType: p.tenderType, message: 'DECLINED', terminalId: this.terminalId });
  }

  cancel() {
    this.clearTimers();
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      this.setPhase('cancelled', 'Cancelled by cashier');
      p.resolve({ approved: false, amount: p.amount, tenderType: p.tenderType, message: 'CANCELLED', terminalId: this.terminalId });
    } else {
      this.setPhase('idle');
    }
  }
}

let instance: SimulatedTerminal | null = null;
export function getTerminal(autoApprove: boolean): PaymentTerminal {
  if (!instance) instance = new SimulatedTerminal({ autoApprove });
  (instance as unknown as { autoApprove: boolean }).autoApprove = autoApprove;
  return instance;
}
