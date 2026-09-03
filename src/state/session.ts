import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Employee, Shift, Segment } from '../core/types';

export type SessionStatus = 'signed_out' | 'active' | 'locked';

interface SessionState {
  status: SessionStatus;
  /** the clerk currently operating the register */
  employee: Employee | null;
  /** open or on-break shifts on this register keyed by employeeId */
  shifts: Record<string, Shift>;
  lockedAt: string | null;
  lastActivityAt: string | null;
  failedPinAttempts: number;
  setActive: (employee: Employee) => void;
  setLocked: () => void;
  setSignedOut: () => void;
  upsertShift: (shift: Shift) => void;
  removeShift: (shiftId: string) => void;
  touch: () => void;
  bumpFailed: () => void;
  resetFailed: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      status: 'signed_out',
      employee: null,
      shifts: {},
      lockedAt: null,
      lastActivityAt: null,
      failedPinAttempts: 0,
      setActive: (employee) => set({ status: 'active', employee, lockedAt: null, lastActivityAt: new Date().toISOString() }),
      setLocked: () => set({ status: 'locked', lockedAt: new Date().toISOString() }),
      setSignedOut: () => set({ status: 'signed_out', employee: null, lockedAt: null }),
      upsertShift: (shift) => set((s) => ({ shifts: { ...s.shifts, [shift.employeeId]: shift } })),
      removeShift: (shiftId) =>
        set((s) => {
          const shifts = { ...s.shifts };
          for (const k of Object.keys(shifts)) if (shifts[k].id === shiftId) delete shifts[k];
          return { shifts };
        }),
      touch: () => set({ lastActivityAt: new Date().toISOString() }),
      bumpFailed: () => set((s) => ({ failedPinAttempts: s.failedPinAttempts + 1 })),
      resetFailed: () => set({ failedPinAttempts: 0 }),
    }),
    { name: 'aguila.register.session', version: 1 },
  ),
);

export function currentShift(): Shift | null {
  const { employee, shifts } = useSession.getState();
  if (!employee) return null;
  return shifts[employee.id] ?? null;
}

export function currentSegment(shift: Shift | null): Segment | null {
  if (!shift) return null;
  return shift.segments.find((s) => !s.endedAt) ?? null;
}

export function shiftsOnBreak(): Shift[] {
  return Object.values(useSession.getState().shifts).filter((s) => s.status === 'on_break');
}
