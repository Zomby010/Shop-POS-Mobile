import { useState } from 'react';

import { get } from '@/api/client';
import type { StockValueReport } from '@/api/types';
import { ReportList } from '@/components/Report';
import { Card, KeyValue, Muted } from '@/components/ui';
import { money } from '@/lib/format';
import type { Range } from '@/lib/period';
import { useApi } from '@/lib/useApi';

/** What the stock on the shelves is worth today, at cost and at selling price. */
export default function StockValue() {
  const [range, setRange] = useState<Range>({ kind: 'all' });
  const { data, error, loading, reload } = useApi(() => get<StockValueReport>('reports/stock-value/'));
  const t = data?.total;
  return (
    <ReportList report="stock-value" title="Stock value" range={range} onRange={setRange} noPeriod loading={loading} error={error}
      reload={reload} empty="No products yet."
      header={t ? (
        <Card>
          <KeyValue label="At cost" value={money(t.at_cost)} strong />
          <KeyValue label="At selling price" value={money(t.at_price)} />
          <KeyValue label="Potential profit" value={money(t.potential_profit)} />
          <Muted size={12}>Today's stock, so this report has no period.</Muted>
        </Card>
      ) : undefined}
      rows={(data?.rows ?? []).map((r) => ({
        key: r.category, title: r.category, subtitle: `${r.products} product${r.products === 1 ? '' : 's'}`,
        right: money(r.at_cost), rightSub: `sells for ${money(r.at_price)}`,
        details: [['Products', String(r.products)], ['At cost', money(r.at_cost)], ['At selling price', money(r.at_price)],
          ['Potential profit', money(r.potential_profit)]],
      }))} />
  );
}
