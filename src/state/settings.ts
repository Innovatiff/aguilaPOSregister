import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TerminalMode = 'simulated' | 'moneris' | 'globalpayments' | 'none';
export type PrintMode = 'preview' | 'auto' | 'off';

export interface RegisterSettings {
  apiBaseUrl: string;
  registerKey: string;
  registerId: string;
  registerName: string;
  terminalMode: TerminalMode;
  terminalAutoApprove: boolean;
  customerDisplayEnabled: boolean;
  soundEnabled: boolean;
  printMode: PrintMode;
  approval: {
    voidAbove: number;
    discountAbovePct: number;
    discountAboveAmount: number;
    returnsRequireManager: boolean;
    priceOverrideRequiresManager: boolean;
    noSaleRequiresReason: boolean;
  };
  lockAfterMinutes: number;
}

const defaults: RegisterSettings = {
  apiBaseUrl: 'http://localhost:4000',
  registerKey: 'demo-register-key',
  registerId: 'REG-01',
  registerName: 'Front Register',
  terminalMode: 'simulated',
  terminalAutoApprove: false,
  customerDisplayEnabled: true,
  soundEnabled: true,
  printMode: 'preview',
  approval: {
    voidAbove: 20,
    discountAbovePct: 20,
    discountAboveAmount: 20,
    returnsRequireManager: true,
    priceOverrideRequiresManager: true,
    noSaleRequiresReason: true,
  },
  lockAfterMinutes: 0,
};

interface SettingsState extends RegisterSettings {
  update: (patch: Partial<RegisterSettings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      update: (patch) => set((s) => ({ ...s, ...patch, approval: { ...s.approval, ...(patch.approval ?? {}) } })),
      reset: () => set({ ...defaults }),
    }),
    { name: 'aguila.register.settings', version: 1 },
  ),
);
