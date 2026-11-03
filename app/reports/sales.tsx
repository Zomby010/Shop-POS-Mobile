import { useState } from 'react';

import { get } from '@/api/client';
import type { SalesReport } from '@/api/types';
import { ReportList } from '@/components/Report';
import { Card, KeyValue } from '@/components/ui';
import { day, money } from '@/lib/format';
import { type Range, rangeKey, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';

/** Sales by day: how each day's sales were paid, and the deni given and repaid. */
export default function SalesByDay() {
  const [range, setRange] = useState<Range>({ kind: 'period', period: 'this_week' });
  const { data, error, loading, reload } = useApi(() => get<SalesReport>('reports/sales/', rangeQuery(range)), [rangeKey(range)]);
  const t = data?.total;
  return (
    <ReportList report="sales" title="Sales by day" range={range} onRange={setRange} loading={loading} error={error} reload={reload}
      empty="No days in this period."
      header={t ? (
        <Card>
          <KeyValue label={`${t.count} sales`} value={money(t.total)} />
          <KeyValue label="Cash" value={money(t.cash)} />
          <KeyValue label="M-Pesa" value={money(t.mpesa)} />
          <KeyValue label="Deni given" value={money(t.credit)} />
          <KeyValue label="Refunds" value={`− ${money(t.refunds)}`} />
          <KeyValue label="Net" value={money(t.net)} strong />
          <KeyValue label="Deni repaid (cash + M-Pesa)" value={`${money(t.repaid_cash)} + ${money(t.repaid_mpesa)}`} />
        </Card>
      ) : undefined}
      rows={(data?.rows ?? []).map((d) => ({
        key: d.day, title: day(d.day), subtitle: `${d.count} sale${d.count === 1 ? '' : 's'}${d.voided ? ` · ${d.voided} voided` : ''} · deni ${money(d.credit)} given, ${money(d.deni_repaid)} repaid`,
        right: money(d.net),
        details: [['Sales', String(d.count)], ['Total', money(d.total)], ['Cash', money(d.cash)], ['M-Pesa', money(d.mpesa)],
          ['Deni given', money(d.credit)], ['Refunds', money(d.refunds)], ['Net', money(d.net)], ['Voided', String(d.voided)],
          ['Deni repaid in cash', money(d.repaid_cash)], ['Deni repaid by M-Pesa', money(d.repaid_mpesa)]],
      }))} />
  );
}
