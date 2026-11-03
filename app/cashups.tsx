import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { get } from '@/api/client';
import type { CashUp } from '@/api/types';
import { diffTone } from '@/components/TakingsCard';
import { Banner, Empty, ListItem, useColors } from '@/components/ui';
import { dateTime, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';

interface Page { cashups: CashUp[]; next_offset: number | null }

/** Every cash-up, newest first: the owner sees everyone's, a cashier their own. */
export default function CashUps() {
  const c = useColors();
  const router = useRouter();
  const [more, setMore] = useState<CashUp[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const { data, error, loading, reload } = useApi(async () => {
    const r = await get<Page>('cashups/');
    setMore([]); setNext(r.next_offset);
    return r;
  });
  const loadMore = async () => {
    if (next === null) return;
    const r = await get<Page>('cashups/', { offset: next });
    setMore((m) => [...m, ...r.cashups]); setNext(r.next_offset);
  };
  return (
    <FlatList
      data={[...(data?.cashups ?? []), ...more]}
      keyExtractor={(r) => String(r.id)}
      onEndReached={loadMore}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      ListHeaderComponent={error ? <Banner text={error} /> : undefined}
      ListEmptyComponent={loading ? undefined : <Empty text="No cash-ups yet." />}
      renderItem={({ item: r }) => (
        <ListItem title={`${r.cashier} · ${dateTime(r.period_end)}`}
          subtitle={`Cash ${money(r.counted_cash)} of ${money(r.expected_cash)} · M-Pesa ${money(r.counted_mpesa)} of ${money(r.expected_mpesa)}`}
          right={money(r.cash_difference)} rightSub={Number(r.mpesa_difference) ? `M-Pesa ${money(r.mpesa_difference)}` : undefined}
          tone={diffTone(r.cash_difference, c)}
          onPress={() => router.push({ pathname: '/cashup-record/[id]', params: { id: String(r.id) } })} />
      )}
    />
  );
}
