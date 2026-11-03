import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { get } from '@/api/client';
import type { Choice, Movement, Product } from '@/api/types';
import { PeriodPicker } from '@/components/PeriodPicker';
import { ProductPicker } from '@/components/ProductPicker';
import { Banner, Button, ChipRow, Empty, ListItem, Row, T } from '@/components/ui';
import { dateTime, qty } from '@/lib/format';
import { type Range, rangeKey, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';

interface Page { kinds: Choice[]; movements: Movement[]; next_offset: number | null }

/** Every stock change, newest first, filtered by period, type or product. */
export default function Movements() {
  const [kind, setKind] = useState('');
  const [range, setRange] = useState<Range>({ kind: 'all' });
  const [product, setProduct] = useState<Product | null>(null);
  const [more, setMore] = useState<Movement[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const { data, error, loading, reload } = useApi(async () => {
    const r = await get<Page>('movements/', { kind, product: product?.id, ...rangeQuery(range) });
    setMore([]); setNext(r.next_offset);
    return r;
  }, [kind, product, rangeKey(range)]);
  const loadMore = async () => {
    if (next === null) return;
    const r = await get<Page>('movements/', { kind, product: product?.id, ...rangeQuery(range), offset: next });
    setMore((m) => [...m, ...r.movements]); setNext(r.next_offset);
  };
  return (
    <FlatList
      data={[...(data?.movements ?? []), ...more]}
      keyExtractor={(m) => String(m.id)}
      onEndReached={loadMore}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      ListHeaderComponent={
        <View style={{ padding: 12, gap: 10 }}>
          <PeriodPicker value={range} onChange={setRange} allowAll />
          <ChipRow value={kind} onChange={setKind} options={[{ value: '', label: 'All types' }, ...(data?.kinds ?? [])]} />
          {product ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <T weight="600">{product.name}</T>
              <Button title="All products" small kind="ghost" onPress={() => setProduct(null)} />
            </Row>
          ) : <ProductPicker target="movements" onPick={setProduct} placeholder="Only one product…" />}
          <Banner text={error} />
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Empty text="No stock changes." />}
      renderItem={({ item: m }) => (
        <ListItem title={`${m.product} · ${m.kind_label}`}
          subtitle={`${dateTime(m.created_at)}${m.user ? ` · ${m.user}` : ''}${m.reference ? ` · ${m.reference}` : ''}${m.reason ? ` · ${m.reason}` : ''}`}
          right={`${m.quantity.startsWith('-') ? '' : '+'}${qty(m.quantity, m.unit)}`}
          rightSub={m.stock_before !== null && m.stock_after !== null ? `${qty(m.stock_before)} → ${qty(m.stock_after)}` : undefined} />
      )}
    />
  );
}
