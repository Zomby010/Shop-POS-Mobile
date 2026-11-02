/**
 * Money and quantities as integers, never floats. Mirrors apps/core/money.py.
 *
 *   cents: KSh 12.50  -> 1250      (server: Decimal with 2 places)
 *   milli: 0.250 kg   -> 250       (server: Decimal with 3 places)
 *
 * Rounding is half-up (away from zero for .5), like ROUND_HALF_UP on the server.
 */

export type Cents = number;
export type Milli = number;

export const ZERO = 0;
export const QTY_SCALE = 1000;
export const MONEY_SCALE = 100;

/** a / b rounded half-up, exact for any safe integers (uses BigInt underneath). */
export function divRound(a: number | bigint, b: number | bigint): number {
  const n = BigInt(a);
  const d = BigInt(b);
  if (d === 0n) throw new RangeError('Division by zero');
  const negative = n < 0n !== d < 0n;
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const q = (an * 2n + ad) / (ad * 2n);
  const result = negative ? -q : q;
  return toSafe(result);
}

function toSafe(v: bigint): number {
  if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError('Number too large');
  }
  return Number(v);
}

/** Parse '1,250.5' / '0.25' into an integer at `places` decimals, half-up. Returns null when unreadable. */
export function parseScaled(input: string | number | null | undefined, places: number): number | null {
  if (input === null || input === undefined) return null;
  const text = String(input).trim().replace(/,/g, '');
  const m = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(text);
  if (!m || (m[2] === '' && (m[3] ?? '') === '')) return null;
  const sign = m[1] === '-' ? -1n : 1n;
  const whole = BigInt(m[2] || '0');
  const frac = m[3] ?? '';
  const scale = 10n ** BigInt(places);
  const kept = BigInt((frac.slice(0, places) || '0').padEnd(places, '0'));
  let value = whole * scale + kept;
  // Half-up on the first dropped digit.
  if (frac.length > places && Number(frac[places]) >= 5) value += 1n;
  return toSafe(sign * value);
}

export const parseMoney = (input: string | number | null | undefined) => parseScaled(input, 2);
export const parseQty = (input: string | number | null | undefined) => parseScaled(input, 3);

/** Line value: quantity (milli) x price per unit (cents) -> cents, rounded half-up (q2). */
export function mulQtyPrice(qtyMilli: Milli, unitPriceCents: Cents): Cents {
  return divRound(BigInt(qtyMilli) * BigInt(unitPriceCents), QTY_SCALE);
}

/** Nearest whole shilling, used for loose-goods line totals. 5375 -> 5400. */
export function roundShilling(cents: Cents): Cents {
  return divRound(cents, MONEY_SCALE) * MONEY_SCALE;
}

export function isWholeQty(qtyMilli: Milli): boolean {
  return qtyMilli % QTY_SCALE === 0;
}

function formatScaled(value: number, places: number, grouping: boolean): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const scale = 10 ** places;
  const whole = Math.floor(abs / scale);
  const frac = String(abs % scale).padStart(places, '0');
  const wholeText = grouping ? whole.toLocaleString('en-US') : String(whole);
  return `${negative ? '-' : ''}${wholeText}${places ? `.${frac}` : ''}`;
}

/** 125000 -> 'KSh 1,250.00' (same as ksh() on the server). */
export function ksh(cents: Cents): string {
  return `KSh ${formatScaled(cents, 2, true)}`;
}

/** 1250 -> '1,250.00' */
export function formatMoney(cents: Cents): string {
  return formatScaled(cents, 2, true);
}

/** 250 -> '0.25', 3000 -> '3', 167 -> '0.167' (like Decimal.normalize()). */
export function formatQty(milli: Milli): string {
  return formatScaled(milli, 3, false).replace(/\.?0+$/, '');
}

/** Decimal strings for the sync API, so the server reads exact Decimals: 1250 -> '12.50'. */
export const centsToDecimal = (cents: Cents) => formatScaled(cents, 2, false);
export const milliToDecimal = (milli: Milli) => formatScaled(milli, 3, false);
