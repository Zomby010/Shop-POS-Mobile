import { useState } from 'react';

import { get } from '@/api/client';
import type { StockMovementReport } from '@/api/types';
import { ReportList } from '@/components/Report';
import { Card, Field, KeyValue, Muted } from '@/components/ui';
import { money, qty } from '@/lib/format';
import { type Range, rangeKey, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';

const signed = (v: string, unit: string) => (Number(v) ? `${v.startsWith('-') ? '' : '+'}${qty(v, unit)}` : '·');

/** Where each product's stock went: opening, plus the movements, equals closing. */
export default function StockMovement() {
  const [range, setRange] = useState<Range>({ kind: 'period', period: 'this_month' });
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useApi(() => get<StockMovementReport>('reports/stock-movement/', { ...rangeQuery(range), q }),
    [rangeKey(range)]);
  return (
    <ReportList report="stock-movement" title="Stock movement" range={range} onRange={setRange} extra={{ q }} loading={loading}
      error={error} reload={reload} empty="No products match."
      header={<>
        <Field value={q} onChangeText={setQ} placeholder="Search name or barcode" returnKeyType="search" onSubmitEditing={reload} />
        {data ? (
          <Card>
            <KeyValue label="Closing stock at cost" value={money(data.total_value)} strong />
            <Muted size={12}>Opening is everything before the start date. Tap a product for each kind of movement.</Muted>
          </Card>
        ) : null}
      </>}
      rows={(data?.rows ?? []).map((r) => ({
        key: String(r.product_id), title: r.product,
        subtitle: `Opening ${qty(r.opening, r.unit)} · sold ${qty(r.values.sold?.replace('-', '') ?? '0', r.unit)}`,
        right: qty(r.closing, r.unit), rightSub: money(r.value),
        details: [['Opening', qty(r.opening, r.unit)],
          ...(data?.columns ?? []).map((col) => [col.label, signed(r.values[col.key] ?? '0', r.unit)] as [string, string]),
          ['Closing', qty(r.closing, r.unit)], ['Unit cost', money(r.unit_cost)], ['Value', money(r.value)]],
      }))} />
  );
}
