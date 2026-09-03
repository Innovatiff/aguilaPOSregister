import { useSettings } from '../state/settings';
import type { Category, Employee, PosEvent, Product, RegisterDevice, StoreInfo } from '../core/types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 6000): Promise<T> {
  const { apiBaseUrl, registerKey, registerId } = useSettings.getState();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Register-Key': registerKey,
        'X-Register-Id': registerId,
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) msg = body.error;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, msg);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export interface BootstrapResponse {
  serverTime: string;
  store: StoreInfo;
  registers: RegisterDevice[];
  catalog: { version: string; categories: Category[]; products: Product[] };
  employees: Employee[];
}

export const api = {
  bootstrap: () => request<BootstrapResponse>('/api/register/bootstrap'),
  catalog: () => request<{ version: string; categories: Category[]; products: Product[] }>('/api/catalog'),
  verifyPin: (pin: string) => request<{ employee: Employee }>('/api/auth/pin', { method: 'POST', body: JSON.stringify({ pin }) }),
  pushEvents: (events: PosEvent[]) =>
    request<{ accepted: string[]; rejected: Array<{ id: string; error: string }> }>('/api/sync/events', { method: 'POST', body: JSON.stringify({ events }) }, 10000),
  heartbeat: (status: Record<string, unknown>) => request<{ ok: true; serverTime: string; catalogVersion: string }>('/api/register/heartbeat', { method: 'POST', body: JSON.stringify(status) }),
};
