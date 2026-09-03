import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PosEvent, Shift, Transaction } from '../core/types';

const KEEP_DAYS = 7;

interface JournalState {
  receiptCounter: number;
  transactions: Transaction[];
  events: PosEvent[];
  closedShifts: Shift[];
  nextReceiptNumber: (registerId: string) => string;
  recordTransaction: (txn: Transaction) => void;
  recordEvent: (ev: PosEvent) => void;
  recordClosedShift: (shift: Shift) => void;
  prune: () => void;
  clearAll: () => void;
}

export const useJournal = create<JournalState>()(
  persist(
    (set, get) => ({
      receiptCounter: 0,
      transactions: [],
      events: [],
      closedShifts: [],
      nextReceiptNumber: (registerId) => {
        const n = get().receiptCounter + 1;
        set({ receiptCounter: n });
        return `${registerId}-${String(n).padStart(6, '0')}`;
      },
      recordTransaction: (txn) =>
        set((s) => {
          const idx = s.transactions.findIndex((t) => t.id === txn.id);
          const transactions = s.transactions.slice();
          if (idx >= 0) transactions[idx] = txn;
          else transactions.push(txn);
          return { transactions };
        }),
      recordEvent: (ev) => set((s) => ({ events: [...s.events, ev] })),
      recordClosedShift: (shift) => set((s) => ({ closedShifts: [...s.closedShifts.filter((x) => x.id !== shift.id), shift] })),
      prune: () =>
        set((s) => {
          const cutoff = Date.now() - KEEP_DAYS * 86400000;
          return {
            transactions: s.transactions.filter((t) => Date.parse(t.startedAt) > cutoff),
            events: s.events.filter((e) => Date.parse(e.at) > cutoff),
            closedShifts: s.closedShifts.filter((sh) => Date.parse(sh.startedAt) > cutoff),
          };
        }),
      clearAll: () => set({ transactions: [], events: [], closedShifts: [], receiptCounter: 0 }),
    }),
    { name: 'aguila.register.journal', version: 1 },
  ),
);
