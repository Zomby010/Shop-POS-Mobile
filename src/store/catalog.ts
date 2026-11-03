/** Products, quick-sale tabs and categories from the server, kept on the phone so the sell screen opens instantly. */
import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { get } from '../api/client';
import type { Catalog, Product } from '../api/types';

const CACHE_KEY = 'shoppos.catalog';

interface CatalogState {
  catalog: Catalog | null;
  byId: Map<number, Product>;
  loading: boolean;
  error: string | null;
  loadedAt: number | null;
  load: (force?: boolean) => Promise<void>;
  clear: () => Promise<void>;
}

const index = (c: Catalog | null) => new Map((c?.products ?? []).map((p) => [p.id, p]));

export const useCatalog = create<CatalogState>((set, getState) => ({
  catalog: null,
  byId: new Map(),
  loading: false,
  error: null,
  loadedAt: null,

  async load(force = false) {
    if (getState().loading) return;
    if (!getState().catalog && !force) {
      const cached = await Storage.getItem(CACHE_KEY);
      if (cached) {
        const catalog = JSON.parse(cached) as Catalog;
        set({ catalog, byId: index(catalog) });
      }
    }
    set({ loading: true, error: null });
    try {
      const catalog = await get<Catalog>('catalog/');
      set({ catalog, byId: index(catalog), loadedAt: Date.now() });
      await Storage.setItem(CACHE_KEY, JSON.stringify(catalog));
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  async clear() {
    await Storage.removeItem(CACHE_KEY);
    set({ catalog: null, byId: new Map(), loadedAt: null });
  },
}));

/** Name, barcode or category search, like the website's All items list. */
export function searchProducts(products: Product[], term: string, categoryId?: number | 'none' | null) {
  const t = term.trim().toLowerCase();
  return products.filter((p) => {
    if (categoryId === 'none' && p.category_id !== null) return false;
    if (typeof categoryId === 'number' && p.category_id !== categoryId) return false;
    if (!t) return true;
    return p.name.toLowerCase().includes(t) || (p.barcode ?? '').includes(t) || (p.category ?? '').toLowerCase().includes(t);
  });
}
