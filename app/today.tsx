import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView } from 'react-native';

import { get } from '@/api/client';
import type { Today } from '@/api/types';
import { Banner, Card, Empty, KeyValue, ListItem, Loading, Muted, T, useColors } from '@/components/ui';
import { isNegative, money, qty } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { can, useSession } from '@/store/session';

/** The website's dashboard: today's takings, deni given and repaid, low stock and held sales. */
export default function TodayScreen() {
  const c = useColors();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const stock = can(user, 'view_products', 'stock_history');
  const { data: d, error, loading, reload } = useApi(() => get<Today>('today/'));
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={loading && !!d} onRefresh={reload} />}>
      <Banner text={error} />
      {!d ? (loading ? <Loading /> : null) : (
        <>
          <Card>
            <Muted>{d.sales_scope === 'own' ? 'Your sales today' : 'Sales today'}</Muted>
            <T size={28} weight="700">{money(d.total)}</T>
            <Muted>{d.count} sale{d.count === 1 ? '' : 's'}</Muted>
            <KeyValue label="Cash" value={money(d.cash)} />
            <KeyValue label="M-Pesa" value={money(d.mpesa)} />
            <KeyValue label="Deni given" value={money(d.credit)} />
          </Card>
          {d.money ? (
            <Card>
              <T weight="600">Money today</T>
              <KeyValue label="Net sales" value={money(d.money.net_sales)} />
              <KeyValue label="Collected in cash" value={money(d.money.collected_cash)} />
              <KeyValue label="Collected by M-Pesa" value={money(d.money.collected_mpesa)} />
              <KeyValue label="Deni given" value={money(d.money.deni_given)} />
              <KeyValue label="Deni repaid" value={money(d.money.deni_repaid)} />
              <KeyValue label="Expenses" value={money(d.money.expenses)} />
              <KeyValue label="Net profit" value={money(d.money.net_profit)} strong
                color={isNegative(d.money.net_profit) ? c.danger : undefined} />
              <KeyValue label="Customers owe (all time)" value={money(d.money.customers_owe)} />
              <KeyValue label="Owed to suppliers" value={money(d.money.owed_to_suppliers)} />
            </Card>
          ) : null}
          {d.held_count ? (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <ListItem title={`${d.held_count} held sale${d.held_count === 1 ? '' : 's'}`} subtitle="Waiting to be finished"
                onPress={() => router.push('/held')} />
            </Card>
          ) : null}
          {stock ? <T weight="600">Low stock</T> : null}
          {stock ? <Card style={{ padding: 0, overflow: 'hidden' }}>
            {d.low_stock.length ? d.low_stock.map((p) => (
              <ListItem key={p.id} title={p.name} subtitle={p.category ?? undefined} right={qty(p.stock_qty, p.unit)}
                tone={isNegative(p.stock_qty) ? c.danger : undefined}
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(p.id) } })} />
            )) : <Empty text="Nothing is running low." />}
          </Card> : null}
        </>
      )}
    </ScrollView>
  );
}
