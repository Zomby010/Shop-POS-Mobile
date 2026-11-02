/** Line pricing for the sell screen. Mirrors apps/catalog/pricing.py. */
import {
  type Cents,
  type Milli,
  QTY_SCALE,
  divRound,
  formatQty,
  isWholeQty,
  mulQtyPrice,
  roundShilling,
} from '../lib/money';

export class PricingError extends Error {}

export interface PricedProduct {
  name: string;
  soldBy: 'piece' | 'weight' | 'volume';
  sellingPriceCents: Cents;
}

export interface Tier {
  minQtyMilli: Milli;
  unitPriceCents: Cents;
}

export interface LinePrice {
  qtyMilli: Milli;
  unitPriceCents: Cents;
  totalCents: Cents;
  tierApplied: boolean;
}

export const isLoose = (p: Pick<PricedProduct, 'soldBy'>) => p.soldBy !== 'piece';

export const UNIT_LABELS = { piece: 'pcs', weight: 'kg', volume: 'L' } as const;

/**
 * The best bulk tier the quantity reaches. `reaches(min)` says whether the line's quantity is at least
 * `min`; it lets price-by-amount compare an exact fraction without rounding it first, as the server does.
 */
function bestTier(product: PricedProduct, tiers: Tier[], reaches: (minQtyMilli: Milli) => boolean) {
  let best: Tier | null = null;
  for (const tier of tiers) {
    if (reaches(tier.minQtyMilli) && (best === null || tier.minQtyMilli > best.minQtyMilli)) best = tier;
  }
  return best ? { unitPriceCents: best.unitPriceCents, tierApplied: true } : { unitPriceCents: product.sellingPriceCents, tierApplied: false };
}

export function unitPriceFor(product: PricedProduct, qtyMilli: Milli, tiers: Tier[]) {
  return bestTier(product, tiers, (min) => qtyMilli >= min);
}

export function lineTotal(product: PricedProduct, qtyMilli: Milli, unitPriceCents: Cents): Cents {
  // Loose goods round the exact value to the whole shilling (not the cent-rounded value), like the server.
  if (isLoose(product)) return divRound(BigInt(qtyMilli) * BigInt(unitPriceCents), QTY_SCALE * 100) * 100;
  return mulQtyPrice(qtyMilli, unitPriceCents);
}

function checkWhole(product: PricedProduct, qtyMilli: Milli) {
  if (!isLoose(product) && !isWholeQty(qtyMilli)) {
    throw new PricingError(`${product.name} is sold by the piece, so the quantity must be a whole number`);
  }
}

export function priceByQuantity(product: PricedProduct, qtyMilli: Milli, tiers: Tier[] = []): LinePrice {
  if (qtyMilli <= 0) throw new PricingError('Quantity must be more than zero');
  checkWhole(product, qtyMilli);
  const { unitPriceCents, tierApplied } = unitPriceFor(product, qtyMilli, tiers);
  return { qtyMilli, unitPriceCents, totalCents: lineTotal(product, qtyMilli, unitPriceCents), tierApplied };
}

/** Customer asks for 'KSh 50 of oil': work out the quantity they get. */
export function priceByAmount(product: PricedProduct, amountCents: Cents, tiers: Tier[] = []): LinePrice {
  if (!isLoose(product)) throw new PricingError(`${product.name} is sold by the piece; enter a quantity instead`);
  const amount = roundShilling(amountCents);
  if (amount <= 0) throw new PricingError('Amount must be more than zero');
  if (product.sellingPriceCents <= 0) throw new PricingError(`${product.name} has no selling price`);
  // amount / selling_price >= min  <=>  amount * 1000 >= min * selling_price   (all integers)
  let { unitPriceCents, tierApplied } = bestTier(
    product, tiers, (min) => BigInt(amount) * BigInt(QTY_SCALE) >= BigInt(min) * BigInt(product.sellingPriceCents),
  );
  let qtyMilli = divRound(BigInt(amount) * BigInt(QTY_SCALE), unitPriceCents);
  // A tier price gives more quantity, which can only qualify for the same or a better tier.
  const better = unitPriceFor(product, qtyMilli, tiers);
  if (better.unitPriceCents !== unitPriceCents) {
    ({ unitPriceCents, tierApplied } = better);
    qtyMilli = divRound(BigInt(amount) * BigInt(QTY_SCALE), unitPriceCents);
  }
  if (qtyMilli <= 0) throw new PricingError('That amount is too small to sell');
  return { qtyMilli, unitPriceCents, totalCents: amount, tierApplied };
}

/** A fixed-price quick-sale button: '1/2 kg @ 70' sells 0.5 kg for KSh 70 exactly. */
export function priceFixed(product: PricedProduct, qtyMilli: Milli, totalCents: Cents): LinePrice {
  if (qtyMilli <= 0) throw new PricingError('Quantity must be more than zero');
  if (totalCents <= 0) throw new PricingError("The button's price must be more than zero");
  checkWhole(product, qtyMilli);
  return { qtyMilli, unitPriceCents: divRound(BigInt(totalCents) * BigInt(QTY_SCALE), qtyMilli), totalCents, tierApplied: false };
}

export function describeQty(product: Pick<PricedProduct, 'soldBy'>, qtyMilli: Milli): string {
  return `${formatQty(qtyMilli)} ${UNIT_LABELS[product.soldBy]}`;
}
