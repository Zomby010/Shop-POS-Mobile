import { ksh, parseMoney, parseQty, formatQty } from './money';

/** 'KSh 1,250.00' from a decimal string sent by the server. */
export const money = (dec: string | null | undefined) => ksh(parseMoney(dec ?? '0') ?? 0);

/** '0.25 kg', '3 pcs' from a decimal string. */
export const qty = (dec: string | null | undefined, unit = '') => `${formatQty(parseQty(dec ?? '0') ?? 0)}${unit ? ` ${unit}` : ''}`;

export const isNegative = (dec: string | null | undefined) => (parseMoney(dec ?? '0') ?? 0) < 0;

export function dateTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function day(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const PERIODS = [
  { value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' }, { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' }, { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
] as const;
export type Period = (typeof PERIODS)[number]['value'];

export const METHOD_LABELS: Record<string, string> = { cash: 'Cash', mpesa: 'M-Pesa', credit: 'Deni', bank: 'Bank' };
