/** Splitting a total across cash, M-Pesa and deni. Mirrors plan_payment in apps/sales/services.py. */
import { type Cents, formatMoney } from '../lib/money';

export class SaleError extends Error {}

export interface PaymentPlan {
  cashCents: Cents;
  mpesaCents: Cents;
  creditCents: Cents;
  tenderedCents: Cents;
  changeCents: Cents;
}

/** Cash covers whatever M-Pesa and deni don't. `cashTenderedCents` null means exact cash. */
export function planPayment(
  totalCents: Cents,
  { cashTenderedCents = null, mpesaCents = 0, creditCents = 0 }: {
    cashTenderedCents?: Cents | null; mpesaCents?: Cents; creditCents?: Cents;
  } = {},
): PaymentPlan {
  if (mpesaCents < 0 || creditCents < 0) throw new SaleError("Amounts can't be negative.");
  if (mpesaCents + creditCents > totalCents) {
    throw new SaleError(`M-Pesa and deni add up to more than the total of ${formatMoney(totalCents)}.`);
  }
  const cashDue = totalCents - mpesaCents - creditCents;
  let tendered = cashTenderedCents ?? cashDue;
  if (tendered < cashDue) {
    throw new SaleError(`Cash given (${formatMoney(tendered)}) is less than the cash due (${formatMoney(cashDue)}).`);
  }
  if (cashDue === 0) tendered = 0;
  return { cashCents: cashDue, mpesaCents, creditCents, tenderedCents: tendered, changeCents: tendered - cashDue };
}
