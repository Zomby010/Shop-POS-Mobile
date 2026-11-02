/**
 * The cart on the phone. It prices lines with the same rules as the website (src/domain/pricing.ts, ported from
 * apps/catalog/pricing.py) so the cashier sees the right total at once; the server re-prices everything at
 * checkout and refuses if its total differs.
 */
import type { Product } from '../api/types';
import { centsToDecimal, milliToDecimal, parseMoney, parseQty, formatQty } from '../lib/money';
import {
  type LinePrice, type PricedProduct, type Tier, PricingError, lineTotal, priceByAmount, priceByQuantity, priceFixed,
  unitPriceFor,
} from './pricing';

export { PricingError };

export type EnteredAs = 'qty' | 'amount' | 'fixed';

export interface CartLine {
  key: string;
  /** null for an item typed in at the till that isn't in the system yet. */
  productId: number | null;
  name: string;
  unit: string;
  enteredAs: EnteredAs;
  qtyMilli: number;
  unitPriceCents: number;
  totalCents: number;
  tierApplied: boolean;
}

export class CartError extends Error {}

let counter = 0;
const nextKey = () => `l${Date.now().toString(36)}${(counter++).toString(36)}`;

export function pricedProduct(p: Product): PricedProduct {
  return { name: p.name, soldBy: p.sold_by, sellingPriceCents: parseMoney(p.selling_price) ?? 0 };
}

export function tiersOf(p: Product): Tier[] {
  return p.tiers.map((t) => ({ minQtyMilli: parseQty(t.min_qty) ?? 0, unitPriceCents: parseMoney(t.unit_price) ?? 0 }));
}

const isLoose = (p: Product) => p.sold_by !== 'piece';

/** How much of this product the cart already holds. */
export function qtyInCart(lines: CartLine[], productId: number, exceptKey?: string) {
  return lines.filter((l) => l.productId === productId && l.key !== exceptKey).reduce((s, l) => s + l.qtyMilli, 0);
}

/** Refuse when the cart would hold more than is in stock (items added at the till are never refused). */
export function checkStock(lines: CartLine[], p: Product, addingMilli: number, exceptKey?: string) {
  if (p.added_at_till) return;
  const wanted = qtyInCart(lines, p.id, exceptKey) + addingMilli;
  const onHand = parseQty(p.stock_qty) ?? 0;
  if (wanted > onHand) {
    throw new CartError(
      `Not enough stock: only ${formatQty(Math.max(onHand, 0))} ${p.unit} of ${p.name} in stock, ` +
      `so you can't sell ${formatQty(wanted)} ${p.unit}.`);
  }
}

function toLine(p: Product, enteredAs: EnteredAs, priced: LinePrice, key = nextKey()): CartLine {
  return {
    key, productId: p.id, name: p.name, unit: p.unit, enteredAs, qtyMilli: priced.qtyMilli,
    unitPriceCents: priced.unitPriceCents, totalCents: priced.totalCents, tierApplied: priced.tierApplied,
  };
}

export type AddInput = { qtyMilli?: number; amountCents?: number; fixedQtyMilli?: number; fixedTotalCents?: number };

/** Add by quantity, by amount or with a fixed-price button. Repeat scans of a piece product merge into one line. */
export function addProduct(lines: CartLine[], p: Product, input: AddInput = {}): CartLine[] {
  if (!p.active) throw new CartError(`${p.name} is marked inactive.`);
  const product = pricedProduct(p);
  const tiers = tiersOf(p);
  let priced: LinePrice;
  let enteredAs: EnteredAs;
  try {
    if (input.fixedTotalCents !== undefined) {
      priced = priceFixed(product, input.fixedQtyMilli ?? 0, input.fixedTotalCents);
      enteredAs = 'fixed';
    } else if (input.amountCents !== undefined) {
      priced = priceByAmount(product, input.amountCents, tiers);
      enteredAs = 'amount';
    } else {
      priced = priceByQuantity(product, input.qtyMilli ?? 1000, tiers);
      enteredAs = 'qty';
    }
  } catch (e) {
    if (e instanceof PricingError) throw new CartError(e.message);
    throw e;
  }
  checkStock(lines, p, priced.qtyMilli);
  if (enteredAs === 'qty' && !isLoose(p)) {
    const existing = lines.find((l) => l.productId === p.id && l.enteredAs === 'qty');
    if (existing) {
      return lines.map((l) => (l === existing ? reprice(l, p, l.qtyMilli + priced.qtyMilli) : l));
    }
  }
  return [...lines, toLine(p, enteredAs, priced)];
}

