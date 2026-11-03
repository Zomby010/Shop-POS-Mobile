import { useState } from 'react';

import { get } from '@/api/client';
import type { SoldReport } from '@/api/types';
import { ReportList } from '@/components/Report';
import { Card, ChipRow, KeyValue, useColors } from '@/components/ui';
import { isNegative, money, qty } from '@/lib/format';
import { type Range, rangeKey, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/store/catalog';

const SORTS = [{ value: 'revenue', label: 'Top sales' }, { value: 'profit', label: 'Top margin' },
  { value: 'margin', label: 'Margin %' }, { value: 'name', label: 'A to Z' }];

/** Sold items: what sold and at what margin. The margins add up to gross profit. */
export default function Sold() {
  const c = useColors();
  const [range, setRange] = useState<Range>({ kind: 'period', period: 'this_month' });
  const [sort, setSort] = useState('revenue');
  const [category, setCategory] = useState('');
  const categories = useCatalog((s) => s.catalog?.categories ?? []);
  const { data, error, loading, reload } = useApi(() => get<SoldReport>('reports/sold/', { ...rangeQuery(range), sort, category }),
    [rangeKey(range), sort, category]);
  return (
    <ReportList report="sold" title="Sold items" range={range} onRange={setRange} extra={{ sort, category }} loading={loading}
      error={error} reload={reload} empty="Nothing sold in this period."
      header={<>
        <ChipRow options={SORTS} value={sort} onChange={setSort} />
        {categories.length ? <ChipRow options={[{ value: '', label: 'All categories' }, ...categories.map((x) => ({ value: String(x.id), label: x.name }))]}
          value={category} onChange={setCategory} /> : null}
        {data ? (
          <Card>
            <KeyValue label="Sales" value={money(data.totals.revenue)} />
            <KeyValue label="Cost" value={money(data.totals.cost)} />
            <KeyValue label="Margin" value={money(data.totals.profit)} strong />
          </Card>
        ) : null}
      </>}
      rows={(data?.rows ?? []).map((r) => ({
        key: String(r.product_id), title: r.product, subtitle: `${qty(r.quantity, r.unit)} sold · margin ${money(r.profit)} (${r.margin_pct}%)`,
        right: money(r.revenue), tone: isNegative(r.profit) ? c.danger : undefined,
        details: [['Category', r.category ?? 'None'], ['Quantity sold', qty(r.quantity, r.unit)], ['Cost', money(r.cost)],
          ['Sales', money(r.revenue)], ['Margin', money(r.profit)], ['Margin %', `${r.margin_pct}%`]],
      }))} />
  );
}
