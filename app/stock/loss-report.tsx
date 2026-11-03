import { useState } from 'react';
import { get } from '@/api/client';
import type { LossRow } from '@/api/types';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Banner, Card, Empty, KeyValue, Loading, Muted, Screen, T, useColors } from '@/components/ui';
import { money, qty } from '@/lib/format';
import { type Range, rangeKey, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';

const pct = (v: string) => `${Number(v).toFixed(1)}%`;

/** Weighed and measured goods: what the stock takes expected against what was counted, plus recorded losses. */
export default function LossReport() {
  const c = useColors();
  const [range, setRange] = useState<Range>({ kind: 'all' });
  const { data, error, loading } = useApi(() => get<{ rows: LossRow[] }>('loss-report/', rangeQuery(range)), [rangeKey(range)]);
  return (
    <Screen>
      <Muted>From approved stock takes and recorded losses.</Muted>
      <PeriodPicker value={range} onChange={setRange} allowAll />
      <Banner text={error} />
      {loading && !data ? <Loading /> : null}
      {data && !data.rows.length ? <Empty text="Nothing to report yet." /> : null}
      {data?.rows.map((r) => (
        <Card key={r.product_id}>
          <T weight="700">{r.product}</T>
          <KeyValue label={`Expected (${r.stocktakes} stock take${r.stocktakes === 1 ? '' : 's'})`} value={qty(r.expected, r.unit)} />
          <KeyValue label="Counted" value={qty(r.counted, r.unit)} />
          <KeyValue label="Difference" value={`${qty(r.variance, r.unit)} (${pct(r.variance_pct)})`}
            color={r.variance.startsWith('-') ? c.danger : undefined} />
          <KeyValue label="Losses recorded" value={qty(r.recorded_losses, r.unit)} />
          <KeyValue label="Total lost" value={qty(r.total_loss, r.unit)} strong />
          <KeyValue label="Sold" value={`${qty(r.sold, r.unit)} · loss ${pct(r.loss_pct_of_sales)} of sales`} />
          {r.variance_value !== undefined ? <KeyValue label="Value of the difference" value={money(r.variance_value)} /> : null}
        </Card>
      ))}
    </Screen>
  );
}
