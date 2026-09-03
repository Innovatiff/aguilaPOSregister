import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PosEvent } from '../core/types';

interface SyncState {
  queue: PosEvent[];
  online: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  sentCount: number;
  enqueue: (ev: PosEvent) => void;
  ack: (ids: string[]) => void;
  setOnline: (online: boolean, error?: string | null) => void;
}

export const useSync = create<SyncState>()(
  persist(
    (set) => ({
      queue: [],
      online: false,
      lastSyncAt: null,
      lastError: null,
      sentCount: 0,
      enqueue: (ev) => set((s) => ({ queue: [...s.queue, ev] })),
      ack: (ids) =>
        set((s) => ({
          queue: s.queue.filter((e) => !ids.includes(e.id)),
          sentCount: s.sentCount + ids.length,
          lastSyncAt: new Date().toISOString(),
        })),
      setOnline: (online, error = null) => set({ online, lastError: error }),
    }),
    { name: 'aguila.register.sync', version: 1, partialize: (s) => ({ queue: s.queue, sentCount: s.sentCount, lastSyncAt: s.lastSyncAt }) as Partial<SyncState> },
  ),
);
