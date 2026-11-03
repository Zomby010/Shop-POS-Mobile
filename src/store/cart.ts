/** The cart being rung up on this phone. Nothing reaches the server until Pay or Hold. */
import { create } from 'zustand';

import type { Product } from '../api/types';
import { type AddInput, type CartLine, addProduct, addUnlisted, setQuantity } from '../domain/cart';

interface CartState {
  lines: CartLine[];
  label: string;
  /** Product ids the server said are short of stock, shown in red. */
  short: Set<number>;
  add: (p: Product, input?: AddInput) => void;
  addUnlisted: (name: string, priceCents: number, qty: number) => void;
  setQty: (key: string, qtyMilli: number, p: Product | undefined) => void;
  replace: (lines: CartLine[], label?: string) => void;
  markShort: (ids: number[]) => void;
  clear: () => void;
}

export const useCart = create<CartState>((set) => ({
  lines: [],
  label: '',
  short: new Set(),
  add: (p, input) => set((s) => ({ lines: addProduct(s.lines, p, input) })),
  addUnlisted: (name, priceCents, qty) => set((s) => ({ lines: addUnlisted(s.lines, name, priceCents, qty) })),
  setQty: (key, qtyMilli, p) => set((s) => ({ lines: setQuantity(s.lines, key, qtyMilli, p), short: new Set() })),
  replace: (lines, label = '') => set({ lines, label, short: new Set() }),
  markShort: (ids) => set({ short: new Set(ids) }),
  clear: () => set({ lines: [], label: '', short: new Set() }),
}));
