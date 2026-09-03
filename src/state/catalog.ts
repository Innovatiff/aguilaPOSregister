import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, Product, StoreInfo, RegisterDevice, Employee } from '../core/types';
import catalogJson from '../data/catalog.json';
import storeJson from '../data/store.json';
import employeesJson from '../data/employees.json';

interface CatalogState {
  version: string;
  source: 'bundled' | 'server';
  lastSyncAt: string | null;
  categories: Category[];
  products: Product[];
  store: StoreInfo;
  registers: RegisterDevice[];
  employees: Employee[];
  setCatalog: (data: { version: string; categories: Category[]; products: Product[] }) => void;
  setStore: (store: StoreInfo, registers?: RegisterDevice[]) => void;
  setEmployees: (employees: Employee[]) => void;
  adjustStock: (productId: string, delta: number) => void;
  resetToBundled: () => void;
}

const bundled = {
  categories: (catalogJson as { categories: Category[] }).categories.slice().sort((a, b) => a.sort - b.sort),
  products: (catalogJson as { products: Product[] }).products,
  store: (storeJson as { store: StoreInfo }).store,
  registers: (storeJson as { registers: RegisterDevice[] }).registers,
  employees: employeesJson as Employee[],
};

export const useCatalog = create<CatalogState>()(
  persist(
    (set) => ({
      version: 'bundled-1',
      source: 'bundled',
      lastSyncAt: null,
      categories: bundled.categories,
      products: bundled.products,
      store: bundled.store,
      registers: bundled.registers,
      employees: bundled.employees,
      setCatalog: (data) =>
        set({
          version: data.version,
          source: 'server',
          lastSyncAt: new Date().toISOString(),
          categories: data.categories.slice().sort((a, b) => a.sort - b.sort),
          products: data.products,
        }),
      setStore: (store, registers) => set((s) => ({ store, registers: registers ?? s.registers })),
      setEmployees: (employees) => set({ employees }),
      adjustStock: (productId, delta) =>
        set((s) => ({ products: s.products.map((p) => (p.id === productId ? { ...p, stock: Math.round((p.stock + delta) * 1000) / 1000 } : p)) })),
      resetToBundled: () => set({ version: 'bundled-1', source: 'bundled', lastSyncAt: null, ...bundled }),
    }),
    { name: 'aguila.register.catalog', version: 1 },
  ),
);

// ---- lookups (pure helpers over the current state) ----
export function findProductByBarcode(code: string): Product | undefined {
  const { products } = useCatalog.getState();
  return products.find((p) => p.active && p.barcode === code);
}
export function findProductByPlu(plu: string): Product | undefined {
  const { products } = useCatalog.getState();
  const norm = String(parseInt(plu, 10));
  return products.find((p) => p.active && String(parseInt(p.plu, 10)) === norm);
}
export function findProductById(id: string): Product | undefined {
  return useCatalog.getState().products.find((p) => p.id === id);
}
export function searchProducts(q: string, limit = 40): Product[] {
  const { products } = useCatalog.getState();
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return products
    .filter((p) => p.active && (p.name.toLowerCase().includes(s) || p.plu.includes(s) || (p.barcode ?? '').includes(s) || p.sku.toLowerCase().includes(s)))
    .slice(0, limit);
}
export function categoryById(id: string): Category | undefined {
  return useCatalog.getState().categories.find((c) => c.id === id);
}
export function employeeFullName(e: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${e.firstName} ${e.lastName}`.trim();
}
