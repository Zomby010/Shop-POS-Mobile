import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { get } from '@/api/client';
import type { StockLoss, StockLossRow } from '@/api/types';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Banner, Button, Card, Empty, Field, KeyValue, ListItem, Muted, Sheet, T, useColors } from '@/components/ui';
import { dateTime, isNegative, money, qty } from '@/lib/format';
import { type Range, parseRange, rangeKey, rangeParam, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';
import { can, useSession } from '@/store/session';

const signed = (v: string, unit: string) => `${v.startsWith('-') ? '' : '+'}${qty(v, unit)}`;

/** The Stock loss figure explained: per product, what was lost and what counts found, with every reason. */
export default function StockLossScreen() {
  const c = useColors();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const params = useLocalSearchParams<{ range?: string }>();
  const [range, setRange] = useState<Range>(parseRange(params.range));
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<StockLossRow | null>(null);
  const { data, error, loading, reload } = useApi(() => get<StockLoss>('reports/stock-loss/', { ...rangeQuery(range), q }), [rangeKey(range)]);
  const tone = (v?: string) => (v && !isNegative(v) && Number(v) > 0 ? c.danger : undefined);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data?.rows ?? []}
        keyExtractor={(r) => String(r.product_id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={
          <View style={{ padding: 12, gap: 10 }}>
            <PeriodPicker value={range} onChange={setRange} />
            <Banner text={error} />
            {data?.stock_loss !== undefined ? (
              <Card>
                <KeyValue label="Lost (wastage and shortages)" value={money(data.lost_value)} />
                <KeyValue label="Found (counts higher than the books)" value={money(data.found_value)} />
                <KeyValue label="Stock loss" value={money(data.stock_loss)} strong color={tone(data.stock_loss)} />
                <Muted size={12}>
                  Stock loss is what was lost less what counts found, at cost. It is the same figure as in Money and reports.
                  {isNegative(data.stock_loss) ? ' It is below zero because counts found more stock than was lost, which adds to profit.' : ''}
                </Muted>
              </Card>
            ) : null}
            <Field value={q} onChangeText={setQ} placeholder="Search a product" returnKeyType="search" onSubmitEditing={reload} autoCorrect={false} />
          </View>
        }
        ListEmptyComponent={loading ? undefined : <Empty text="No losses, recounts or stock-take changes in this period." />}
        renderItem={({ item: r }) => (
          <ListItem title={r.product}
            subtitle={[Number(r.lost_qty) ? `lost ${qty(r.lost_qty, r.unit)}` : '', Number(r.found_qty) ? `found ${qty(r.found_qty, r.unit)}` : '',
              `${r.movements.length} change${r.movements.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
            right={r.stock_loss !== undefined ? money(r.stock_loss) : signed(`${-Number(r.net_qty)}`, r.unit)}
            tone={tone(r.stock_loss)} onPress={() => setOpen(r)} />
        )}
      />
      <Sheet visible={!!open} title={open?.product ?? ''} onClose={() => setOpen(null)}>
        {open ? (
          <>
            {open.movements.map((m) => (
              <View key={m.id} style={{ borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 8, gap: 2 }}>
                <KeyValue label={`${m.kind_label} · ${dateTime(m.created_at)}`} value={signed(m.quantity, m.unit)} />
                <T>{m.reason || 'No reason given'}</T>
                <Muted size={12}>{[m.reference, m.user, m.value !== undefined ? money(m.value) : ''].filter(Boolean).join(' · ')}</Muted>
              </View>
            ))}
            {can(user, 'stock_history') ? (
              <Button title="Full stock history" kind="secondary" small onPress={() => {
                const id = open.product_id; setOpen(null);
                router.push({ pathname: '/product/history/[id]', params: { id: String(id), range: rangeParam(range) } });
              }} />
            ) : null}
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
