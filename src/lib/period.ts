/** The report period every money and stock screen shares: a named period, a custom date range, or all time. */
export type Range =
  | { kind: 'period'; period: string }
  | { kind: 'custom'; start: string; end: string }
  | { kind: 'all' };

export const REPORT_PERIODS = [
  { value: 'today', label: 'Today' }, { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' }, { value: 'last_month', label: 'Last month' },
] as const;

/** 'YYYY-MM-DD' for a local date, the form the website expects. */
export function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A local Date from 'YYYY-MM-DD' (not UTC, so the day never shifts). */
export function fromIsoDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** The query string for a range. A custom range whose dates are the wrong way round is swapped, as the website does. */
export function rangeQuery(r: Range): Record<string, string> {
  if (r.kind === 'period') return { period: r.period };
  if (r.kind === 'all') return {};
  return r.start <= r.end ? { start: r.start, end: r.end } : { start: r.end, end: r.start };
}

export const rangeKey = (r: Range) => JSON.stringify(rangeQuery(r)) + r.kind;

/** A range passed to another screen as a route param, so a tap keeps the same period. */
export const rangeParam = (r: Range) => JSON.stringify(r);

export function parseRange(param: string | string[] | undefined, fallback: Range = { kind: 'period', period: 'today' }): Range {
  if (typeof param !== 'string') return fallback;
  try {
    const r = JSON.parse(param) as Range;
    return r && (r.kind === 'period' || r.kind === 'custom' || r.kind === 'all') ? r : fallback;
  } catch {
    return fallback;
  }
}
