import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction } from '../core/types';

export type GridView = 'categories' | 'items' | 'search';

interface CartState {
  txn: Transaction | null;
  buffer: string;
  pendingQty: number | null;
  returnMode: boolean;
  selectedLineId: string | null;
  held: Transaction[];
  lastCompleted: Transaction | null;
  view: GridView;
  activeCategoryId: string | null;
  search: string;
  setTxn: (txn: Transaction | null) => void;
  setBuffer: (b: string) => void;
  pressKey: (k: string) => void;
  clearBuffer: () => void;
  setPendingQty: (q: number | null) => void;
  setReturnMode: (on: boolean) => void;
  selectLine: (id: string | null) => void;
  setHeld: (held: Transaction[]) => void;
  setLastCompleted: (t: Transaction | null) => void;
  setView: (v: GridView, categoryId?: string | null) => void;
  setSearch: (q: string) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      txn: null,
      buffer: '',
      pendingQty: null,
      returnMode: false,
      selectedLineId: null,
      held: [],
      lastCompleted: null,
      view: 'categories',
      activeCategoryId: null,
      search: '',
      setTxn: (txn) => set({ txn }),
      setBuffer: (buffer) => set({ buffer }),
      pressKey: (k) =>
        set((s) => {
          if (k === '.' && s.buffer.includes('.')) return {};
          if (k === '00' && s.buffer === '') return {};
          const next = (s.buffer + k).slice(0, 9);
          return { buffer: next };
        }),
      clearBuffer: () => set({ buffer: '' }),
      setPendingQty: (pendingQty) => set({ pendingQty }),
      setReturnMode: (returnMode) => set({ returnMode }),
      selectLine: (selectedLineId) => set({ selectedLineId }),
      setHeld: (held) => set({ held }),
      setLastCompleted: (lastCompleted) => set({ lastCompleted }),
      setView: (view, categoryId) => set((s) => ({ view, activeCategoryId: categoryId === undefined ? s.activeCategoryId : categoryId })),
      setSearch: (search) => set({ search }),
    }),
    {
      name: 'aguila.register.cart',
      version: 1,
      partialize: (s) => ({ txn: s.txn, held: s.held, lastCompleted: s.lastCompleted, returnMode: s.returnMode }) as Partial<CartState>,
    },
  ),
);
