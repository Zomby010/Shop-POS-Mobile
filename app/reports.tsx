import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { get } from '@/api/client';
import type { Summary } from '@/api/types';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Banner, Button, Card, KeyValue, Loading, Muted, T, useColors } from '@/components/ui';
import { day, money } from '@/lib/format';
import { type Range, rangeKey, rangeParam, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';

/** The website's Summary report: sales, how customers paid, money collected, deni, profit and suppliers. */
export default function Reports() {
  const c = useColors();
  const router = useRouter();
  const [range, setRange] = useState<Range>({ kind: 'period', period: 'today' });
  const { data: s, error, loading, reload } = useApi(() => get<Summary>('reports/summary/', rangeQuery(range)), [rangeKey(range)]);
  const go = (pathname: '/deni' | '/stock/stock-loss') => router.push({ pathname, params: { range: rangeParam(range) } });
  const tone = (v: string) => (Number(v) < 0 ? c.danger : undefined);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <PeriodPicker value={range} onChange={setRange} />
      <Banner text={error} />
      {loading && !s ? <Loading /> : null}
      {s ? (
        <>
          <Muted>{day(s.start)}{s.start !== s.end ? ` to ${day(s.end)}` : ''}</Muted>
          <Card>
            <Muted>Net sales</Muted>
            <T size={28} weight="700">{money(s.net_sales)}</T>
            <KeyValue label="Sales" value={String(s.sales_count)} />
            <KeyValue label="Average sale" value={money(s.average_sale)} />
            <KeyValue label="Refunds" value={money(s.refunds)} />
            {s.voided_count ? <KeyValue label="Voided" value={String(s.voided_count)} /> : null}
          </Card>
          <Card>
            <T weight="600">How customers paid</T>
            <KeyValue label="Cash" value={money(s.paid_by.cash)} />
            <KeyValue label="M-Pesa" value={money(s.paid_by.mpesa)} />
            <KeyValue label="Deni" value={money(s.paid_by.credit)} />
          </Card>
          <Card>
            <T weight="600">Money collected</T>
            <KeyValue label="Cash" value={money(s.collected.cash)} />
            <KeyValue label="M-Pesa" value={money(s.collected.mpesa)} />
            <KeyValue label="Total" value={money(s.collected.total)} strong />
          </Card>
          <Card>
            <T weight="600">Deni</T>
            <KeyValue label="Given on deni" value={money(s.deni.given)} />
            <KeyValue label="Repaid in cash" value={money(s.deni.repaid_cash)} />
            <KeyValue label="Repaid by M-Pesa" value={money(s.deni.repaid_mpesa)} />
            <KeyValue label="Repaid in total" value={money(s.deni.repaid)} />
            <KeyValue label="Customers owe now (all time)" value={money(s.deni.owed_now)} strong color={Number(s.deni.owed_now) > 0 ? c.danger : undefined} />
            <Button title="Who was given and who repaid" kind="ghost" small onPress={() => go('/deni')} />
          </Card>
          <Card>
            <T weight="600">Profit</T>
            <KeyValue label="Cost of goods" value={money(s.profit.cost_of_sales)} />
            <KeyValue label={`Gross profit (${s.profit.margin_pct}%)`} value={money(s.profit.gross_profit)} />
            <KeyValue label="Expenses" value={money(s.profit.expenses)} />
            <KeyValue label="Stock loss" value={money(s.profit.stock_loss)} />
            <Button title="What changed in stock" kind="ghost" small onPress={() => go('/stock/stock-loss')} />
            <KeyValue label="Net profit" value={money(s.profit.net_profit)} strong color={tone(s.profit.net_profit)} />
          </Card>
          <Card>
            <T weight="600">Suppliers</T>
            <KeyValue label="Bought" value={money(s.suppliers.bought)} />
            <KeyValue label="Paid" value={money(s.suppliers.paid)} />
            <KeyValue label="Owed to suppliers" value={money(s.suppliers.owed)} strong />
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}
