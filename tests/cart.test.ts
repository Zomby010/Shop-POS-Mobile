import { describe, expect, it } from 'vitest';

import type { Product } from '../src/api/types';
import { CartError, addProduct, addUnlisted, cartTotal, needsApproval, setQuantity, toApiLines } from '../src/domain/cart';
import { planPayment } from '../src/domain/payment';
import { priceByAmount, priceByQuantity } from '../src/domain/pricing';
import { formatQty, ksh, parseMoney, roundShilling } from '../src/lib/money';

const base: Omit<Product, 'id' | 'name' | 'sold_by' | 'unit' | 'selling_price' | 'stock_qty'> = {
  barcode: null, category_id: null, category: null, stock_status: 'ok', low_stock_threshold: null, reorder_qty: null,
  active: true, quick_category_id: null, quick_order: 0, added_at_till: false, sell_mode: 'both', tiers: [], presets: [],
};
const soap: Product = { ...base, id: 1, name: 'Bar soap', sold_by: 'piece', unit: 'pcs', selling_price: '210.00', stock_qty: '24.000',
  tiers: [{ min_qty: '12.000', unit_price: '200.00' }] };
const rice: Product = { ...base, id: 2, name: 'Pishori', sold_by: 'weight', unit: 'kg', selling_price: '200.00', stock_qty: '50.000' };
const oil: Product = { ...base, id: 3, name: 'Loose oil', sold_by: 'volume', unit: 'L', selling_price: '300.00', stock_qty: '20.000' };

// Same cases as apps/sales/tests/test_services.py on the website.
describe('cart', () => {
  it('merges repeat scans and applies the bulk tier', () => {
    let lines = addProduct([], soap);
    lines = addProduct(lines, soap, { qtyMilli: 11000 });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ qtyMilli: 12000, unitPriceCents: 20000, tierApplied: true });
    expect(cartTotal(lines)).toBe(240000);
  });

  it('keeps loose scoops as separate lines and sells by amount', () => {
    let lines = addProduct([], rice, { qtyMilli: 250 });
    lines = addProduct(lines, rice, { qtyMilli: 500 });
    lines = addProduct(lines, oil, { amountCents: 5000 });
    expect(lines).toHaveLength(3);
    expect(lines[2]).toMatchObject({ qtyMilli: 167, totalCents: 5000 });
    expect(cartTotal(lines)).toBe(20000);
  });

  it('refuses whole-piece and stock mistakes', () => {
    expect(() => addProduct([], soap, { qtyMilli: 1500 })).toThrow(CartError);
    expect(() => addProduct([], soap, { qtyMilli: 25000 })).toThrow(/only 24 pcs/);
  });

  it('asks for approval only when lowering', () => {
    const lines = addProduct([], soap, { qtyMilli: 3000 });
    expect(needsApproval(lines[0], 5000)).toBe(false);
    expect(needsApproval(lines[0], 2000)).toBe(true);
    expect(setQuantity(lines, lines[0].key, 0, soap)).toHaveLength(0);
    expect(setQuantity(lines, lines[0].key, 12000, soap)[0].tierApplied).toBe(true);
  });

  it('sends exact decimals to the server', () => {
    let lines = addProduct([], oil, { amountCents: 5000 });
    lines = addProduct(lines, rice, { fixedQtyMilli: 500, fixedTotalCents: 7000 });
    lines = addProduct(lines, soap, { qtyMilli: 2000 });
    lines = addUnlisted(lines, '  phone   charger ', 30000, 1);
    expect(toApiLines(lines)).toEqual([
      { product_id: 3, amount: '50.00' },
      { product_id: 2, quantity: '0.500', fixed_total: '70.00' },
      { product_id: 1, quantity: '2.000' },
      { name: 'phone charger', price: '300.00', quantity: '1' },
    ]);
  });
});

describe('shop rules', () => {
  it('rounds loose goods to the shilling', () => {
    expect(priceByQuantity({ name: 'Rice', soldBy: 'weight', sellingPriceCents: 21500 }, 250).totalCents).toBe(5400);
    expect(roundShilling(5349)).toBe(5300);
  });

  it('works out bulk tiers when selling by amount', () => {
    const sugar = { name: 'Sugar', soldBy: 'weight' as const, sellingPriceCents: 18000 };
    const line = priceByAmount(sugar, 180000, [{ minQtyMilli: 10000, unitPriceCents: 17000 }]);
    expect(line).toMatchObject({ unitPriceCents: 17000, qtyMilli: 10588 });
  });

  it('splits payment like the till', () => {
    expect(planPayment(25000, { cashTenderedCents: 30000, mpesaCents: 5000 }).changeCents).toBe(10000);
    expect(() => planPayment(25000, { cashTenderedCents: 1000 })).toThrow();
  });

  it('formats like the website', () => {
    expect(ksh(125000)).toBe('KSh 1,250.00');
    expect(parseMoney('2,450')).toBe(245000);
    expect(formatQty(167)).toBe('0.167');
  });
});
