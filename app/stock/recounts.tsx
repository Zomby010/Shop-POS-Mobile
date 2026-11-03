import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { get } from '@/api/client';
import type { RecountRecord } from '@/api/types';
import { Banner, Card, Empty, KeyValue, Muted, T, useColors } from '@/components/ui';
import { dateTime, qty } from '@/lib/format';
import { ksh, mulQtyPrice, parseMoney, parseQty } from '@/lib/money';
import { useApi } from '@/lib/useApi';

interface Page { recounts: RecountRecord[]; next_offset: number | null }

/** Every recount: who counted, when, and each product it changed with the reason. */
export default function Recounts() {
  const c = useColors();
  const [more, setMore] = useState<RecountRecord[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const { data, error, loading, reload } = useApi(async () => {
    const r = await get<Page>('recounts/history/');
    setMore([]); setNext(r.next_offset);
    return r;
  });
  const loadMore = async () => {
    if (next === null) return;
    const r = await get<Page>('recounts/history/', { offset: next });
    setMore((m) => [...m, ...r.recounts]); setNext(r.next_offset);
  };
  return (
    <FlatList
      data={[...(data?.recounts ?? []), ...more]}
      keyExtractor={(r) => String(r.id)}
      onEndReached={loadMore}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      contentContainerStyle={{ padding: 12, gap: 10 }}
      ListHeaderComponent={<Banner text={error} />}
      ListEmptyComponent={loading ? undefined : <Empty text="No recounts yet." />}
      renderItem={({ item: r }) => (
        <Card>
          <T weight="700">{r.code} · {r.kind_label}</T>
          <Muted>{dateTime(r.created_at)}{r.user ? ` by ${r.user}` : ''}{r.note ? ` · ${r.note}` : ''}</Muted>
          {r.movements.length ? r.movements.map((m) => (
            <View key={m.id} style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 6, gap: 2 }}>
              <KeyValue label={m.product} value={`${m.quantity.startsWith('-') ? '' : '+'}${qty(m.quantity, m.unit)}`}
                color={m.quantity.startsWith('-') ? c.danger : undefined} />
              <Muted size={12}>
                {m.reason}{m.stock_before !== null && m.stock_after !== null ? ` · ${qty(m.stock_before)} → ${qty(m.stock_after)}` : ''}
                {m.unit_cost !== undefined ? ` · ${ksh(mulQtyPrice(parseQty(m.quantity) ?? 0, parseMoney(m.unit_cost) ?? 0))}` : ''}
              </Muted>
            </View>
          )) : <Muted>Every count matched, so nothing changed.</Muted>}
        </Card>
      )}
    />
  );
}
