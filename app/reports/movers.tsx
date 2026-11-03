import { useState } from 'react';

import { get } from '@/api/client';
import type { MoversReport } from '@/api/types';
import { ReportList } from '@/components/Report';
import { ChipRow, Field, useColors } from '@/components/ui';
import { money, qty } from '@/lib/format';
import { type Range, rangeKey, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';

const SPEEDS = [{ value: '', label: 'All' }, { value: 'fast', label: 'Fast' }, { value: 'slow', label: 'Slow' },
  { value: 'none', label: 'Not selling' }];
const LABEL = { fast: 'Fast', slow: 'Slow', none: 'Not selling' } as const;

/** Fast and slow movers, the average sold per day, and how long the stock will last. */
export default function Movers() {
  const c = useColors();
  const [range, setRange] = useState<Range>({ kind: 'period', period: 'this_month' });
  const [speed, setSpeed] = useState('');
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useApi(() => get<MoversReport>('reports/movers/', { ...rangeQuery(range), speed, q }),
    [rangeKey(range), speed]);
  return (
    <ReportList report="movers" title="Fast and slow movers" range={range} onRange={setRange} extra={{ speed, q }} loading={loading}
      error={error} reload={reload} empty="No products match."
      header={<>
        <Field value={q} onChangeText={setQ} placeholder="Search a product" returnKeyType="search" onSubmitEditing={reload} />
        <ChipRow options={SPEEDS} value={speed} onChange={setSpeed} />
      </>}
      rows={(data?.rows ?? []).map((r) => ({
        key: String(r.product_id), title: r.product,
        subtitle: `${LABEL[r.speed]} · ${qty(r.per_day, r.unit)} a day · ${qty(r.stock_qty, r.unit)} in stock`,
        right: r.days_left !== null ? `${r.days_left} days` : '·', rightSub: r.days_left !== null ? 'of stock left' : undefined,
        tone: r.days_left !== null && Number(r.days_left) < 7 ? c.warning : undefined,
        details: [['Speed', LABEL[r.speed]], ['Total sold', qty(r.quantity, r.unit)], ['Average per day', qty(r.per_day, r.unit)],
          ['Sales', money(r.revenue)], ['Margin', money(r.profit)], ['In stock', qty(r.stock_qty, r.unit)],
          ['Days of stock left', r.days_left !== null ? String(r.days_left) : 'Not selling']],
      }))} />
  );
}
