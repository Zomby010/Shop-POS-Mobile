import { describe, expect, it } from 'vitest';

import { fromIsoDay, isoDay, parseRange, rangeParam, rangeQuery } from '@/lib/period';

describe('report periods', () => {
  it('formats local days without shifting them', () => {
    expect(isoDay(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isoDay(fromIsoDay('2026-11-30'))).toBe('2026-11-30');
  });

  it('builds the query for each kind of range', () => {
    expect(rangeQuery({ kind: 'period', period: 'today' })).toEqual({ period: 'today' });
    expect(rangeQuery({ kind: 'all' })).toEqual({});
    expect(rangeQuery({ kind: 'custom', start: '2026-11-03', end: '2026-11-01' })).toEqual({ start: '2026-11-01', end: '2026-11-03' });
  });

  it('passes a range to another screen and back', () => {
    const r = { kind: 'custom' as const, start: '2026-11-01', end: '2026-11-03' };
    expect(parseRange(rangeParam(r))).toEqual(r);
    expect(parseRange('nonsense')).toEqual({ kind: 'period', period: 'today' });
    expect(parseRange(undefined, { kind: 'all' })).toEqual({ kind: 'all' });
  });
});
