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

// Build-time defaults (set VITE_API_BASE_URL etc. on the hosting provider); users can still change them in Settings.
const env = import.meta.env as Record<string, string | undefined>;

const defaults: RegisterSettings = {
  apiBaseUrl: env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:4000',
  registerKey: env.VITE_REGISTER_KEY || 'demo-register-key',
  registerId: env.VITE_REGISTER_ID || 'REG-01',
  registerName: env.VITE_REGISTER_NAME || 'Front Register',
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
