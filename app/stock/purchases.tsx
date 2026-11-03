import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { get } from '@/api/client';
import type { PurchaseSummary } from '@/api/types';
import { Banner, Button, ChipRow, Empty, ListItem, useColors } from '@/components/ui';
import { money } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { can, useSession } from '@/store/session';

/** Past deliveries, with what is still owed to each supplier. */
export default function Purchases() {
  const c = useColors();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const [filter, setFilter] = useState('');
  const { data, error, loading, reload } = useApi(() => get<{ purchases: PurchaseSummary[] }>('purchases/', { unpaid: filter }), [filter]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return (
    <FlatList
      data={data?.purchases ?? []}
      keyExtractor={(p) => String(p.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      ListHeaderComponent={
        <View style={{ padding: 12, gap: 10 }}>
          <ChipRow value={filter} onChange={setFilter} options={[{ value: '', label: 'All' }, { value: '1', label: 'Still owed' }]} />
          <Banner text={error} />
          {can(user, 'receive_stock') ? <Button title="Receive stock" kind="secondary" icon="add" onPress={() => router.push('/stock/receive')} /> : null}
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Empty text="No purchases." />}
      renderItem={({ item: p }) => (
        <ListItem title={`${p.code} · ${p.supplier ?? 'No supplier'}`}
          subtitle={`${p.date}${p.supplier_reference ? ` · ${p.supplier_reference}` : ''} · ${p.line_count ?? 0} item${p.line_count === 1 ? '' : 's'} · ${p.payment_status}`}
          right={money(p.total)} rightSub={!p.cancelled && Number(p.balance) > 0 ? `owe ${money(p.balance)}` : undefined}
          tone={p.cancelled ? c.muted : undefined} onPress={() => router.push(`/stock/purchase/${p.id}`)} />
      )}
    />
  );
}