/** Sell something not in the system yet: '1 phone charger at 300'. The owner checks it on the website later. */
export function addUnlisted(lines: CartLine[], name: string, priceCents: number, qty: number): CartLine[] {
  const clean = name.split(/\s+/).filter(Boolean).join(' ').slice(0, 120);
  if (!clean) throw new CartError("Type the item's name.");
  if (!(priceCents > 0)) throw new CartError('Type the price for one.');
  if (!(qty > 0) || !Number.isInteger(qty)) throw new CartError('The quantity must be a whole number, like 1 or 3.');
  return [...lines, {
    key: nextKey(), productId: null, name: clean, unit: 'pcs', enteredAs: 'fixed', qtyMilli: qty * 1000,
    unitPriceCents: priceCents, totalCents: priceCents * qty, tierApplied: false,
  }];
}

function reprice(line: CartLine, p: Product, qtyMilli: number): CartLine {
  const product = pricedProduct(p);
  const { unitPriceCents, tierApplied } = unitPriceFor(product, qtyMilli, tiersOf(p));
  return { ...line, qtyMilli, enteredAs: 'qty', unitPriceCents, tierApplied, totalCents: lineTotal(product, qtyMilli, unitPriceCents) };
}

/** Lowering or removing a line needs the owner's PIN (the screen asks before calling this). */
export const needsApproval = (line: CartLine, newQtyMilli: number) => newQtyMilli < line.qtyMilli;

export function setQuantity(lines: CartLine[], key: string, newQtyMilli: number, p: Product | undefined): CartLine[] {
  const line = lines.find((l) => l.key === key);
  if (!line) return lines;
  if (newQtyMilli < 0) throw new CartError("Quantity can't be negative.");
  if (newQtyMilli === 0) return lines.filter((l) => l.key !== key);
  if (!p) {
    // An unlisted item: keep its price for one.
    if (newQtyMilli % 1000) throw new CartError('The quantity must be a whole number.');
    return lines.map((l) => (l.key === key ? { ...l, qtyMilli: newQtyMilli, totalCents: l.unitPriceCents * (newQtyMilli / 1000) } : l));
  }
  if (!isLoose(p) && newQtyMilli % 1000) {
    throw new CartError(`${p.name} is sold by the piece, so the quantity must be a whole number.`);
  }
  if (newQtyMilli > line.qtyMilli) checkStock(lines, p, newQtyMilli, key);
  return lines.map((l) => (l.key === key ? reprice(l, p, newQtyMilli) : l));
}

export const cartTotal = (lines: CartLine[]) => lines.reduce((s, l) => s + l.totalCents, 0);

/** What the checkout and hold endpoints expect. */
export function toApiLines(lines: CartLine[]) {
  return lines.map((l) => {
    if (l.productId === null) {
      return { name: l.name, price: centsToDecimal(l.unitPriceCents), quantity: String(l.qtyMilli / 1000) };
    }
    if (l.enteredAs === 'amount') return { product_id: l.productId, amount: centsToDecimal(l.totalCents) };
    if (l.enteredAs === 'fixed') {
      return { product_id: l.productId, quantity: milliToDecimal(l.qtyMilli), fixed_total: centsToDecimal(l.totalCents) };
    }
    return { product_id: l.productId, quantity: milliToDecimal(l.qtyMilli) };
  });
}

/** Lines of a held sale coming back from the server. */
export function fromHeld(
  held: { product_id: number; quantity: string; entered_as: EnteredAs; amount: string | null; fixed_total: string | null }[],
  products: Map<number, Product>,
): CartLine[] {
  let lines: CartLine[] = [];
  for (const h of held) {
    const p = products.get(h.product_id);
    if (!p) continue;
    const qty = parseQty(h.quantity) ?? 0;
    const product = pricedProduct(p);
    const tiers = tiersOf(p);
    const priced = h.entered_as === 'amount' ? priceByAmount(product, parseMoney(h.amount) ?? 0, tiers)
      : h.entered_as === 'fixed' ? priceFixed(product, qty, parseMoney(h.fixed_total) ?? 0)
        : priceByQuantity(product, qty, tiers);
    lines = [...lines, toLine(p, h.entered_as, priced)];
  }
  return lines;
}
