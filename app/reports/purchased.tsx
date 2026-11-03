import { useState } from 'react';

import { get } from '@/api/client';
import type { PurchasedReport } from '@/api/types';
import { ReportList } from '@/components/Report';
import { Card, KeyValue } from '@/components/ui';
import { money, qty } from '@/lib/format';
import { type Range, rangeKey, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';

/** What was bought from suppliers in the period, cancelled purchases left out. */
export default function Purchased() {
  const [range, setRange] = useState<Range>({ kind: 'period', period: 'this_month' });
  const { data, error, loading, reload } = useApi(() => get<PurchasedReport>('reports/purchased/', rangeQuery(range)), [rangeKey(range)]);
  return (
    <ReportList report="purchased" title="Purchased items" range={range} onRange={setRange} loading={loading} error={error}
      reload={reload} empty="Nothing bought in this period."
      header={data ? <Card><KeyValue label="Bought in total" value={money(data.total)} strong /></Card> : undefined}
      rows={(data?.rows ?? []).map((r) => ({
        key: String(r.product_id), title: r.product, subtitle: `${qty(r.quantity, r.unit)} at ${money(r.unit_cost)} · ${r.suppliers || 'No supplier'}`,
        right: money(r.cost),
        details: [['Quantity bought', qty(r.quantity, r.unit)], ['Total cost', money(r.cost)], ['Average unit cost', money(r.unit_cost)],
          ['Purchases', String(r.purchases)], ['Suppliers', r.suppliers || 'None']],
      }))} />
  );
}
