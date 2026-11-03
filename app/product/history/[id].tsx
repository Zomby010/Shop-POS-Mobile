import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { get } from '@/api/client';
import type { Choice, Dec, Movement } from '@/api/types';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Banner, Card, ChipRow, Empty, KeyValue, ListItem, Loading, Muted, Screen, T } from '@/components/ui';
import { dateTime, money, qty } from '@/lib/format';
import { type Range, parseRange, rangeKey, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';

interface History {
  product: { id: number; name: string; unit: string; stock_qty: Dec };
  kinds: Choice[];
  movements: Movement[];
  price_changes: { changed_at: string; user: string | null; reason: string; old_price: Dec; new_price: Dec; old_cost?: Dec; new_cost?: Dec }[];
}

/** Every stock movement of one product with before and after figures, plus its price changes. */
export default function ProductHistory() {
  const { id, range: param } = useLocalSearchParams<{ id: string; range?: string }>();
  const [kind, setKind] = useState('');
  const [range, setRange] = useState<Range>(parseRange(param, { kind: 'all' }));
  const [tab, setTab] = useState<'stock' | 'prices'>('stock');
  const { data, error, loading } = useApi(() => get<History>(`products/${id}/history/`, { kind, ...rangeQuery(range) }), [id, kind, rangeKey(range)]);
  if (loading && !data) return <Loading />;
  if (!data) return <Screen><Banner text={error} /></Screen>;
  return (
    <Screen>
      <Card>
        <T size={18} weight="700">{data.product.name}</T>
        <KeyValue label="In stock now" value={qty(data.product.stock_qty, data.product.unit)} strong />
      </Card>
      <ChipRow value={tab} onChange={setTab} options={[{ value: 'stock', label: 'Stock changes' }, { value: 'prices', label: 'Price changes' }]} />
      {tab === 'stock' ? (
        <>
          <PeriodPicker value={range} onChange={setRange} allowAll />
          <ChipRow value={kind} onChange={setKind} options={[{ value: '', label: 'All types' }, ...data.kinds]} />
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {data.movements.length ? data.movements.map((m) => (
              <ListItem key={m.id} title={`${m.kind_label}${m.reference ? ` · ${m.reference}` : ''}`}
                subtitle={`${dateTime(m.created_at)}${m.user ? ` · ${m.user}` : ''}${m.reason ? ` · ${m.reason}` : ''}`}
                right={`${m.quantity.startsWith('-') ? '' : '+'}${qty(m.quantity)}`}
                rightSub={m.stock_before !== null && m.stock_after !== null ? `${qty(m.stock_before)} → ${qty(m.stock_after)}` : undefined} />
            )) : <Empty text="No stock changes." />}
          </Card>
        </>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {data.price_changes.length ? data.price_changes.map((p, i) => (
            <View key={i}>
              <ListItem title={`Price ${money(p.old_price)} → ${money(p.new_price)}`}
                subtitle={`${dateTime(p.changed_at)}${p.user ? ` · ${p.user}` : ''} · ${p.reason}`}
                right={p.new_cost !== undefined ? money(p.new_cost) : undefined}
                rightSub={p.old_cost !== undefined ? `cost was ${money(p.old_cost)}` : undefined} />
            </View>
          )) : <Empty text="No price changes." />}
          <View style={{ padding: 12 }}><Muted size={12}>Newest first.</Muted></View>
        </Card>
      )}
    </Screen>
  );
}
