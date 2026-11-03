import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { get } from '@/api/client';
import type { StockOverview } from '@/api/types';
import { Banner, Card, ListItem, Muted, Screen, T } from '@/components/ui';
import { dateTime, money, qty } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { can, useSession } from '@/store/session';

/** The website's Stock page: every stock tool this user may use, an open stock take, and the latest changes. */
export default function Stock() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const { data, error, reload } = useApi(() => get<StockOverview>('stock/'));
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  const item = (show: boolean, title: string, subtitle: string, href: string) =>
    show ? <ListItem title={title} subtitle={subtitle} onPress={() => router.push(href as never)} /> : null;
  const take = data?.open_stocktake;

  return (
    <Screen>
      <Banner text={error} />
      {take ? (
        <Card>
          <T weight="600">{take.code} is in progress</T>
          <Muted>Started {dateTime(take.started_at)}. Keep counting, then the owner approves it.</Muted>
          <ListItem title="Continue counting" onPress={() => router.push(`/stock/take/${take.id}`)} />
        </Card>
      ) : null}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {item(can(user, 'receive_stock'), 'Receive stock', 'A delivery from a supplier', '/stock/receive')}
        {item(can(user, 'receive_stock', 'pay_supplier', 'cancel_purchase'), 'Purchases', 'Past deliveries, pay suppliers', '/stock/purchases')}
        {item(can(user, 'adjust_stock'), 'Recount', 'Count a few products and fix the stock', '/stock/recount')}
        {item(can(user, 'adjust_stock'), 'Convert', 'A sack into packets, a crate into bottles', '/stock/convert')}
        {item(can(user, 'stocktake', 'approve_stocktake'), 'Stock takes', 'Count everything, or one category', '/stock/takes')}
        {item(can(user, 'adjust_stock'), 'Loss and wastage', 'Spillage, expiry, damage', '/stock/loss')}
        {item(can(user, 'stock_history'), 'Low stock', data ? `${data.low_stock_count} to reorder` : 'What to reorder', '/stock/low')}
        {item(can(user, 'stock_history'), 'Movements', 'Every stock change, with filters', '/stock/movements')}
        {item(can(user, 'adjust_stock', 'stock_history'), 'Recount history', 'Every recount, what changed and why', '/stock/recounts')}
        {item(can(user, 'reports', 'loss_report'), 'Stock loss explained', 'Lost and found per product, with reasons', '/stock/stock-loss')}
        {item(can(user, 'loss_report'), 'Loose-goods loss report', 'Expected against counted kg and litres', '/stock/loss-report')}
      </Card>
      {data?.purchases.length && can(user, 'receive_stock', 'pay_supplier', 'cancel_purchase') ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ padding: 14, paddingBottom: 4 }}><T weight="600">Recent purchases</T></View>
          {data.purchases.slice(0, 5).map((p) => (
            <ListItem key={p.id} title={`${p.code} · ${p.supplier ?? 'No supplier'}`} subtitle={`${p.date} · ${p.payment_status}`}
              right={money(p.total)} onPress={() => router.push(`/stock/purchase/${p.id}`)} />
          ))}
        </Card>
      ) : null}
      {data?.movements.length && can(user, 'stock_history') ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ padding: 14, paddingBottom: 4 }}><T weight="600">Latest stock changes</T></View>
          {data.movements.slice(0, 10).map((m) => (
            <ListItem key={m.id} title={m.product} subtitle={`${dateTime(m.created_at)} · ${m.kind_label}`}
              right={`${m.quantity.startsWith('-') ? '' : '+'}${qty(m.quantity, m.unit)}`} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
