import { useState } from 'react';

import { get } from '@/api/client';
import type { ProfitReport } from '@/api/types';
import { ReportList } from '@/components/Report';
import { Card, KeyValue, T, useColors } from '@/components/ui';
import { day, isNegative, money } from '@/lib/format';
import { type Range, rangeKey, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';

/** Profit and loss: net sales less cost of goods, expenses and stock loss, day by day. */
export default function Profit() {
  const c = useColors();
  const [range, setRange] = useState<Range>({ kind: 'period', period: 'this_month' });
  const { data, error, loading, reload } = useApi(() => get<ProfitReport>('reports/profit/', rangeQuery(range)), [rangeKey(range)]);
  const t = data?.total;
  const neg = (v: string) => (isNegative(v) ? c.danger : undefined);
  return (
    <ReportList report="profit" title="Profit and loss" range={range} onRange={setRange} loading={loading} error={error} reload={reload}
      empty="No days in this period."
      header={t && data ? (
        <>
          <Card>
            <KeyValue label="Net sales" value={money(t.net_sales)} />
            <KeyValue label="Cost of goods sold" value={`− ${money(t.cost_of_sales)}`} />
            <KeyValue label={`Gross profit (${t.margin_pct}%)`} value={money(t.gross_profit)} />
            <KeyValue label="Expenses" value={`− ${money(t.expenses)}`} />
            <KeyValue label="Stock loss" value={`− ${money(t.stock_loss)}`} />
            <KeyValue label="Net profit" value={money(t.net_profit)} strong color={neg(t.net_profit)} />
          </Card>
          {data.expenses_by_category.length ? (
            <Card>
              <T weight="600">Expenses by category</T>
              {data.expenses_by_category.map((e) => <KeyValue key={e.category} label={e.category} value={money(e.amount)} />)}
            </Card>
          ) : null}
          {data.loss_by_kind.length ? (
            <Card>
              <T weight="600">Stock loss by kind</T>
              {data.loss_by_kind.map((l) => <KeyValue key={l.kind} label={l.kind} value={money(l.amount)} />)}
            </Card>
          ) : null}
        </>
      ) : undefined}
      rows={[...(data?.rows ?? [])].reverse().map((d) => ({
        key: d.day, title: day(d.day), subtitle: `Sales ${money(d.net_sales)} · gross ${money(d.gross_profit)}`,
        right: money(d.net_profit), tone: neg(d.net_profit),
        details: [['Sales', money(d.sales)], ['Refunds', money(d.refunds)], ['Net sales', money(d.net_sales)],
          ['Cost of goods', money(d.cost_of_sales)], ['Gross profit', money(d.gross_profit)], ['Expenses', money(d.expenses)],
          ['Stock loss', money(d.stock_loss)], ['Net profit', money(d.net_profit)]],
      }))} />
  );
}
