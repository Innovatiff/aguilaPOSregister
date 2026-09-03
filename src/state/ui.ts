import { create } from 'zustand';
import type { Employee, Product, SegmentReport, Transaction, TenderType, Category } from '../core/types';
import type { ParsedBarcode } from '../core/barcode';

export type Modal =
  | { kind: 'pin'; title: string; subtitle?: string; minRole?: 'supervisor' | 'manager'; resolve: (e: Employee | null) => void }
  | { kind: 'qty'; lineId: string; resolve: (qty: number | null) => void }
  | { kind: 'weight'; product: Product; resolve: (kg: number | null) => void }
  | { kind: 'price'; lineId: string; resolve: (v: { price: number; reason: string } | null) => void }
  | { kind: 'discount'; target: 'line' | 'txn'; mode: 'amount' | 'percent'; lineId?: string; resolve: (v: { value: number; reason: string } | null) => void }
  | { kind: 'hold'; resolve: (label: string | null) => void }
  | { kind: 'recall' }
  | { kind: 'reason'; title: string; options: string[]; resolve: (reason: string | null) => void }
  | { kind: 'amount'; title: string; subtitle?: string; withReason?: boolean; options?: string[]; resolve: (v: { amount: number; reason: string } | null) => void }
  | { kind: 'terminal'; amount: number; tenderType: TenderType }
  | { kind: 'change'; txn: Transaction }
  | { kind: 'receipt'; txn: Transaction; reprint?: boolean }
  | { kind: 'break-confirm' }
  | { kind: 'closing-report'; report: SegmentReport; mode: 'break' | 'shift' | 'view'; onConfirm?: () => void }
  | { kind: 'end-shift' }
  | { kind: 'opening-float'; employee: Employee; resolve: (amount: number | null) => void }
  | { kind: 'unknown-barcode'; parsed: ParsedBarcode }
  | { kind: 'price-lookup' }
  | { kind: 'manual-scan' }
  | { kind: 'open-dept'; category: Category; amount: number; resolve: (ok: boolean) => void }
  | { kind: 'confirm'; title: string; message: string; danger?: boolean; confirmLabel?: string; resolve: (ok: boolean) => void }
  | { kind: 'menu' };

export interface Toast {
  id: number;
  tone: 'info' | 'success' | 'warning' | 'danger';
  text: string;
}

interface UIState {
  modal: Modal | null;
  toasts: Toast[];
  openModal: (m: Modal) => void;
  closeModal: () => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

export const useUI = create<UIState>()((set) => ({
  modal: null,
  toasts: [],
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  toast: (text, tone = 'info') => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, tone, text }].slice(-4) }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(text: string, tone?: Toast['tone']) {
  useUI.getState().toast(text, tone);
}

/** Promise helper so business code can await a modal answer. */
export function ask<T>(build: (resolve: (v: T) => void) => Modal): Promise<T> {
  return new Promise<T>((resolve) => {
    const modal = build((v) => {
      useUI.getState().closeModal();
      resolve(v);
    });
    useUI.getState().openModal(modal);
  });
}
